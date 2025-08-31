import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const loginForm = document.getElementById('login-form');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            // Step 1: Sign in the user with Firebase Authentication
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Step 2: Redirect to the dashboard on success
            alert('Login successful! Redirecting to your dashboard...');
            window.location.href = 'dashboard.html';

        } catch (error) {
            // Handle errors like wrong password, user not found, etc.
            console.error("Login Error:", error);
            alert(`Login Failed: ${error.message}`);
        }
    });
}

// Add these imports to the top of your login.js file
import { GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from './firebase-config.js'; // Make sure db is imported

// --- Google Sign-In Logic ---
const googleSignInBtn = document.getElementById('google-signin-btn');

if (googleSignInBtn) {
    googleSignInBtn.addEventListener('click', async () => {
        const provider = new GoogleAuthProvider();

        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // CRITICAL STEP: Check if user exists in Firestore. If not, create them.
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists()) {
                // This is a new user, create their document in Firestore
                await setDoc(userDocRef, {
                    fullName: user.displayName,
                    email: user.email,
                    role: 'student', // Default role for Google Sign-In
                    university: 'Unknown', // Default value, user can update in profile
                    // Add other default fields as needed
                });
                console.log("New user document created in Firestore for Google Sign-In.");
            }

            // Redirect to the dashboard
            window.location.href = 'dashboard.html';

        } catch (error) {
            console.error("Error during Google Sign-In: ", error);
            alert(`Google Sign-In failed: ${error.message}`);
        }
    });
}