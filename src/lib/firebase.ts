import { initializeApp } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getAuth, connectAuthEmulator } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyDnqyN6xLctPAaUrpM2aPmzTv9zeMUCBvA",
  authDomain: "dgb1-f53ec.firebaseapp.com",
  projectId: "dgb1-f53ec",
  storageBucket: "dgb1-f53ec.firebasestorage.app",
  messagingSenderId: "143490964371",
  appId: "1:143490964371:web:281d81420f7c3f4c5be666",
  measurementId: "G-48YQB6FGCM"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firestore
export const db = getFirestore(app)

// Initialize Auth
export const auth = getAuth(app)

// YouTube API configuration
export const YOUTUBE_API_KEY = 'AIzaSyAsIzyBvWYmmsQtNYDh60QUI8WU4sweljk'
export const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/videos'

export default app