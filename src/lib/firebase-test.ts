import { collection, getDocs } from 'firebase/firestore'
import { db } from './firebase'

export async function testFirebaseConnection() {
  try {
    console.log('Testing Firebase connection...')

    // Test basic connection
    const videosRef = collection(db, 'videos')
    const snapshot = await getDocs(videosRef)

    console.log(`Found ${snapshot.size} documents in videos collection`)

    snapshot.forEach((doc) => {
      console.log('Document ID:', doc.id)
      console.log('Document data:', doc.data())
    })

    return {
      success: true,
      count: snapshot.size,
      documents: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    }
  } catch (error) {
    console.error('Firebase connection test failed:', error)
    return {
      success: false,
      error: error
    }
  }
}