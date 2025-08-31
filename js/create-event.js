// js/create-event.js

import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, addDoc, Timestamp, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const eventForm = document.getElementById('create-event-form');

onAuthStateChanged(auth, async (user) => {
    if (user && eventForm) {
        // Fetch the organizer's profile to get their university
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists() || (userDoc.data().role !== 'organizer' && userDoc.data().role !== 'superAdmin')) {
            alert("You do not have permission to create events.");
            window.location.href = 'dashboard.html';
            return;
        }

        const organizerData = userDoc.data();
        const organizerUniversity = organizerData.university; 

        eventForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Get all form values, including the new image URL
            const eventName = document.getElementById('event-name').value;
            const eventImage = document.getElementById('event-image').value; // NEW: Get the banner image URL
            const eventDate = document.getElementById('event-date').value;
            const eventTime = document.getElementById('event-time').value;
            const eventLocation = document.getElementById('event-location').value;
            const eventCategory = document.getElementById('event-category').value;
            const eventDescription = document.getElementById('event-description').value;
            
            const eventDateTime = new Date(`${eventDate}T${eventTime}`);

            try {
                // Add the new event to the 'events' collection
                await addDoc(collection(db, "events"), {
                    name: eventName,
                    imageUrl: eventImage, // NEW: Save the image URL
                    date: Timestamp.fromDate(eventDateTime),
                    location: eventLocation,
                    university: organizerUniversity,
                    category: eventCategory,
                    description: eventDescription,
                    organizerId: user.uid,
                    createdAt: Timestamp.now()
                });
                
                alert('Event created successfully!');
                window.location.href = 'dashboard.html';

            } catch (error) {
                console.error("Error adding document: ", error);
                alert(`Error: ${error.message}`);
            }
        });

    } else if (!user) {
        alert("You must be logged in to create an event.");
        window.location.href = 'login.html';
    }
});