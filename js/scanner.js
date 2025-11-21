// /js/scanner.js
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    doc, getDoc, addDoc, collection, query, where, getDocs, 
    onSnapshot, Timestamp, orderBy, limit 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* -------------------------------------------------------------------------- */
/* CONFIGURATION & STATE                                                      */
/* -------------------------------------------------------------------------- */
const beepOk = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
const beepFail = new Audio('https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3');

let eventId = new URLSearchParams(window.location.search).get('id');
let isScanning = true; 
let html5QrCode;

/* -------------------------------------------------------------------------- */
/* 1. AUTH & INIT                                                             */
/* -------------------------------------------------------------------------- */
onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = 'login.html'; return; }
    
    if (!eventId) { 
        alert("Error: No Event ID provided."); 
        window.location.href='dashboard.html'; 
        return; 
    }

    // Fetch Event Metadata
    try {
        const evSnap = await getDoc(doc(db, "events", eventId));
        if(evSnap.exists()) {
            document.getElementById('eventName').textContent = evSnap.data().name;
        }
    } catch(e) { console.error("Event Load Error:", e); }

    // Initialize Systems
    initCamera();
    initLiveFeed();
});

/* -------------------------------------------------------------------------- */
/* 2. CAMERA ENGINE                                                           */
/* -------------------------------------------------------------------------- */
function initCamera() {
    html5QrCode = new Html5Qrcode("reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    // Start Back Camera
    html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess)
    .catch(err => {
        console.error("Camera Error", err);
        alert("Camera access denied. Please check device permissions.");
    });
}

/* -------------------------------------------------------------------------- */
/* 3. SCAN PROCESSOR                                                          */
/* -------------------------------------------------------------------------- */
async function onScanSuccess(decodedText) {
    if (!isScanning) return;
    isScanning = false;

    const parts = decodedText.split(':');
    
    // Validation 1: Format
    if (parts.length !== 2) {
        showFeedback('error', 'Invalid Code');
        return resetScanDelay();
    }

    const [studentUid, qrEventId] = parts;

    // Validation 2: Correct Event
    if (qrEventId !== eventId) {
        showFeedback('error', 'Wrong Event');
        return resetScanDelay();
    }

    try {
        // Validation 3: Is Registered?
        const regQ = query(collection(db, "registrations"), 
                           where("userId", "==", studentUid), 
                           where("eventId", "==", eventId));
        const regSnap = await getDocs(regQ);

        if (regSnap.empty) {
            showFeedback('error', 'Not Registered');
            return resetScanDelay();
        }

        // Validation 4: Already Entered?
        const attQ = query(collection(db, "attendance"), 
                           where("userId", "==", studentUid), 
                           where("eventId", "==", eventId));
        const attSnap = await getDocs(attQ);

        if (!attSnap.empty) {
            showFeedback('error', 'Already Scanned');
            return resetScanDelay();
        }

        // SUCCESS: Mark Attendance
        const studentData = regSnap.docs[0].data();
        const studentName = studentData.studentName.split(' ')[0];

        await addDoc(collection(db, "attendance"), {
            userId: studentUid,
            eventId: eventId,
            studentName: studentData.studentName,
            studentRoll: studentData.studentRoll,
            organizerId: auth.currentUser.uid,
            timestamp: Timestamp.now()
        });

        showFeedback('success', `Welcome ${studentName}!`);

    } catch (e) {
        console.error(e);
        showFeedback('error', 'DB Error');
    }
    
    resetScanDelay();
}

function resetScanDelay() {
    setTimeout(() => { isScanning = true; }, 2500);
}

/* -------------------------------------------------------------------------- */
/* 4. LIVE FEED (REAL-TIME)                                                   */
/* -------------------------------------------------------------------------- */
function initLiveFeed() {
    const list = document.getElementById('feed-list');
    const countBadge = document.getElementById('scan-count');

    const q = query(collection(db, "attendance"), 
                    where("eventId", "==", eventId), 
                    orderBy("timestamp", "desc"), 
                    limit(20));
    
    onSnapshot(q, (snapshot) => {
        countBadge.textContent = `${snapshot.size} Scanned`;
        
        if(snapshot.empty) {
            list.innerHTML = `
            <div class="empty-state">
                <i class="ri-qr-scan-2-line"></i>
                <p>Ready to scan tickets...</p>
            </div>`;
            return;
        }
        
        list.innerHTML = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const dateObj = data.timestamp?.toDate();
            const time = dateObj ? dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--';
            const initial = data.studentName ? data.studentName.charAt(0).toUpperCase() : '?';

            const html = `
            <div class="feed-item">
                <div class="feed-avatar">${initial}</div>
                <div class="feed-info">
                    <span class="feed-name">${data.studentName}</span>
                    <span class="feed-roll">${data.studentRoll}</span>
                </div>
                <div class="feed-time">${time}</div>
            </div>`;
            
            list.insertAdjacentHTML('beforeend', html);
        });
    });
}

/* -------------------------------------------------------------------------- */
/* 5. UI FEEDBACK CONTROLLER                                                  */
/* -------------------------------------------------------------------------- */
function showFeedback(type, msg) {
    const overlay = document.getElementById('flash-overlay');
    const icon = document.getElementById('flash-icon');
    const text = document.getElementById('flash-msg');
    
    // Reset classes
    overlay.className = '';
    
    if (type === 'success') {
        overlay.classList.add('flash-visible', 'flash-success');
        icon.className = 'ri-checkbox-circle-fill flash-icon';
        beepOk.play();
    } else {
        overlay.classList.add('flash-visible', 'flash-error');
        icon.className = 'ri-error-warning-fill flash-icon';
        beepFail.play();
    }

    text.textContent = msg;

    setTimeout(() => {
        overlay.className = 'flash-hidden';
    }, 1200);
}