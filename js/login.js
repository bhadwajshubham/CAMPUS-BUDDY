// =============================================================
// CampusConnect Login Page Script (Final)
// Author: Shubham Bhardwaj
// Description: Handles authentication, Google sign-in, and theme toggle.
// =============================================================

// 🔹 Firebase imports
import { auth, db } from './firebase-config.js';
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// =============================================================
// 1️⃣ FIREBASE INITIALIZATION CHECK
// =============================================================
if (!auth || !db) {
  console.error("❌ Firebase not initialized. Check firebase-config.js.");
  alert("App error: Firebase not initialized.");
  throw new Error("Firebase initialization failed.");
}

// =============================================================
// 2️⃣ THEME TOGGLE SYSTEM
// =============================================================
const themeToggle = document.querySelector('.theme-toggle');
const savedTheme = localStorage.getItem('theme');

// Set saved theme on load
if (savedTheme === 'dark') {
  document.documentElement.setAttribute('data-theme', 'dark');
  if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun"></i> Light';
} else {
  document.documentElement.setAttribute('data-theme', 'light');
  if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-moon"></i> Dark';
}

// Toggle theme on click
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    // Update icon
    themeToggle.innerHTML =
      newTheme === 'dark'
        ? '<i class="fas fa-sun"></i> Light'
        : '<i class="fas fa-moon"></i> Dark';
  });
} else {
  console.warn("⚠️ Theme toggle button not found. Add class='theme-toggle' to your button.");
}

// =============================================================
// 3️⃣ LOGIN FORM HANDLER (Email & Password)
// =============================================================
const loginForm = document.getElementById('login-form');

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const emailEl = document.getElementById('login-email');
    const passEl = document.getElementById('login-password');

    if (!emailEl || !passEl) {
      alert("Login form fields missing. Check login.html IDs.");
      return;
    }

    const email = emailEl.value.trim();
    const password = passEl.value.trim();

    // Basic validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert("Please enter a valid email.");
      return;
    }
    if (!email.endsWith('@chitkara.edu.in')) {
      alert("Use your Chitkara University email ID.");
      return;
    }
    if (password.length < 6) {
      alert("Password must be at least 6 characters long.");
      return;
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const user = cred.user;
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        alert("User not found. Please sign up first.");
        await signOut(auth);
        return;
      }

      const data = snap.data();
      if (["teacher", "admin"].includes(data.role) && !data.verified) {
        alert(`${data.role.toUpperCase()} account pending verification.`);
        await signOut(auth);
        return;
      }

      alert("Login successful! Redirecting...");
      window.location.href = "dashboard.html";

    } catch (error) {
      console.error("Login Error:", error);
      alert(`Login failed: ${error.message}`);
    }
  });
} else {
  console.error("⚠️ login-form not found in HTML.");
}

// =============================================================
// 4️⃣ GOOGLE SIGN-IN HANDLER
// =============================================================
const googleSignInBtn = document.getElementById('google-signin-btn');

if (googleSignInBtn) {
  googleSignInBtn.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ hd: 'chitkara.edu.in' });

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (!user.email.endsWith('@chitkara.edu.in')) {
        await signOut(auth);
        alert("Use your Chitkara email for Google Sign-In.");
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        // Create new student user
        await setDoc(userRef, {
          fullName: user.displayName || "Unknown",
          email: user.email,
          role: "student",
          university: "Chitkara University",
          verified: true,
          organizer: false
        });
      } else {
        const data = snap.data();
        if (["teacher", "admin"].includes(data.role) && !data.verified) {
          alert(`${data.role.toUpperCase()} account pending verification.`);
          await signOut(auth);
          return;
        }
      }

      alert("Google Sign-In successful! Redirecting...");
      window.location.href = "dashboard.html";

    } catch (error) {
      console.error("Google Sign-In Error:", error);
      if (error.code === "auth/account-exists-with-different-credential") {
        alert("Account exists with different credentials. Try email/password login.");
      } else {
        alert(`Google Sign-In failed: ${error.message}`);
      }
    }
  });
} else {
  console.warn("⚠️ google-signin-btn not found in HTML.");
}

// =============================================================
// 5️⃣ OPTIONAL: ADVANCED CURSOR EFFECT (Matches Your CSS)
// =============================================================
const cursor = document.querySelector('.cursor');
const follower = document.querySelector('.cursor-follower');

if (cursor && follower) {
  document.addEventListener('mousemove', (e) => {
    cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    follower.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
  });

  document.querySelectorAll('button, a, input').forEach((el) => {
    el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
  });
}
