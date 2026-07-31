# StudyHub Pro

StudyHub Pro is a modern, responsive, and robust educational document sharing platform. Built with Vanilla JavaScript ES6 Modules, Firebase, and a custom Cyberpunk/Glassmorphism UI.

## Features
- **Role-Based Access Control:** Admin, Teacher, and Student roles.
- **Firebase Integration:** Authentication, Firestore database, and Cloud Storage.
- **Progressive Web App (PWA):** Installable with offline caching via Service Workers.
- **Modern UI:** Cyberpunk aesthetics, Glassmorphism, Neon accents, and complex animations.
- **Document Management:** Upload, preview, download, and search educational materials.
- **Engagement:** Comments, replies, likes, favorites, and 5-star ratings.

## Tech Stack
- Frontend: HTML5, CSS3, Vanilla JS (ES6 Modules)
- Backend/BaaS: Firebase (Auth, Firestore, Storage)
- UI Icons & Fonts: FontAwesome, Google Fonts (Poppins)
- Hosting: GitHub Pages / Firebase Hosting

## Setup Instructions
1. Clone this repository.
2. Create a Firebase Project at [Firebase Console](https://console.firebase.google.com/).
3. Enable Authentication (Email/Password), Firestore, and Storage.
4. Replace the Firebase configuration in `assets/js/firebase.js` with your project credentials.
5. Deploy Firestore and Storage rules (provided in the setup).
6. Serve locally using standard Live Server or deploy directly to GitHub Pages.