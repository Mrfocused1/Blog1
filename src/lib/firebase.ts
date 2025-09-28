import { initializeApp } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getAuth, connectAuthEmulator } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyAAxxFweyqcs13al8u7JFQcnoYS_OdIFYg",
  authDomain: "directory-1-299d6.firebaseapp.com",
  projectId: "directory-1-299d6",
  storageBucket: "directory-1-299d6.firebasestorage.app",
  messagingSenderId: "475447921714",
  appId: "1:475447921714:web:5dbdeb1ec9d98156fbc02b",
  measurementId: "G-D739RP9SPR"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firestore
export const db = getFirestore(app)

// Initialize Auth
export const auth = getAuth(app)

// YouTube API configuration
export const YOUTUBE_API_KEY = 'AIzaSyBYase6m8V2IW6HkUkXgs5wz-dPzgrl2g0'
export const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/videos'

export default app