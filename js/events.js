import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, getDocs, addDoc, query, where, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const eventsGrid = document.getElementById('events-grid');
let currentUser = null;
let userProfile = null;
let userRegistrations = [];

// =======================================================
// ==      1. AUTHENTICATION & PROFILE FETCHER          ==
// =======================================================
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        userProfile = userSnap.exists() ? userSnap.data() : null;
        await fetchUserRegistrations(user.uid);
    } else {
        userProfile = null;
        userRegistrations = [];
    }
    fetchAndDisplayEvents();
});

// =======================================================
// ==      2. HELPER FUNCTIONS                          ==
// =======================================================

const fetchUserRegistrations = async (userId) => {
    try {
        const regQuery = query(collection(db, "registrations"), where("userId", "==", userId));
        const regSnap = await getDocs(regQuery);
        userRegistrations = regSnap.docs.map(doc => doc.data().eventId);
    } catch (error) {
        console.error("Error fetching user registrations:", error);
    }
};

const sendConfirmationEmail = async (user, eventData) => {
    // The URL MUST be a relative path to avoid mixed-content errors on the live site.
    const functionUrl = '/.netlify/functions/send-email';

    try {
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: user.email,
                eventName: eventData.name,
                eventDate: new Date(eventData.date.seconds * 1000).toLocaleDateString(),
                eventLocation: eventData.location
            })
        });

        if (!response.ok) {
            throw new Error('Server responded with an error.');
        }
        
        console.log("Request to send email was successful.");

    } catch (error) {
        console.error("Error requesting email from server:", error);
    }
};

// =======================================================
// ==      3. MAIN FUNCTION TO DISPLAY EVENTS           ==
// =======================================================
const fetchAndDisplayEvents = async () => {
    if (!eventsGrid) return;
    eventsGrid.innerHTML = '<p class="text-center col-span-full">Loading events...</p>';

    try {
        let eventsQuery;
        if (currentUser && userProfile && userProfile.role === 'student' && userProfile.university) {
            eventsQuery = query(collection(db, "events"), where("university", "==", userProfile.university));
        } else {
            eventsQuery = query(collection(db, "events"));
        }

        const eventsSnap = await getDocs(eventsQuery);

        if (eventsSnap.empty) {
            eventsGrid.innerHTML = '<p class="text-center col-span-full">No events found. Check back soon!</p>';
            return;
        }

        const eventCardsHTML = eventsSnap.docs.map(doc => {
            const event = doc.data();
            const eventId = doc.id;
            const isRegistered = userRegistrations.includes(eventId);

            return `
                <div class="card-hover bg-card-light dark:bg-card-dark rounded-3xl p-6 shadow-lg flex flex-col">
                    <h3 class="text-2xl font-bold mb-2">${event.name}</h3>
                    <p class="text-indigo-500 dark:text-indigo-400 font-semibold mb-3">${event.category}</p>
                    <p class="text-gray-600 dark:text-gray-300 mb-4 flex-grow">${event.description.substring(0, 100)}...</p>
                    <div class="text-sm text-gray-500 mb-4">
                        <p><i class="fa-solid fa-calendar-day w-5"></i> ${new Date(event.date.seconds * 1000).toLocaleDateString()}</p>
                        <p><i class="fa-solid fa-location-dot w-5"></i> ${event.location}</p>
                    </div>
                    <button 
                        class="register-btn w-full p-3 rounded-xl text-lg font-bold ${isRegistered ? 'bg-green-600' : 'bg-indigo-600'} text-white" 
                        data-event-id="${eventId}"
                        ${isRegistered ? 'disabled' : ''}
                    >
                        ${isRegistered ? 'Registered ✓' : 'Register Now'}
                    </button>
                </div>
            `;
        }).join('');

        eventsGrid.innerHTML = eventCardsHTML;

    } catch (error) {
        console.error("Error fetching events:", error);
        eventsGrid.innerHTML = '<p class="text-center col-span-full text-red-500">Could not load events.</p>';
    }
};

// =======================================================
// ==      4. REGISTRATION EVENT LISTENER               ==
// =======================================================
eventsGrid.addEventListener('click', async (e) => {
    if (!e.target.classList.contains('register-btn')) return;

    const registerButton = e.target;
    const eventId = registerButton.dataset.eventId;

    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    registerButton.disabled = true;
    registerButton.textContent = 'Registering...';

    try {
        // Step 1: Save the registration to Firestore
        await addDoc(collection(db, "registrations"), {
            userId: currentUser.uid,
            eventId: eventId,
            timestamp: new Date()
        });

        // Step 2: After a successful registration, get the event data...
        const eventRef = doc(db, "events", eventId);
        const eventSnap = await getDoc(eventRef);
        
        // Step 3: ...and then call the email function with that data.
        if (eventSnap.exists()) {
            sendConfirmationEmail(currentUser, eventSnap.data());
        }

        // Update the button UI on success
        registerButton.textContent = 'Registered ✓';
        registerButton.classList.remove('bg-indigo-600');
        registerButton.classList.add('bg-green-600');
        
    } catch (error) {
        console.error("Error during registration:", error);
        registerButton.disabled = false;
        registerButton.textContent = 'Register Now';
    }
});