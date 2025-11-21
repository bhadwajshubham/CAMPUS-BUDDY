// /js/dashboard.js
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut as firebaseSignOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, getDoc, updateDoc, collection, query, where, getDocs, Timestamp,
  addDoc, orderBy, limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- TOAST HELPER ---
const toastRootId = 'cb-toast-root';
function toast(msg, level = 'info') {
  try {
    let root = document.getElementById(toastRootId);
    if (!root) {
      root = document.createElement('div');
      root.id = toastRootId;
      root.style.position = 'fixed'; root.style.right = '24px'; root.style.bottom = '24px'; root.style.zIndex = 10000;
      document.body.appendChild(root);
    }
    const el = document.createElement('div');
    el.innerHTML = `<span style="margin-right:8px">${level === 'error' ? '🚫' : '✅'}</span> ${msg}`;
    el.style.marginTop = '10px'; el.style.padding = '12px 16px'; el.style.borderRadius = '12px';
    el.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
    el.style.background = level === 'error' ? '#3f1a1a' : '#1e293b';
    el.style.color = level === 'error' ? '#fca5a5' : '#ffffff';
    el.style.border = level === 'error' ? '1px solid #7f1d1d' : '1px solid #334155';
    el.style.fontFamily = 'Inter, sans-serif'; el.style.fontSize = '0.9rem';
    el.style.animation = 'slideIn 0.3s ease';
    
    root.appendChild(el);
    setTimeout(() => { el.remove(); if (!root.children.length) root.remove(); }, 4000);
  } catch (e) { console.log(msg); }
}

// Inject Keyframes
const style = document.createElement('style');
style.innerHTML = `@keyframes slideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`;
document.head.appendChild(style);

function $id(id) { return document.getElementById(id); }
function escapeHtml(unsafe) { return String(unsafe).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
function safeToDate(val) { if (!val) return null; if (val.toDate) return val.toDate(); try { return new Date(val); } catch (e) { return null; } }

/* ---------------------------------------------------------
   1. PROFILE GATEKEEPER (Fixed with Class Toggle)
   --------------------------------------------------------- */
async function enforceProfileCompletion(user, userData) {
    if (userData.role === 'superAdmin' || userData.role === 'faculty') return true;

    if (userData.rollNo && userData.department && userData.mobile) {
        return true;
    }

    console.log("Profile incomplete. Enforcing modal...");
    const modal = $id('profile-completion-modal');
    const form = $id('completeProfileForm');
    
    if (modal) {
        modal.classList.add('active'); // FORCE SHOW

        form.onsubmit = async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button');
            btn.innerHTML = 'Saving...'; btn.disabled = true;
            try {
                await updateDoc(doc(db, "users", user.uid), {
                    rollNo: $id('inputRollNo').value.trim(),
                    department: $id('inputDept').value,
                    group: $id('inputGroup').value.trim(),
                    mobile: $id('inputMobile').value.trim(),
                    profileCompleted: true
                });
                toast("Profile Completed!");
                modal.classList.remove('active');
                location.reload();
            } catch (err) {
                console.error(err); toast("Error saving profile.", "error");
                btn.innerHTML = 'Save & Continue'; btn.disabled = false;
            }
        };
        return false; 
    } 
    return false;
}

/* ---------------------------------------------------------
   2. UI SWITCHER
   --------------------------------------------------------- */
function configureUIForRole(role) {
    const els = {
        menuStudent: $id('menu-student'),
        menuOrganizer: $id('menu-organizer'),
        menuAdmin: $id('menu-admin'),
        btnCreate: $id('btn-create-event'),
        viewStudent: $id('student-view'),
        viewOrganizer: $id('organizer-view')
    };

    Object.values(els).forEach(el => { if(el) el.style.display = 'none'; });

    if (role === 'student') {
        if(els.menuStudent) els.menuStudent.style.display = 'block';
        if(els.viewStudent) els.viewStudent.style.display = 'block';
    } 
    else if (role === 'organizer') {
        if(els.menuOrganizer) els.menuOrganizer.style.display = 'block';
        if(els.btnCreate) els.btnCreate.style.display = 'inline-flex';
        if(els.viewOrganizer) els.viewOrganizer.style.display = 'block';
    }
    else if (role === 'superAdmin' || role === 'faculty') {
        if(els.menuOrganizer) els.menuOrganizer.style.display = 'block';
        if(els.menuAdmin) els.menuAdmin.style.display = 'block';
        if(els.btnCreate) els.btnCreate.style.display = 'inline-flex';
        if(els.viewOrganizer) els.viewOrganizer.style.display = 'block';
    }
}

/* ---------------------------------------------------------
   3. INIT
   --------------------------------------------------------- */
const initDashboard = async (user) => {
  if (!user) return;
  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) { console.error("User not found"); return; }
    
    const userData = userDoc.data();
    const userRole = userData.role || 'student';

    const isProfileComplete = await enforceProfileCompletion(user, userData);
    if (!isProfileComplete && userRole === 'student') return;

    $id('header-username').textContent = userData.fullName || "User";
    $id('header-role').textContent = userRole.toUpperCase();

    configureUIForRole(userRole);

    if (userRole === 'student') {
        setupStudentNavigation(user, userData);
        fetchStudentTickets(user.uid);
    } else {
        renderOrganizerDashboard(user.uid);
        setupAdminTools(userRole);
    }

    $id('logoutBtn')?.addEventListener('click', async () => {
        await firebaseSignOut(auth); window.location.href = 'index.html';
    });
    $id('btn-create-event')?.addEventListener('click', () => window.location.href = 'create-event.html');

  } catch (err) { console.error("Init Error:", err); }
};

/* ---------------------------------------------------------
   4. FACULTY CONTROLS
   --------------------------------------------------------- */
function setupAdminTools(role) {
    if (role !== 'superAdmin' && role !== 'faculty') return;

    const modal = $id('manage-users-modal');
    const closeBtn = $id('close-manage-modal');
    const form = $id('manageUsersForm');

    $id('nav-manage-users')?.addEventListener('click', () => modal.classList.add('active'));
    closeBtn?.addEventListener('click', () => modal.classList.remove('active'));

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = $id('mgmtEmail').value.trim();
        const newRole = $id('mgmtRole').value;
        const statusEl = $id('mgmt-status');
        const btn = e.target.querySelector('button');

        btn.disabled = true; btn.innerHTML = 'Searching...';
        statusEl.innerHTML = '';

        try {
            const q = query(collection(db, "users"), where("email", "==", email));
            const snap = await getDocs(q);

            if (snap.empty) {
                statusEl.innerHTML = `<span style="color:#ef4444">User not found!</span>`;
                return;
            }

            await updateDoc(doc(db, "users", snap.docs[0].id), { role: newRole });
            statusEl.innerHTML = `<span style="color:#34d399">Success! Role updated.</span>`;
            $id('mgmtEmail').value = '';
        } catch (err) {
            console.error(err);
            statusEl.innerHTML = `<span style="color:#ef4444">Error: ${err.message}</span>`;
        } finally {
            btn.disabled = false; btn.innerHTML = 'Update Access';
        }
    });
}

/* ---------------------------------------------------------
   5. ORGANIZER DATA
   --------------------------------------------------------- */
const renderOrganizerDashboard = (uid) => fetchOrganizerEvents(uid);

const fetchOrganizerEvents = async (userId) => {
  const list = $id('organizer-event-list');
  if (!list) return;
  list.innerHTML = `<div class="skeleton-card"></div>`;
  
  try {
    const q = query(collection(db, "events"), where("organizerId", "==", userId), orderBy("date", "desc"), limit(50));
    const snap = await getDocs(q);
    list.innerHTML = '';

    if (snap.empty) {
      list.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:30px; color:var(--text-muted); border:1px dashed var(--border); border-radius:12px;">
            <p>No events created.</p>
            <button class="btn primary" onclick="window.location.href='create-event.html'" style="margin-top:10px;">Create Event</button>
      </div>`;
      return;
    }
    
    snap.forEach(docSnap => {
      const event = docSnap.data();
      const docId = docSnap.id;
      const dateStr = safeToDate(event.date)?.toLocaleDateString() || 'TBA';
      
      const html = `
        <div class="event-card-item">
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <h3 style="font-size:1.1rem; color:white;">${escapeHtml(event.name)}</h3>
                <span style="font-size:0.75rem; color:#34d399; background:rgba(16,185,129,0.1); padding:4px 8px; border-radius:4px;">ACTIVE</span>
            </div>
            <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:20px;">${dateStr} • ${escapeHtml(event.location)}</p>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                <button class="btn ghost" style="border:1px solid var(--border);" onclick="location.href='edit-event.html?id=${docId}'">Edit</button>
                <button class="btn primary" onclick="window.location.href='scanner.html?id=${docId}'">Scan QR</button>
            </div>
        </div>`;
      list.innerHTML += html;
    });
  } catch (err) { console.error(err); list.innerHTML = '<p style="color:red">Load failed.</p>'; }
};

/* ---------------------------------------------------------
   6. STUDENT DATA
   --------------------------------------------------------- */
function setupStudentNavigation(user, userData) {
    $id('nav-explore')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector('#student-view .page-header h2').textContent = "Explore Events";
        fetchExploreEvents(user, userData);
    });
    $id('nav-tickets')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector('#student-view .page-header h2').textContent = "My Tickets";
        fetchStudentTickets(user.uid);
    });
}

function checkEligibility(studentData, eventData) {
    if (!eventData.restrictedBranches || eventData.restrictedBranches.length === 0) return { allowed: true };
    if (eventData.restrictedBranches.includes(studentData.department)) return { allowed: true };
    return { allowed: false, reason: `Only for ${eventData.restrictedBranches.join(', ')}` };
}

const fetchExploreEvents = async (user, userData) => {
    const list = $id('student-upcoming-list');
    if(!list) return;
    list.innerHTML = `<div class="skeleton-card"></div>`;

    try {
        const q = query(collection(db, "events"), orderBy("date", "desc"), limit(50));
        const snap = await getDocs(q);
        list.innerHTML = '';

        snap.forEach(docSnap => {
            const event = docSnap.data();
            const btnId = `btn-reg-${docSnap.id}`;
            const dateStr = safeToDate(event.date)?.toLocaleDateString() || 'TBA';
            
            list.innerHTML += `
            <div class="event-card-item">
                <div style="display:flex;justify-content:space-between;">
                    <h3 style="font-size:1.1rem;">${escapeHtml(event.name)}</h3>
                    <span style="font-size:0.75rem; color:var(--primary);">${dateStr}</span>
                </div>
                <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:15px;">
                    ${escapeHtml(event.location || 'TBA')}
                </p>
                <div style="margin-top:auto;">
                    <button id="${btnId}" class="btn primary" style="width:100%;">Register</button>
                </div>
            </div>`;

            setTimeout(() => {
                const btn = document.getElementById(btnId);
                if(btn) btn.onclick = () => handleRegistration(user, userData, docSnap.id, event);
            }, 0);
        });
    } catch(e) { console.error(e); }
};

const handleRegistration = async (user, userData, eventId, eventData) => {
    const eligibility = checkEligibility(userData, eventData);
    if (!eligibility.allowed) {
        toast("🚫 " + eligibility.reason, "error");
        return;
    }
    if(!confirm(`Register for ${eventData.name}?`)) return;

    try {
        const q = query(collection(db, "registrations"), where("userId", "==", user.uid), where("eventId", "==", eventId));
        if(!(await getDocs(q)).empty) { toast("Already registered!", "error"); return; }

        await addDoc(collection(db, "registrations"), {
            userId: user.uid, eventId, 
            studentName: userData.fullName, studentRoll: userData.rollNo, studentDept: userData.department,
            registeredAt: Timestamp.now()
        });
        toast("Success! Ticket generated.");
    } catch (err) { console.error(err); toast("Registration failed.", "error"); }
};

const fetchStudentTickets = async (userId) => {
    const list = $id('student-upcoming-list');
    list.innerHTML = `<div class="skeleton-card"></div>`;
    try {
        const regSnap = await getDocs(query(collection(db, "registrations"), where("userId", "==", userId)));
        const eventIds = regSnap.docs.map(d => d.data().eventId);
        if(!eventIds.length) { list.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:var(--text-muted);">No tickets yet. Go to Explore!</div>`; return; }

        list.innerHTML = '';
        for(const eid of eventIds) {
             const evSnap = await getDoc(doc(db, "events", eid));
             if(evSnap.exists()) {
                 const ev = evSnap.data();
                 list.innerHTML += `
                 <div class="event-card-item">
                    <h3 style="font-size:1.1rem;">${escapeHtml(ev.name)}</h3>
                    <p style="color:var(--text-muted); font-size:0.9rem;">Ticket Ready</p>
                    <button class="btn ghost" style="width:100%; border:1px solid var(--border); margin-top:10px;" onclick="showQR('${userId}', '${eid}', '${escapeHtml(ev.name)}')">
                        View Ticket
                    </button>
                 </div>`;
             }
        }
    } catch(e) { console.error(e); }
};

window.showQR = (uid, eid, name) => {
    const modal = $id('qr-modal');
    if(modal) {
        $id('qr-event-title').textContent = name;
        modal.querySelector('img').src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${uid}:${eid}`;
        modal.classList.add('active');
        $id('close-modal').onclick = () => modal.classList.remove('active');
    }
};

onAuthStateChanged(auth, (user) => {
  if (user) initDashboard(user);
  else if (document.body.id === 'dashboard-page') window.location.href = 'login.html';
});