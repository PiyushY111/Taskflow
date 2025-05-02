import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDE9KTpxPtf2aYmPBSHZ0IXKIsi7H1Cgm8",
  authDomain: "todolist-4da62.firebaseapp.com",
  projectId: "todolist-4da62",
  storageBucket: "todolist-4da62.firebasestorage.app",
  messagingSenderId: "309025918887",
  appId: "1:309025918887:web:8b4dcc7d9c7f193de0b082",
  measurementId: "G-Y3HEBZGL4J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, analytics, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, googleProvider, signInWithPopup }; 