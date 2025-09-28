import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp
} from 'firebase/firestore'
import { db, YOUTUBE_API_KEY, YOUTUBE_API_URL } from './firebase'

export interface Video {
  id?: string
  title: string
  description: string
  videoUrl: string
  category: string
  tags: string[]
  thumbnail?: string
  duration?: string
  viewCount?: number
  addedBy?: string
  createdAt?: Timestamp
  updatedAt?: Timestamp
  sortOrder?: number
}

export interface YouTubeVideoData {
  title: string
  description: string
  thumbnail: string
  duration: string
  viewCount: number
}

// YouTube API functions
export async function getYouTubeVideoData(videoId: string): Promise<YouTubeVideoData | null> {
  try {
    const response = await fetch(
      `${YOUTUBE_API_URL}?id=${videoId}&key=${YOUTUBE_API_KEY}&part=snippet,contentDetails,statistics`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch YouTube data')
    }

    const data = await response.json()

    if (data.items && data.items.length > 0) {
      const video = data.items[0]
      return {
        title: video.snippet.title,
        description: video.snippet.description,
        thumbnail: video.snippet.thumbnails.maxres?.url || video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium.url,
        duration: video.contentDetails.duration,
        viewCount: parseInt(video.statistics.viewCount)
      }
    }

    return null
  } catch (error) {
    console.error('Error fetching YouTube data:', error)
    return null
  }
}

export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return match[1]
    }
  }

  return null
}

// Firestore operations
export async function addVideo(videoData: Omit<Video, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'videos'), {
      ...videoData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    })
    return docRef.id
  } catch (error) {
    console.error('Error adding video:', error)
    throw error
  }
}

export async function getVideos(): Promise<Video[]> {
  try {
    // Get all documents without ordering requirement
    const querySnapshot = await getDocs(collection(db, 'videos'))
    const videos = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Video[]

    // Sort by sortOrder first, then by creation date
    return videos.sort((a, b) => {
      // If both have sortOrder, use that
      if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
        return a.sortOrder - b.sortOrder
      }
      // If only one has sortOrder, prioritize it
      if (a.sortOrder !== undefined) return -1
      if (b.sortOrder !== undefined) return 1
      // Fall back to creation date sorting
      const aTime = a.createdAt?.toDate().getTime() || 0
      const bTime = b.createdAt?.toDate().getTime() || 0
      return bTime - aTime // Most recent first
    })
  } catch (error) {
    console.error('Error getting videos:', error)
    return []
  }
}

export async function getVideosByCategory(category: string): Promise<Video[]> {
  try {
    // Get all videos first, then filter by category
    const querySnapshot = await getDocs(collection(db, 'videos'))
    const videos = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Video[]

    // Filter by category and sort in memory
    return videos
      .filter(video => video.category === category)
      .sort((a, b) => {
        const aTime = a.createdAt?.toDate().getTime() || 0
        const bTime = b.createdAt?.toDate().getTime() || 0
        return bTime - aTime // Most recent first
      })
  } catch (error) {
    console.error('Error getting videos by category:', error)
    return []
  }
}

export async function searchVideos(searchTerm: string): Promise<Video[]> {
  try {
    // Note: Firestore doesn't support full-text search natively
    // This is a basic implementation - in production, consider using Algolia or similar
    const querySnapshot = await getDocs(collection(db, 'videos'))
    const videos = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Video[]

    return videos.filter(video =>
      video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  } catch (error) {
    console.error('Error searching videos:', error)
    return []
  }
}

export async function getVideo(id: string): Promise<Video | null> {
  try {
    const docRef = doc(db, 'videos', id)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Video
    }
    return null
  } catch (error) {
    console.error('Error getting video:', error)
    return null
  }
}

export async function updateVideo(id: string, updates: Partial<Video>): Promise<void> {
  try {
    const docRef = doc(db, 'videos', id)
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now()
    })
  } catch (error) {
    console.error('Error updating video:', error)
    throw error
  }
}

export async function deleteVideo(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'videos', id)
    await deleteDoc(docRef)
  } catch (error) {
    console.error('Error deleting video:', error)
    throw error
  }
}

// Migration function to update "Tech News" to "News"
// Update video sort order
export async function updateVideoSortOrder(videos: Video[]): Promise<void> {
  try {
    const updatePromises: Promise<void>[] = []

    videos.forEach((video, index) => {
      if (video.id) {
        const videoRef = doc(db, 'videos', video.id)
        const updateData: Partial<Video> = {
          sortOrder: index,
          updatedAt: Timestamp.now()
        }
        updatePromises.push(updateDoc(videoRef, updateData))
      }
    })

    await Promise.all(updatePromises)
  } catch (error) {
    console.error('Error updating video sort order:', error)
    throw error
  }
}

export async function migrateTechNewsToNews(): Promise<{ updated: number; message: string }> {
  try {
    const videosCollection = collection(db, 'videos')
    const q = query(videosCollection, where('category', '==', 'Tech News'))
    const querySnapshot = await getDocs(q)

    let updatedCount = 0
    const updatePromises: Promise<void>[] = []

    querySnapshot.forEach((docSnapshot) => {
      const videoData = docSnapshot.data()
      const videoRef = doc(db, 'videos', docSnapshot.id)

      // Update category and tags
      const updateData: Partial<Video> = {
        category: 'News',
        tags: videoData.tags?.map((tag: string) => tag === 'Tech News' ? 'News' : tag) || ['News'],
        updatedAt: Timestamp.fromDate(new Date())
      }

      updatePromises.push(updateDoc(videoRef, updateData))
      updatedCount++
    })

    await Promise.all(updatePromises)

    return {
      updated: updatedCount,
      message: `Successfully updated ${updatedCount} videos from "Tech News" to "News"`
    }
  } catch (error) {
    console.error('Error migrating Tech News to News:', error)
    throw error
  }
}