// js/signup.js
// Updated signup script:
// - theme toggle fixes (uses documentElement)
// - floating/filled labels (JS driven, avoids placeholder duplication)
// - moves role selector to top of form
// - role-based employee-code visibility
// - firebase signup (email + google) with domain checks
// - optional location check (disabled by default)
// - cursor & navbar small features (safe guards)

import { auth, db } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { setDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

if (!auth || !db) {
  console.error("Firebase not initialized. Check firebase-config.js");
  // do not throw in production - but notify
}

// --------------------
// THEME TOGGLE (works across pages)
// --------------------
const themeButton = document.querySelector('.theme-toggle');

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  if (themeButton) {
    themeButton.innerHTML = theme === 'dark'
      ? '<i class="fas fa-sun"></i> Theme'
      : '<i class="fas fa-moon"></i> Theme';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('theme') || 'light';
  applyTheme(saved);

  if (themeButton) {
    themeButton.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  }
});

// --------------------
// DOM Helpers: floating label (reliable across browsers)
// --------------------
function syncFilledState(input) {
  const group = input.closest('.input-group');
  if (!group) return;
  const value = (input.value || '').toString().trim();
  if (value !== '') group.classList.add('filled');
  else group.classList.remove('filled');
}

function attachFillListeners(form) {
  if (!form) return;
  const fields = form.querySelectorAll('input, textarea, select');
  fields.forEach(f => {
    // initialize
    syncFilledState(f);
    // update on input/change
    f.addEventListener('input', () => syncFilledState(f));
    f.addEventListener('change', () => syncFilledState(f));
    // also blur to re-evaluate
    f.addEventListener('blur', () => syncFilledState(f));
  });
}

// --------------------
// ROLE ordering & employee-code logic
// --------------------
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('signup-form');
  const roleSelect = document.getElementById('signup-role');
  const employeeCodeGroup = document.getElementById('employee-code-group');

  // Move role input group to the top of the form for clarity
  try {
    if (roleSelect && form) {
      const roleGroup = roleSelect.closest('.input-group');
      if (roleGroup) form.insertBefore(roleGroup, form.firstElementChild);
    }
  } catch (e) {
    console.warn('Could not reorder role field:', e);
  }

  // Attach filled label listeners
  attachFillListeners(form);

  // Show/hide employee code field when role changes
  if (roleSelect && employeeCodeGroup) {
    roleSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'teacher' || val === 'admin') {
        employeeCodeGroup.style.display = 'block';
        const ec = employeeCodeGroup.querySelector('input');
        if (ec) ec.required = true;
      } else {
        employeeCodeGroup.style.display = 'none';
        const ec = employeeCodeGroup.querySelector('input');
        if (ec) { ec.required = false; ec.value = ''; syncFilledState(ec); }
      }
    });

    // run once to ensure correct visibility
    const evt = new Event('change');
    roleSelect.dispatchEvent(evt);
  }
});

// --------------------
// SIGNUP FORM: Email/password
// --------------------
const signupForm = document.getElementById('signup-form');

if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const university = document.getElementById('signup-university').value.trim();
    const rollNo = document.getElementById('signup-rollno').value.trim();
    const department = document.getElementById('signup-department').value;
    const role = document.getElementById('signup-role').value;
    const employeeCode = (role === 'teacher' || role === 'admin') ? (document.getElementById('signup-employee-code').value.trim() || '') : '';

    // basic validations
    if (!email.endsWith('@chitkara.edu.in')) {
      alert('Please sign up with your Chitkara University email.');
      return;
    }
    if (password.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }
    if (!fullName) {
      alert('Please enter your full name.');
      return;
    }

    // optional: you may enable campus-only signup; currently disabled for UX
    // try { const isOn = await verifyLocation(); if (!isOn) { alert('Please signup from campus'); return; } } catch(e){ console.warn(e); }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // update display name
      await updateProfile(user, { displayName: fullName });

      // Prepare user doc. Teachers/admins stay unverified until approved.
      const userDoc = {
        fullName,
        email,
        university,
        rollNo,
        department,
        role,
        employeeCode,
        verified: role === 'student', // auto verify students
        organizer: false,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', user.uid), userDoc);

      alert('Account created. Please login. Verification for teachers/admins is pending.');
      window.location.href = 'login.html';
    } catch (error) {
      console.error('Signup error:', error);
      alert(`Signup failed: ${error.message}`);
    }
  });
}

// --------------------
// GOOGLE SIGNUP (domain enforced + auto-create student)
// --------------------
const googleSignupBtn = document.getElementById('google-signup-btn');

if (googleSignupBtn) {
  googleSignupBtn.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ hd: 'chitkara.edu.in' });

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      if (!user.email.endsWith('@chitkara.edu.in')) {
        await signOut(auth);
        alert('Use your Chitkara University email for Google sign-up.');
        return;
      }

      const userDocRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userDocRef);

      if (!snap.exists()) {
        await setDoc(userDocRef, {
          fullName: user.displayName || 'Unknown',
          email: user.email,
          role: 'student',
          university: 'Chitkara University',
          rollNo: '',
          department: '',
          verified: true,
          organizer: false,
          createdAt: new Date().toISOString()
        });
      }

      window.location.href = 'dashboard.html';
    } catch (error) {
      console.error('Google signup error:', error);
      if (error.code === 'auth/account-exists-with-different-credential') {
        alert('Account exists with a different credential. Use email/password login.');
      } else {
        alert(`Google signup failed: ${error.message}`);
      }
    }
  });
}

// --------------------
// Optional: Location verification (purely optional—disabled by default above)
// --------------------
function verifyLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords;
      const chitkaraLat = 30.515, chitkaraLng = 76.660;
      const distance = getDistance(latitude, longitude, chitkaraLat, chitkaraLng);
      resolve(distance <= 1);
    }, err => reject(err), { timeout: 10000, enableHighAccuracy: true });
  });
}
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1), dLon = deg2rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function deg2rad(d) { return d * (Math.PI / 180); }

// --------------------
// Cursor & navbar small features (lock-safe, graceful)
// --------------------
(function initCursorAndNavbar() {
  const cursor = document.querySelector('.cursor');
  const cursorFollower = document.querySelector('.cursor-follower');

  let mx = 0, my = 0, fx = 0, fy = 0;
  if (cursor && cursorFollower) {
    document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
    (function loop() {
      cursor.style.left = mx + 'px';
      cursor.style.top = my + 'px';
      fx += (mx - fx) * 0.12;
      fy += (my - fy) * 0.12;
      cursorFollower.style.left = fx + 'px';
      cursorFollower.style.top = fy + 'px';
      requestAnimationFrame(loop);
    })();

    document.querySelectorAll('.btn, input, select, a').forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
    });
  }

  window.addEventListener('scroll', () => {
    const nav = document.querySelector('.navbar');
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 80);
  });
})();
