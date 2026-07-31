// ======================================================
// StudyHub Pro - Firebase Configuration
// ======================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyCLSPzUqzQD-MA4VTsPTfLOJ6NLtxnN1Ks",
    authDomain: "studyhub-pro-3b83e.firebaseapp.com",
    projectId: "studyhub-pro-3b83e",
    storageBucket: "studyhub-pro-3b83e.firebasestorage.app",
    messagingSenderId: "842473482005",
    appId: "1:842473482005:web:f50b0cc88c6534f7a92b1c",
    measurementId: "G-VRP0QSWD0E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Services
export const auth = getAuth(app);

export const db = getFirestore(app);

export const storage = getStorage(app);

export default app;
