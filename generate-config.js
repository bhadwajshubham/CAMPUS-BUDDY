const fs = require('fs');
const path = require('path');

// This is the path to the file that will be created in your deployed site
const configFilePath = path.join(__dirname, 'js', 'firebase-config.js');

// This is the content of the file, with placeholders that will be replaced by Netlify's environment variables
const configFileContent = `
// This file is generated automatically by Netlify. DO NOT EDIT.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "${process.env.REACT_APP_FIREBASE_API_KEY}",
  authDomain: "${process.env.REACT_APP_FIREBASE_AUTH_DOMAIN}",
  projectId: "${process.env.REACT_APP_FIREBASE_PROJECT_ID}",
  storageBucket: "${process.env.REACT_APP_FIREBASE_STORAGE_BUCKET}",
  messagingSenderId: "${process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID}",
  appId: "${process.env.REACT_APP_FIREBASE_APP_ID}"
};

// These are the secrets for your email sending function
export const APPS_SCRIPT_URL = "${process.env.APPS_SCRIPT_URL}";
export const SECRET_KEY = "${process.env.SECRET_KEY}";


// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
`;

// This function writes the file to the disk
try {
    fs.writeFileSync(configFilePath, configFileContent.trim());
    console.log('Successfully generated firebase-config.js');
} catch (error) {
    console.error('Error generating firebase-config.js:', error);
    process.exit(1); // Exit with an error code to fail the build
}
