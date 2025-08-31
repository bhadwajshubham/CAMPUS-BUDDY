require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
const cors = require('cors'); // ADD THIS LINE


const app = express();

app.use(cors());
// Middleware to parse JSON bodies and serve static files
app.use(express.json());
// This line tells the server to serve all your HTML, CSS, and client-side JS files
app.use(express.static(path.join(__dirname))); 

// Nodemailer transporter setup using your .env credentials
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// The API endpoint that your events.js will call
app.post('/api/send-email', (req, res) => {
    console.log("Received request to send email...");

    const { to, displayName, eventId, userId, eventName, eventDate, eventLocation } = req.body;

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=UserID:${userId}-EventID:${eventId}`;
    
    const mailOptions = {
        from: `"CampusConnect Pro" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: `Confirmation for ${eventName}`,
        html: `
            <h1>Registration Confirmed!</h1>
            <p>Hi ${displayName},</p>
            <p>You have successfully registered for the event: <strong>${eventName}</strong>.</p>
            <p><strong>Date:</strong> ${eventDate}</p>
            <p><strong>Location:</strong> ${eventLocation}</p>
            <p>Please show this QR code at the entry:</p>
            <img src="${qrCodeUrl}" alt="Your QR Code Ticket">
            <p>Thank you!</p>
        `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("Error sending email:", error);
            return res.status(500).json({ success: false, message: 'Failed to send email' });
        }
        console.log('Email sent: ' + info.response);
        res.status(200).json({ success: true, message: 'Email sent successfully' });
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});