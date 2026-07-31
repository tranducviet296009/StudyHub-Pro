// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const analytics = getAnalytics(app);