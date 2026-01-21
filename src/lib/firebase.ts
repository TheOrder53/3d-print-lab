import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyAecC0er_046n3_yBRrdxkk1BhE_-oynS0",
  authDomain: "d-print-lab-6a35b.firebaseapp.com",
  projectId: "d-print-lab-6a35b",
  storageBucket: "d-print-lab-6a35b.firebasestorage.app",
  messagingSenderId: "951412095062",
  appId: "1:951412095062:web:33a1a04b83d2befa3423f7",
  measurementId: "G-N5QBHJ4X7X"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Auth
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()

// Firestore
export const db = getFirestore(app)

export default app
