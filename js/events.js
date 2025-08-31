import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, getDocs, addDoc, query, where, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const eventsGrid = document.getElementById('events-grid');
let currentUser = null;
let userProfile = null; // To store user data from Firestore
let userRegistrations = [];

// =======================================================
// ==      1. MAIN AUTHENTICATION LISTENER              ==
// =======================================================
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
        // If a user is logged in, fetch their Firestore profile and registrations
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        userProfile = userSnap.exists() ? userSnap.data() : null;
        
        await fetchUserRegistrations(user.uid);
    } else {
        // If no user, clear the data
        userProfile = null;
        userRegistrations = [];
    }
    // Now, display events based on the user's state.
    fetchAndDisplayEvents();
});

// =======================================================
// ==      2. HELPER FUNCTIONS                          ==
// =======================================================

const fetchUserRegistrations = async (userId) => {
    try {
        const regQuery = query(collection(db, "registrations"), where("userId", "==", userId));
        const regSnap = await getDocs(regQuery);
        // Store the IDs of events the user is registered for
        userRegistrations = regSnap.docs.map(doc => doc.data().eventId);
    } catch (error) {
        console.error("Error fetching user registrations:", error);
    }
};

const sendConfirmationEmail = async (user, eventId, eventData) => {
    console.log("Asking our server to send the confirmation email for event:", eventData.name);
    try {
        // This function now securely calls YOUR backend server
       const response = await fetch('http://localhost:3000/api/send-email', { // Make sure this endpoint exists in your server.js
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: user.email,
                displayName: user.displayName || 'Student',
                eventId: eventId,
                userId: user.uid,
                eventName: eventData.name,
                eventDate: new Date(eventData.date.seconds * 1000).toLocaleDateString(),
                eventLocation: eventData.location
            })
        });

        if (!response.ok) {
            throw new Error("Server responded with an error.");
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
        // CORRECTED LOGIC: Check the user's role from their Firestore profile
        if (currentUser && userProfile && userProfile.role === 'student' && userProfile.university) {
            console.log(`Filtering events for university: ${userProfile.university}`);
            eventsQuery = query(collection(db, "events"), where("university", "==", userProfile.university));
        } else {
            // If organizer, not logged in, or student without a university, show all events
            console.log("Showing all events.");
            eventsQuery = query(collection(db, "events"));
        }

        const eventsSnap = await getDocs(eventsQuery);

        if (eventsSnap.empty) {
            eventsGrid.innerHTML = '<p class="text-center col-span-full">No events found. Check back soon!</p>';
            return;
        }

        // PERFORMANCE FIX: Build an array of HTML strings first
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
        });

        // Set innerHTML only ONCE for better performance
        eventsGrid.innerHTML = eventCardsHTML.join('');

    } catch (error) {
        console.error("Error fetching events:", error);
        eventsGrid.innerHTML = '<p class="text-center col-span-full text-red-500">Could not load events. Please try again later.</p>';
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
        console.log("User not logged in. Redirecting to login page.");
        window.location.href = 'login.html';
        return;
    }

    registerButton.disabled = true;
    registerButton.textContent = 'Registering...';

    try {
        await addDoc(collection(db, "registrations"), {
            userId: currentUser.uid,
            eventId: eventId,
            timestamp: new Date()
        });

        userRegistrations.push(eventId);
        
        registerButton.textContent = 'Registered ✓';
        registerButton.classList.remove('bg-indigo-600');
        registerButton.classList.add('bg-green-600');
        
        console.log("Registration successful! A confirmation email is being sent.");
        
        const eventRef = doc(db, "events", eventId);
        const eventSnap = await getDoc(eventRef);
        if (eventSnap.exists()) {
            sendConfirmationEmail(currentUser, eventId, eventSnap.data());
        }

    } catch (error) {
        console.error("Error during registration:", error);
        registerButton.disabled = false;
        registerButton.textContent = 'Register Now';
    }
})