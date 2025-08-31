import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { setDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const signupForm = document.getElementById('signup-form');

if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Get all form values, including the new ones
        const fullName = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const university = document.getElementById('signup-university').value;
        const rollNo = document.getElementById('signup-rollno').value;
        const department = document.getElementById('signup-department').value;
        const role = document.getElementById('signup-role').value;

        // ** 1. Email Validation **
        // This checks if the email is from the allowed university.
        // You can add more valid domains with || email.endsWith('@otheruni.edu.in')
        if (!email.endsWith('@chitkara.edu.in')) {
            alert('Please sign up with a valid Chitkara University email address.');
            return; // Stop the function if the email is not valid
        }

        try {
            // Create the user in Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Also add the full name to the auth profile
            await updateProfile(user, {
                displayName: fullName
            });

            // ** 2. Save All Data to Firestore **
            // Create a document in the 'users' collection with the user's UID as the document ID.
            await setDoc(doc(db, "users", user.uid), {
                fullName: fullName,
                email: email,
                role: role,
                university: university,
                rollNo: rollNo,
                department: department
            });

            alert('Account created successfully! You can now log in.');
            window.location.href = 'login.html';

        } catch (error) {
            console.error("Signup Error:", error);
            alert(`Error: ${error.message}`);
        }
    });
}