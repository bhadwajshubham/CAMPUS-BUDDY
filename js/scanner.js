import { db } from './firebase-config.js';
import { collection, query, where, getDocs, doc, getDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    const resultContainer = document.getElementById("qr-reader-result");
    let lastScanTime = 0;
    let scanCooldown = 3000; // 3 seconds cooldown

    const onScanSuccess = async (decodedText, decodedResult) => {
        const currentTime = Date.now();
        if (currentTime - lastScanTime < scanCooldown) { return; }
        lastScanTime = currentTime;

        if (decodedText.startsWith("UserID:") && decodedText.includes("-EventID:")) {
            const parts = decodedText.split('-');
            const userId = parts[0].split(':')[1];
            const eventId = parts[1].split(':')[1];
            await verifyAndLogAttendance(userId, eventId);
        } else {
            showResult("Invalid QR Code Format", false);
        }
    };

    const verifyAndLogAttendance = async (userId, eventId) => {
        try {
            // 1. Check if the student is registered for the event
            const regQuery = query(collection(db, "registrations"), where("userId", "==", userId), where("eventId", "==", eventId));
            const regSnap = await getDocs(regQuery);
            if (regSnap.empty) {
                showResult("Ticket Not Found or Invalid", false);
                return;
            }

            // 2. Check if the student has ALREADY been scanned in (prevent duplicates)
            const attendanceQuery = query(collection(db, "attendance"), where("userId", "==", userId), where("eventId", "==", eventId));
            const attendanceSnap = await getDocs(attendanceQuery);
            if (!attendanceSnap.empty) {
                showResult("Already Checked In", false);
                return;
            }

            // 3. If registered and not checked in, log the attendance
            await addDoc(collection(db, "attendance"), {
                userId: userId,
                eventId: eventId,
                timestamp: serverTimestamp() // Adds the exact time of the scan
            });

            // 4. Get the user's name for a nice welcome message
            const userRef = doc(db, "users", userId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                showResult(`Success! Welcome, ${userSnap.data().fullName}!`, true);
            } else {
                showResult("Success! User Verified.", true);
            }

        } catch (error) {
            console.error("Error verifying ticket:", error);
            showResult("Verification Error", false);
        }
    };

    const showResult = (message, isSuccess) => {
        // This function remains the same
        resultContainer.textContent = message;
        resultContainer.classList.remove('bg-green-200', 'text-green-800', 'dark:bg-green-800', 'dark:text-green-200', 'bg-red-200', 'text-red-800', 'dark:bg-red-800', 'dark:text-red-200');
        if (isSuccess) {
            resultContainer.classList.add('bg-green-200', 'text-green-800', 'dark:bg-green-800', 'dark:text-green-200');
        } else {
            resultContainer.classList.add('bg-red-200', 'text-red-800', 'dark:bg-red-800', 'dark:text-red-200');
        }
    };

    const html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: { width: 250, height: 250 } });
    html5QrcodeScanner.render(onScanSuccess);
});