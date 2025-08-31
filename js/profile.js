import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const profileForm = document.getElementById('profile-form');
    if (!profileForm) return; // Only run on the profile page

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // User is logged in, get their data
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);

            // --- Load existing data into the form ---
            if (userDoc.exists()) {
                const userData = userDoc.data();
                document.getElementById('profile-name').value = userData.fullName || '';
                document.getElementById('profile-email').value = userData.email || '';
                document.getElementById('profile-college').value = userData.college || '';
                document.getElementById('profile-contact').value = userData.contact || '';
                // You would also load the profile picture URL here
            }

            // --- Save changes when form is submitted ---
            profileForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const updatedData = {
                    fullName: document.getElementById('profile-name').value,
                    college: document.getElementById('profile-college').value,
                    contact: document.getElementById('profile-contact').value
                };

                try {
                    await updateDoc(userDocRef, updatedData);
                    alert('Profile updated successfully!');
                } catch (error) {
                    console.error("Error updating profile: ", error);
                    alert("Failed to update profile. Please try again.");
                }
            });

        } else {
            // No user is signed in, redirect to login
            console.log("No user signed in. Redirecting...");
            window.location.href = 'login.html';
        }
    });
});