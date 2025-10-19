'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Toaster } from '@/components/ui/sonner'
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { Video, getVideos } from '@/lib/database'
import { SparklesCore } from '@/components/ui/sparkles-core'
import VideoPlayerModal from '@/components/VideoPlayerModal'
import VideoForm from '@/components/VideoForm'
import DigitalSerenityEffects from '@/components/DigitalSerenityEffects'
import { HyperText } from '@/components/ui/hyper-text'
import { toast } from 'sonner'
import Link from 'next/link'

export default function Home() {
  const [videos, setVideos] = useState<Video[]>([])
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [editingVideo, setEditingVideo] = useState<Video | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dynamicCategories, setDynamicCategories] = useState<string[]>([])

  const staticCategories = [
    'All', 'Music', 'Interviews', 'Podcasts', 'Freestyle', 'Off The Porch'
  ]

  // Merge dynamic and static categories to ensure all desired categories are available
  const categories = dynamicCategories.length > 0
    ? ['All', ...new Set([...staticCategories.slice(1), ...dynamicCategories.slice(1)])].sort((a, b) => {
        // Custom sort to maintain preferred order
        const order = ['All', 'Music', 'Interviews', 'Podcasts', 'Freestyle', 'Off The Porch']
        const aIndex = order.indexOf(a)
        const bIndex = order.indexOf(b)
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
        if (aIndex !== -1) return -1
        if (bIndex !== -1) return 1
        return a.localeCompare(b)
      })
    : staticCategories

  // Authentication effect
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      if (!user) {
        signInAnonymously(auth).catch((error) => {
          console.error('Error signing in anonymously:', error)
          toast.error('Authentication failed')
        })
      }
    })

    return () => unsubscribe()
  }, [])

  // Load videos on component mount and auth change
  useEffect(() => {
    if (user) {
      loadVideos()
    }
  }, [user])

  // Filter videos based on search and category
  useEffect(() => {
    filterVideos()
  }, [videos, searchTerm, selectedCategory])

  const loadVideos = async () => {
    setIsLoading(true)
    try {
      const videoList = await getVideos()
      setVideos(videoList)

      // Debug: Log all unique categories in the database
      // Check both category field and tags array for categories
      const categoryFromField = [...new Set(videoList.map(video => video.category))].filter(Boolean)
      const categoriesFromTags = [...new Set(videoList.flatMap(video => video.tags || []))].filter(Boolean)
      const allUniqueCategories = [...new Set([...categoryFromField, ...categoriesFromTags])].filter(Boolean)

      console.log('Categories from category field:', categoryFromField)
      console.log('Categories from tags array:', categoriesFromTags)
      console.log('All unique categories combined:', allUniqueCategories)
      console.log('Static categories in frontend:', staticCategories)

      // Generate dynamic categories from actual video data
      if (allUniqueCategories.length > 0) {
        const dynamicCats = ['All', ...allUniqueCategories.sort()]
        setDynamicCategories(dynamicCats)
        console.log('Dynamic categories from DB:', dynamicCats)

        // Show the merged result
        const mergedCats = ['All', ...new Set([...staticCategories.slice(1), ...allUniqueCategories])].sort((a, b) => {
          const order = ['All', 'Music', 'Interviews', 'Podcasts', 'Freestyle', 'Off The Porch']
          const aIndex = order.indexOf(a)
          const bIndex = order.indexOf(b)
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
          if (aIndex !== -1) return -1
          if (bIndex !== -1) return 1
          return a.localeCompare(b)
        })
        console.log('Final merged categories:', mergedCats)
      }

    } catch (error) {
      console.error('Error loading videos:', error)
      // More descriptive error message for mobile users
      toast.error('Failed to load videos. Please check your internet connection and try again.')
      // Retry mechanism for mobile
      setTimeout(() => {
        if (videos.length === 0 && user) {
          console.log('Retrying video load...')
          loadVideos()
        }
      }, 3000)
    } finally {
      setIsLoading(false)
    }
  }

  const filterVideos = async () => {
    let filtered = videos

    // Filter by category (check both category field and tags array)
    if (selectedCategory !== 'All') {
      filtered = videos.filter(video => {
        // Check if the video's category field matches
        const categoryMatches = video.category === selectedCategory

        // Check if the video's tags array includes the selected category
        const tagsInclude = video.tags && video.tags.includes(selectedCategory)

        // Return true if either matches
        return categoryMatches || tagsInclude
      })
    }

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(video =>
        video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        video.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        video.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    setFilteredVideos(filtered)
  }

  const handleVideoClick = (video: Video) => {
    setSelectedVideo(video)
    setIsPlayerModalOpen(true)
  }


  const handleEditVideo = (video: Video) => {
    setEditingVideo(video)
    setIsFormModalOpen(true)
    setIsPlayerModalOpen(false)
  }

  const handleVideoSaved = () => {
    loadVideos() // Reload videos after save
  }

  const handleVideoDeleted = () => {
    loadVideos() // Reload videos after delete
  }


  const getThumbnailUrl = (video: Video) => {
    if (video.thumbnail) return video.thumbnail

    // Extract YouTube thumbnail
    const videoId = video.videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)?.[1]
    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    }

    return null
  }

  const formatDuration = (duration?: string) => {
    if (!duration) return null

    // Convert ISO 8601 duration (PT4M13S) to readable format (4:13)
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!match) return null

    const hours = match[1] ? parseInt(match[1]) : 0
    const minutes = match[2] ? parseInt(match[2]) : 0
    const seconds = match[3] ? parseInt(match[3]) : 0

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }
  }

  return (
    <div className="min-h-screen relative bg-white">
      {/* SparklesCore Background */}
      <div className="w-full absolute inset-0 h-screen">
        <SparklesCore
          id="tsparticles"
          background="transparent"
          minSize={0.6}
          maxSize={1.4}
          particleDensity={120}
          className="w-full h-full"
          particleColor="#000000"
        />
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/70 via-gray-100/40 to-white/70 pointer-events-none" />

      {/* Digital Serenity Effects */}
      <DigitalSerenityEffects />

      {/* Header */}
      <header className="relative z-10 p-4 animate-blur-in">
        <div className="container mx-auto">
          {/* Mobile-first responsive navigation */}
          <nav className="relative mb-4">
            {/* Mobile Layout: Logo centered, button on right */}
            <div className="flex md:hidden items-center justify-between min-h-[6rem] px-2 relative">
              <div className="w-16"></div> {/* Spacer for balance */}
              <div className="flex-1 flex justify-center items-center">
                <div className="relative bg-white/10 rounded-lg p-1">
                  <img
                    src="/DGB.svg"
                    alt="DIRTYGLOVEBASTARDTV Logo"
                    className="h-20 w-auto max-w-[200px] relative z-50"
                    style={{
                      backgroundColor: 'transparent',
                      display: 'block',
                      minHeight: '80px',
                      minWidth: '80px'
                    }}
                    onLoad={() => console.log('Mobile logo loaded successfully')}
                    onError={(e) => {
                      console.error('Mobile logo failed to load:', e)
                      // Show fallback
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      if (target.nextElementSibling) {
                        (target.nextElementSibling as HTMLElement).style.display = 'flex'
                      }
                    }}
                  />
                  {/* Fallback if logo doesn't load */}
                  <div
                    className="hidden items-center justify-center h-14 w-14 bg-black text-white text-xs font-bold rounded"
                    style={{ minHeight: '56px', minWidth: '56px' }}
                  >
                    DGB
                  </div>
                </div>
              </div>
              <div className="w-16 flex justify-end">
                <Link href="/admin">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/20 border border-gray-200 text-black hover:bg-white/40 backdrop-blur-lg transition-all text-xs"
                  >
                    Admin
                  </Button>
                </Link>
              </div>
            </div>

            {/* Desktop Layout: Logo left, button right */}
            <div className="hidden md:flex items-center justify-between">
              <div className="flex items-center">
                <img
                  src="/DGB.svg"
                  alt="DIRTYGLOVEBASTARDTV Logo"
                  className="h-32 w-auto"
                  style={{ backgroundColor: 'transparent' }}
                />
              </div>
              <div className="flex items-center gap-4">
                <Link href="/admin">
                  <Button
                    variant="outline"
                    className="bg-white/20 border border-gray-200 text-black hover:bg-white/40 backdrop-blur-lg transition-all"
                  >
                    Admin
                  </Button>
                </Link>
              </div>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-1 sm:py-2">
        <div className="text-center py-1 sm:py-2 mb-2.5">
          <div className="flex justify-center">
            <HyperText
              text="Charmaine Directory"
              className="text-3xl sm:text-4xl md:text-6xl font-bold mb-2.5 relative z-20"
              style={{ color: '#000000', textShadow: '0 0 4px rgba(255,255,255,0.8)' }}
            />
          </div>
          <p className="text-lg sm:text-xl font-bold mb-2.5 max-w-2xl mx-auto px-4 relative z-20" style={{ color: '#000000', textShadow: '0 0 4px rgba(255,255,255,0.8)' }}>
            Find the full videos of the clips posted on this page
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-2.5 px-4">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search videos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-12 px-4 pr-12 bg-white/80 backdrop-blur-lg border border-black/30 text-black placeholder:text-gray-500 focus:outline-none focus:border-black focus:shadow-[0_0_20px_rgba(0,0,0,0.3)] transition-all duration-300"
              />
              <button className="absolute right-3 top-1/2 transform -translate-y-1/2 text-black hover:text-gray-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="mb-2.5 animate-fade-in">
          <div className="flex justify-center px-2">
            <div className="flex items-center gap-1 bg-white/20 border border-gray-200 backdrop-blur-lg py-1 px-1 rounded-full shadow-lg overflow-x-auto scrollbar-hide max-w-full">
              {categories.map((category) => {
                const isActive = selectedCategory === category
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className="relative cursor-pointer text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 rounded-full transition-colors text-black/80 hover:text-black whitespace-nowrap flex-shrink-0"
                  >
                    {category}
                    {isActive && (
                      <motion.div
                        layoutId="categoryLamp"
                        className="absolute inset-0 w-full bg-black/10 rounded-full -z-10"
                        initial={false}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 30,
                        }}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Video Grid */}
        <div className="relative z-10 px-1 sm:px-4 animate-fade-in mt-2.5">
          {isLoading ? (
            <div className="text-center py-20">
              <div className="text-black text-xl mb-4">Loading videos...</div>
              <div className="text-black text-sm">If videos don&apos;t load, please check your internet connection</div>
              <Button
                onClick={loadVideos}
                className="mt-4 bg-white/20 border border-gray-200 text-black hover:bg-white/40 backdrop-blur-lg transition-all"
              >
                Retry Loading
              </Button>
            </div>
          ) : filteredVideos.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1">
            {filteredVideos.map((video, index) => (
              <motion.div
                key={video.id}
                className="bg-white/50 border border-gray-200 hover:bg-white/70 transition-all cursor-pointer overflow-hidden rounded-lg"
                onClick={() => handleVideoClick(video)}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.4,
                  delay: index * 0.05,
                  ease: "easeOut"
                }}
                whileHover={{
                  scale: 1.02,
                  transition: { duration: 0.2 }
                }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="relative">
                  {getThumbnailUrl(video) ? (
                    <>
                      <img
                        src={getThumbnailUrl(video)!}
                        alt={video.title}
                        className="aspect-video w-full object-cover bg-black rounded-t-lg"
                      />
                      {formatDuration(video.duration) && (
                        <div className="absolute bottom-1 right-1 bg-black/70 text-white px-1 py-0.5 rounded text-xs font-mono">
                          {formatDuration(video.duration)}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="aspect-video bg-gray-700 flex items-center justify-center rounded-t-lg">
                      <span className="text-gray-400">🎬</span>
                    </div>
                  )}
                </div>
                <div className="px-2 py-1 text-center">
                  <div className="text-sm font-bold line-clamp-1 word-animate leading-tight mb-1" style={{ color: '#000000' }} data-delay="0">
                    {video.title}
                  </div>
                  {formatDuration(video.duration) && (
                    <div className="text-sm font-bold" style={{ color: '#000000' }}>
                      {formatDuration(video.duration)}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
          ) : (
            <div className="text-center py-20">
              <h3 className="text-2xl font-semibold text-black mb-2">
                No videos found
              </h3>
              <p className="text-black mb-4">
                Try adjusting your search or category filter
              </p>
              <p className="text-black mb-4">
                Or try refreshing if videos failed to load
              </p>
              <Button
                onClick={loadVideos}
                className="bg-white/20 border border-gray-200 text-black hover:bg-white/40 backdrop-blur-lg transition-all"
              >
                Refresh Videos
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Video Player Modal */}
      <VideoPlayerModal
        video={selectedVideo}
        open={isPlayerModalOpen}
        onOpenChange={setIsPlayerModalOpen}
        onVideoDeleted={handleVideoDeleted}
        onEditVideo={handleEditVideo}
      />

      {/* Video Form Modal */}
      <VideoForm
        video={editingVideo}
        open={isFormModalOpen}
        onOpenChange={setIsFormModalOpen}
        onVideoSaved={handleVideoSaved}
      />


      {/* Toast Notifications */}
      <Toaster />
    </div>
  )
}
