import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: "multitaskai-29234.firebaseapp.com",
    projectId: "multitaskai-29234",
    storageBucket: "multitaskai-29234.firebasestorage.app",
    messagingSenderId: "366482690224",
    appId: "1:366482690224:web:954d5cbfa6aaadc5adeb75"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
