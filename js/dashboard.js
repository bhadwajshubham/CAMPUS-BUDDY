import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, collection, query, where, getDocs, Timestamp, writeBatch, deleteDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const initDashboard = async (user) => {
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) { console.error("User data not found in Firestore!"); return; }
    const userData = userDoc.data();
    const userRole = userData.role;

    document.querySelectorAll('.dashboard-view').forEach(view => view.style.display = 'none');

    switch (userRole) {
        case 'student': renderStudentDashboard(user, userData); break;
        case 'organizer': renderOrganizerDashboard(user, userData); break;
        // FIX: The role is 'spoc', not 'admin'. I've corrected this to match your system.
        case 'spoc': renderSpocDashboard(user, userData); break; 
        case 'superAdmin': renderSuperAdminDashboard(user, userData); break;
        default: console.error("Unknown user role:", userRole);
    }
    
    document.querySelectorAll('.logout-btn').forEach(btn => {
        btn.addEventListener('click', () => { signOut(auth).then(() => { window.location.href = 'index.html'; }); });
    });
};

const renderStudentDashboard = (user, userData) => {
    const view = document.getElementById('student-view');
    view.style.display = 'block';
    view.querySelector('#student-welcome-header').textContent = `Welcome, ${userData.fullName.split(' ')[0]}!`;
    
    fetchStudentEvents(user.uid);

    handleTabSwitching(view);
    handleModal(view, user);
};

// In js/dashboard.js, find and replace this one function

const renderOrganizerDashboard = (user, userData) => {
    const view = document.getElementById('organizer-view');
    view.style.display = 'block';
    view.querySelector('#organizer-welcome-header').textContent = `${userData.fullName}'s Panel`;

    const myEventsTab = view.querySelector('[data-target="organizer-events"]');
    const myEventsPanel = document.getElementById('organizer-events');
    if (myEventsTab && myEventsPanel) {
        myEventsTab.classList.add('active');
        myEventsPanel.style.display = 'block';
    }

    // Call all the functions that add features to the organizer panel
    fetchOrganizerEvents(user.uid);
    handleTabSwitching(view);
    handleAttendeeModal(view);
    handleAttendanceModal(view);
    handleOrganizerDelete(view);
    handleOrganizerShare(view); // The all-important function call is here
};


// FIX: Renamed from renderAdminDashboard to renderSpocDashboard for clarity.
const renderSpocDashboard = (user, userData) => {
    // This function can be built out for the SPOC role later if needed.
    // For now, it might be empty or show a simple welcome message.
    const view = document.getElementById('spoc-view'); // Assuming you have a 'spoc-view' div
    if(view) {
        view.style.display = 'block';
        // Add SPOC-specific logic here, e.g., inviting Organizers.
    }
};

const renderSuperAdminDashboard = (user, userData) => {
    const view = document.getElementById('superAdmin-view');
    view.style.display = 'block';

    // FIX: Calling the NEW functions specifically made for the Super Admin panel.
    fetchSuperAdminUsers();
    fetchSuperAdminEvents();
    
    // FIX: Pointing the delete handler to the correct table within the superAdmin-view.
    handleEventDelete(view, 'superAdmin-events-list');

    // These functions were correct and are kept as is.
    populateUniversitiesDropdown();
    handleSuperAdminActions();
};

const populateUniversitiesDropdown = async () => {
    const selectElement = document.getElementById('university-select');
    if (!selectElement) return;
    
    try {
        const uniSnap = await getDocs(collection(db, "universities"));
        selectElement.innerHTML = '<option disabled selected>Select a University</option>'; // Clear and add placeholder
        uniSnap.forEach(doc => {
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = doc.data().name;
            selectElement.appendChild(option);
        });
    } catch (error) {
        console.error("Error populating universities:", error);
    }
};

const handleSuperAdminActions = () => {
    const addUniForm = document.getElementById('add-university-form');
    const appointSpocForm = document.getElementById('appoint-spoc-form');

    if (addUniForm) {
        addUniForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const uniNameInput = document.getElementById('uni-name');
            const uniName = uniNameInput.value.trim();
            if (!uniName) {
                alert("Please enter a university name.");
                return;
            }
            try {
                await addDoc(collection(db, "universities"), { name: uniName });
                alert(`University "${uniName}" added successfully.`);
                addUniForm.reset();
                populateUniversitiesDropdown(); // Refresh the dropdown
            } catch (error) {
                console.error("Error adding university:", error);
                alert("Failed to add university.");
            }
        });
    }

    if (appointSpocForm) {
        appointSpocForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('spoc-email');
            const email = emailInput.value.trim();
            const universitySelect = document.getElementById('university-select');
            const universityId = universitySelect.value;
            const universityName = universitySelect.selectedOptions[0].text;
            
            if (!email || !universityId || universitySelect.selectedIndex === 0) {
                 alert("Please enter a valid email and select a university.");
                 return;
            }

            try {
                await addDoc(collection(db, "invitations"), {
                    email: email,
                    role: 'spoc',
                    universityId: universityId,
                    universityName: universityName,
                    invitedAt: Timestamp.now()
                });
                await sendInvitationEmail(email, 'SPOC', universityName);
                alert(`Invitation sent to ${email} to be a SPOC for ${universityName}.`);
                appointSpocForm.reset();
            } catch (error) {
                console.error("Error appointing SPOC:", error);
                alert("Failed to appoint SPOC.");
            }
        });
    }
};

// In js/dashboard.js, replace the existing fetchStudentEvents function

const fetchStudentEvents = async (userId) => {
    const upcomingList = document.getElementById('student-upcoming-list');
    const pastList = document.getElementById('student-past-list');
    upcomingList.innerHTML = ''; // Clear lists to prevent duplicates
    pastList.innerHTML = '';

    try {
        const registrationsQuery = query(collection(db, "registrations"), where("userId", "==", userId));
        const registrationSnap = await getDocs(registrationsQuery);
        const eventIds = registrationSnap.docs.map(doc => doc.data().eventId);

        if (eventIds.length === 0) {
            upcomingList.innerHTML = `<div class="text-center py-12"><p class="text-gray-500">You haven't registered for any events yet.</p></div>`;
            return;
        }

        const eventsQuery = query(collection(db, "events"), where("__name__", "in", eventIds));
        const eventsSnap = await getDocs(eventsQuery);

        const today = new Date();
        today.setHours(0, 0, 0, 0); 

        let upcomingHTML = '';
        let pastHTML = '';

        eventsSnap.forEach(doc => {
            const event = doc.data();
            if (!event || !event.name) return; // Failsafe for broken data
            
            const eventDate = event.date.toDate();
            const cardHTML = `
                <div class="flex flex-col md:flex-row items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-slate-800 space-y-4 md:space-y-0">
                    <div>
                        <p class="font-bold text-lg">${event.name}</p>
                        <p class="text-sm text-gray-500">${eventDate.toLocaleDateString()} • ${event.location}</p>
                    </div>
                    <button class="view-ticket-btn w-full md:w-auto bg-indigo-600 text-white px-5 py-2 rounded-lg font-semibold" data-event-id="${doc.id}" data-event-name="${event.name}">
                        <i class="fa-solid fa-qrcode mr-2"></i>View QR Ticket
                    </button>
                </div>`;
            
            const pastCardHTML = `
                 <div class="flex flex-col md:flex-row items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-slate-800 space-y-4 md:space-y-0">
                    <div>
                        <p class="font-bold text-lg">${event.name}</p>
                        <p class="text-sm text-gray-500">${eventDate.toLocaleDateString()} • ${event.location}</p>
                    </div>
                    <button class="bg-purple-600 text-white px-5 py-2 rounded-lg font-semibold cursor-not-allowed w-full md:w-auto">
                        <i class="fa-solid fa-certificate mr-2"></i>View Certificate
                    </button>
                </div>`;

            if (eventDate >= today) {
                upcomingHTML += cardHTML;
            } else {
                pastHTML += pastCardHTML;
            }
        });
        
        if (upcomingHTML) upcomingList.innerHTML = upcomingHTML;
        else upcomingList.innerHTML = `<div class="text-center py-12"><p class="text-gray-500">You have no upcoming events.</p></div>`;
        
        if (pastHTML) pastList.innerHTML = pastHTML;
        else pastList.innerHTML = `<div class="text-center py-12"><p class="text-gray-500">You have no past events.</p></div>`;

    } catch (error) {
        console.error("Error fetching student events:", error);
    }
};//In js/dashboard.js, replace the function again with this one

const fetchOrganizerEvents = async (userId) => {
    const listContainer = document.getElementById('organizer-event-list');
    if (!listContainer) {
        console.error("Error: Could not find the 'organizer-event-list' element in your HTML.");
        return;
    }
    
    listContainer.innerHTML = '<p>Loading your events...</p>';
    console.log("Fetching events for organizer ID:", userId); 

    try {
        const eventsQuery = query(collection(db, "events"), where("organizerId", "==", userId));
        const eventsSnap = await getDocs(eventsQuery);

        console.log("Firestore query returned", eventsSnap.size, "events.");

        if (eventsSnap.empty) {
            listContainer.innerHTML = `<div class="text-center py-12"><p class="text-gray-500">You have not created any events yet.</p></div>`;
            return;
        }
        
        listContainer.innerHTML = ''; 
        eventsSnap.forEach(doc => {
            const event = doc.data();

            // --- NEW DEBUG LINE ---
            // This will show us the exact data for the event it found.
            console.log("Processing event data:", event); 
            
            const cardHTML = `
<div class="flex flex-col md:flex-row items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-slate-800">
    <p class="font-bold text-lg">${event.name}</p>
    <div class="flex items-center flex-wrap justify-end gap-2 mt-4 md:mt-0">
        <a href="edit-event.html?id=${doc.id}" class="bg-gray-500 text-white px-3 py-1 rounded-lg font-semibold text-sm">Edit</a>
        <button class="share-event-btn bg-cyan-500 text-white px-3 py-1 rounded-lg font-semibold text-sm" data-event-id="${doc.id}" data-event-name="${event.name}">Share</button>
        <button class="view-attendees-btn bg-blue-600 text-white px-3 py-1 rounded-lg font-semibold text-sm" data-event-id="${doc.id}" data-event-name="${event.name}">Registrations</button>
        <button class="view-attendance-btn bg-green-600 text-white px-3 py-1 rounded-lg font-semibold text-sm" data-event-id="${doc.id}" data-event-name="${event.name}">Attendance</button>
        <button class="delete-event-btn bg-red-500 text-white px-3 py-1 rounded-lg font-semibold text-sm" data-event-id="${doc.id}">Delete</button>
    </div>
</div>`;
            listContainer.innerHTML += cardHTML;
        });
    } catch (error) {
        console.error("Error fetching organizer events:", error);
        listContainer.innerHTML = '<p class="text-red-500">Could not load events.</p>';
    }
};
// FIX: New function specifically for the super admin user table
const fetchSuperAdminUsers = async () => {
    const userList = document.getElementById('superAdmin-users-list');
    if (!userList) return;
    userList.innerHTML = '';
    try {
        const usersSnap = await getDocs(collection(db, "users"));
        if (usersSnap.empty) {
            userList.innerHTML = '<tr><td colspan="3" class="text-center p-4 text-gray-500">No users found.</td></tr>';
            return;
        }
        usersSnap.forEach(doc => {
            const user = doc.data();
            const rowHTML = `<tr class="border-b dark:border-slate-700"><td class="p-3 font-semibold">${user.fullName}</td><td class="p-3">${user.email}</td><td class="p-3 capitalize">${user.role}</td></tr>`;
            userList.innerHTML += rowHTML;
        });
    } catch (error) { console.error("Error fetching all users for Super Admin:", error); }
};

// FIX: New function specifically for the super admin event table
const fetchSuperAdminEvents = async () => {
    const eventList = document.getElementById('superAdmin-events-list');
    if (!eventList) return;
    eventList.innerHTML = '';
    try {
        const eventsSnap = await getDocs(collection(db, "events"));
        if (eventsSnap.empty) {
            eventList.innerHTML = '<tr><td colspan="3" class="text-center p-4 text-gray-500">No events found.</td></tr>';
            return;
        }
        eventsSnap.forEach(doc => {
            const event = doc.data();
            const rowHTML = `<tr class="border-b dark:border-slate-700"><td class="p-3 font-semibold">${event.name}</td><td class="p-3 text-sm text-gray-500">${event.organizerId}</td><td class="p-3 text-right"><button class="delete-event-btn bg-red-500 text-white px-3 py-1 rounded-lg text-sm" data-event-id="${doc.id}">Delete</button></td></tr>`;
            eventList.innerHTML += rowHTML;
        });
    } catch (error) { console.error("Error fetching all events for Super Admin:", error); }
};


const handleTabSwitching = (view) => {
    const tabBtns = view.querySelectorAll('.tab-btn');
    const tabPanels = view.querySelectorAll('.tab-panel');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const targetPanelId = btn.dataset.target;
            tabPanels.forEach(p => p.style.display = p.id === targetPanelId ? 'block' : 'none');
        });
    });
};

const handleModal = (view, user) => {
    const modal = document.getElementById('qr-modal');
    if (!modal) return;
    const closeModalBtn = modal.querySelector('#close-modal');
    const qrCodeImg = modal.querySelector('img');
    const qrEventTitle = modal.querySelector('#qr-event-title');
    view.addEventListener('click', (e) => {
        const ticketButton = e.target.closest('.view-ticket-btn');
        if (ticketButton) {
            const eventId = ticketButton.dataset.eventId;
            const eventName = ticketButton.dataset.eventName;
            qrEventTitle.textContent = eventName;
            qrCodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UserID:${user.uid}-EventID:${eventId}`;
            modal.classList.add('open');
        }
    });
    const closeModal = () => modal.classList.remove('open');
    closeModalBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
};

const fetchAndDisplayAttendees = async (eventId) => {
    const listContainer = document.getElementById('attendee-list-container');
    listContainer.innerHTML = '<p class="text-gray-500">Loading registrants...</p>';
    try {
        const regQuery = query(collection(db, "registrations"), where("eventId", "==", eventId));
        const regSnap = await getDocs(regQuery);
        const userIds = regSnap.docs.map(doc => doc.data().userId);
        if (userIds.length === 0) { listContainer.innerHTML = '<p class="text-gray-500">No students have registered for this event yet.</p>'; return; }
        const usersQuery = query(collection(db, "users"), where("__name__", "in", userIds));
        const usersSnap = await getDocs(usersQuery);
        listContainer.innerHTML = ''; 
        usersSnap.forEach(userDoc => {
            const user = userDoc.data();
            const attendeeHTML = `<div class="flex justify-between items-center p-3 bg-gray-100 dark:bg-slate-800 rounded-lg"><p class="font-semibold">${user.fullName}</p><p class="text-sm text-gray-500">${user.email}</p></div>`;
            listContainer.innerHTML += attendeeHTML;
        });
    } catch (error) { console.error("Error fetching attendees:", error); listContainer.innerHTML = '<p class="text-red-500">Could not load registrants.</p>'; }
};

const handleAttendeeModal = (view) => {
    const modal = document.getElementById('attendee-modal');
    if (!modal) return;
    const closeModalBtn = modal.querySelector('#close-attendee-modal');
    const modalTitle = modal.querySelector('#attendee-modal-title');
    view.addEventListener('click', (e) => {
        const attendeesButton = e.target.closest('.view-attendees-btn');
        if (attendeesButton) {
            const eventId = attendeesButton.dataset.eventId;
            const eventName = attendeesButton.dataset.eventName;
            modalTitle.textContent = `Registrations for "${eventName}"`;
            fetchAndDisplayAttendees(eventId);
            modal.classList.add('open');
        }
    });
    const closeModal = () => modal.classList.remove('open');
    closeModalBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
};

const fetchAndDisplayAttendance = async (eventId) => {
    const listContainer = document.getElementById('attendance-list-container');
    listContainer.innerHTML = '<p class="text-gray-500">Loading attendance records...</p>';
    try {
        const attendanceQuery = query(collection(db, "attendance"), where("eventId", "==", eventId));
        const attendanceSnap = await getDocs(attendanceQuery);

        if (attendanceSnap.empty) {
            listContainer.innerHTML = '<p class="text-gray-500">No attendance has been recorded for this event yet.</p>';
            return;
        }

        const userIds = attendanceSnap.docs.map(doc => doc.data().userId);
        const usersQuery = query(collection(db, "users"), where("__name__", "in", userIds));
        const usersSnap = await getDocs(usersQuery);
        const usersData = Object.fromEntries(usersSnap.docs.map(doc => [doc.id, doc.data()]));

        listContainer.innerHTML = ''; 
        
        attendanceSnap.forEach(attendanceDoc => {
            const attendanceData = attendanceDoc.data();
            const user = usersData[attendanceData.userId];
            const checkInTime = attendanceData.timestamp.toDate();

            if (user) {
                const attendeeHTML = `
                    <div class="flex justify-between items-center p-3 bg-gray-100 dark:bg-slate-800 rounded-lg">
                        <div>
                            <p class="font-semibold">${user.fullName}</p>
                            <p class="text-sm text-gray-500">${user.email}</p>
                        </div>
                        <p class="text-sm text-gray-500">Checked in: ${checkInTime.toLocaleTimeString()}</p>
                    </div>`;
                listContainer.innerHTML += attendeeHTML;
            }
        });

    } catch (error) {
        console.error("Error fetching attendance:", error);
        listContainer.innerHTML = '<p class="text-red-500">Could not load attendance records.</p>';
    }
};

const handleAttendanceModal = (view) => {
    const modal = document.getElementById('attendance-modal');
    if (!modal) return;
    const closeModalBtn = modal.querySelector('#close-attendance-modal');
    const modalTitle = modal.querySelector('#attendance-modal-title');
    view.addEventListener('click', (e) => {
        const attendanceButton = e.target.closest('.view-attendance-btn');
        if (attendanceButton) {
            const eventId = attendanceButton.dataset.eventId;
            const eventName = attendanceButton.dataset.eventName;
            modalTitle.textContent = `Attendance for "${eventName}"`;
            fetchAndDisplayAttendance(eventId);
            modal.classList.add('open');
        }
    });
    const closeModal = () => modal.classList.remove('open');
    closeModalBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
};

// FIX: Renamed handleAdminDelete to be more generic for reuse.
const handleEventDelete = (view, listId) => {
    const eventList = view.querySelector(`#${listId}`);
    if (!eventList) return;
    eventList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-event-btn')) {
            const eventId = e.target.dataset.eventId;
            if (confirm(`Are you sure you want to permanently delete this event? This action cannot be undone.`)) {
                try {
                    const batch = writeBatch(db);
                    const regQuery = query(collection(db, "registrations"), where("eventId", "==", eventId));
                    const regSnap = await getDocs(regQuery);
                    regSnap.forEach(doc => { batch.delete(doc.ref); });
                    const eventRef = doc(db, "events", eventId);
                    batch.delete(eventRef);
                    await batch.commit();
                    alert("Event and all its registrations have been deleted.");
                    e.target.closest('tr').remove();
                } catch (error) { console.error("Error deleting event:", error); alert("Failed to delete the event."); }
            }
        }
    });
};

const handleOrganizerDelete = (view) => {
    const eventList = view.querySelector('#organizer-event-list');
    eventList.addEventListener('click', async (e) => {
        if (e.target.closest('.delete-event-btn')) {
            const eventId = e.target.closest('.delete-event-btn').dataset.eventId;
            if (confirm(`Are you sure you want to delete this event? This will also remove all registrations.`)) {
                try {
                    const batch = writeBatch(db);
                    const regQuery = query(collection(db, "registrations"), where("eventId", "==", eventId));
                    const regSnap = await getDocs(regQuery);
                    regSnap.forEach(doc => { batch.delete(doc.ref); });
                    const eventRef = doc(db, "events", eventId);
                    batch.delete(eventRef);
                    await batch.commit();
                    alert("Event and all its registrations have been deleted.");
                    e.target.closest('.flex').remove(); // This removes the card view
                } catch (error) {
                    console.error("Error deleting event:", error);
                    alert("Failed to delete the event.");
                }
            }
        }
    });
};

const sendInvitationEmail = async (email, role, universityName) => {
    // Make sure you have your Apps Script URL and a Secret Key
    const APPS_SCRIPT_URL = "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL"; 
    const SECRET_KEY = "YOUR_SECRET_KEY";

    // You need to replace this with your actual deployed website URL
    const liveSiteUrl = 'https://your-project-id.web.app'; 
    const signupLink = `${liveSiteUrl}/organizer-signup.html`; 
    
    const subject = `You're invited to CampusConnect Pro!`;
    const htmlBody = `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h1 style="color: #6366f1;">You've Been Invited!</h1>
            <p>Hello,</p>
            <p>You have been invited to join <strong>CampusConnect Pro</strong> as a <strong>${role}</strong> for <strong>${universityName}</strong>.</p>
            <p>Please click the button below to create your account and get started:</p>
            <a href="${signupLink}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">Create Your Account</a>
            <p style="margin-top: 20px;">If you have any questions, please contact your university administrator.</p>
            <p>Thank you!</p>
        </div>
    `;

    if (APPS_SCRIPT_URL === "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL" || SECRET_KEY === "YOUR_SECRET_KEY") {
        console.warn("Email not sent: APPS_SCRIPT_URL or SECRET_KEY is not set.");
        return; // Don't try to send if not configured
    }

    try {
        await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secretKey: SECRET_KEY, to: email, subject: subject, htmlBody: htmlBody })
        });
        console.log("Invitation email trigger request sent.");
    } catch (error) {
        console.error("Error sending invitation email:", error);
    }
};

onAuthStateChanged(auth, (user) => {
    if (user) { 
        initDashboard(user); 
    } else { 
        if(document.body.id === 'dashboard-page') {
             window.location.href = 'login.html'; 
        }
    }
});