import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, updateDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const editForm = document.getElementById('edit-event-form');
const urlParams = new URLSearchParams(window.location.search);
const eventId = urlParams.get('id');

if (!eventId) {
    alert("No event ID provided. Redirecting to dashboard.");
    window.location.href = 'dashboard.html';
}

// Function to populate the form with existing event data
const populateForm = async () => {
    try {
        const eventRef = doc(db, "events", eventId);
        const eventSnap = await getDoc(eventRef);

        if (eventSnap.exists()) {
            const event = eventSnap.data();
            
            const eventDate = event.date.toDate();
            const dateString = eventDate.toISOString().split('T')[0];
            const timeString = eventDate.toTimeString().split(' ')[0].substring(0, 5);

            document.getElementById('event-name').value = event.name || '';
            document.getElementById('event-image').value = event.imageUrl || ''; // NEW: Populate the image URL
            document.getElementById('event-date').value = dateString;
            document.getElementById('event-time').value = timeString;
            document.getElementById('event-location').value = event.location || '';
            document.getElementById('event-category').value = event.category || '';
            document.getElementById('event-description').value = event.description || '';
        } else {
            console.error("No such event found!");
            alert("Event not found.");
            window.location.href = 'dashboard.html';
        }
    } catch (error) {
        console.error("Error fetching event data:", error);
    }
};

onAuthStateChanged(auth, user => {
    if (user) {
        populateForm();

        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitButton = document.getElementById('update-event-btn');
            submitButton.disabled = true;
            submitButton.innerHTML = `<i class="fa-solid fa-spinner animate-spin mr-2"></i>Saving...`;

            // Get updated form values
            const eventName = document.getElementById('event-name').value;
            const eventImage = document.getElementById('event-image').value; // NEW: Get the updated image URL
            const eventDate = document.getElementById('event-date').value;
            const eventTime = document.getElementById('event-time').value;
            const eventLocation = document.getElementById('event-location').value;
            const eventCategory = document.getElementById('event-category').value;
            const eventDescription = document.getElementById('event-description').value;
            
            const eventDateTime = new Date(`${eventDate}T${eventTime}`);
            
            try {
                const eventRef = doc(db, "events", eventId);
                
                await updateDoc(eventRef, {
                    name: eventName,
                    imageUrl: eventImage, // NEW: Add imageUrl to the update object
                    date: Timestamp.fromDate(eventDateTime),
                    location: eventLocation,
                    category: eventCategory,
                    description: eventDescription
                });

                alert("Event updated successfully!");
                window.location.href = 'dashboard.html';

            } catch (error) {
                console.error("Error updating document:", error);
                alert("Failed to update event.");
                submitButton.disabled = false;
                submitButton.innerHTML = `<i class="fa-solid fa-save mr-2"></i>Update Event`;
            }
        });

    } else {
        alert("You must be logged in to edit an event.");
        window.location.href = 'login.html';
    }
});