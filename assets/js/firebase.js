// ======================================================
// StudyHub Pro - Firebase (Realtime Database Version)
// ======================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

import {
    getAuth,
    GoogleAuthProvider,
    GithubAuthProvider
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import {
    getDatabase
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

import {
    getStorage
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyCLSPzUqzQD-MA4VTsPTfLOJ6NLtxnN1Ks",
    authDomain: "studyhub-pro-3b83e.firebaseapp.com",
    databaseURL: "https://studyhub-pro-3b83e-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "studyhub-pro-3b83e",
    storageBucket: "studyhub-pro-3b83e.firebasestorage.app",
    messagingSenderId: "842473482005",
    appId: "1:842473482005:web:f50b0cc88c6534f7a92b1c",
    measurementId: "G-VRP0QSWD0E"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const database = getDatabase(app);

export const storage = getStorage(app);

export const googleProvider = new GoogleAuthProvider();

export const githubProvider = new GithubAuthProvider();

githubProvider.addScope("read:user");

export default app;
