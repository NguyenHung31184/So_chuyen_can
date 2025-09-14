
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Add your web app's Firebase configuration
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCrWeudlRw25RPxV_csPe4NuOawuacOySw",
  authDomain: "so-theo-doi-dien-tu.firebaseapp.com",
  projectId: "so-theo-doi-dien-tu",
  storageBucket: "so-theo-doi-dien-tu.firebasestorage.app",
  messagingSenderId: "1065814903",
  appId: "1:1065814903:web:23266146d7e725dfa02f72",
  measurementId: "G-TJW8PKYQ24"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get a reference to the database service and auth service
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
