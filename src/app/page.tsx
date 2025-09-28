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

  const categories = [
    'All', 'Music', 'Podcasts', 'Sports', 'News', 'Education',
    'Entertainment', 'Lifestyle', 'Documentaries', 'Interviews', 'Comedy', 'Vlogs'
  ]

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
    } catch (error) {
      console.error('Error loading videos:', error)
      toast.error('Failed to load videos')
    } finally {
      setIsLoading(false)
    }
  }

  const filterVideos = async () => {
    let filtered = videos

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = videos.filter(video => video.category === selectedCategory)
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
          <nav className="flex items-center justify-end mb-4">
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
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-1 sm:py-2">
        <div className="text-center py-1 sm:py-2 mb-2.5">
          <div className="flex justify-center">
            <HyperText
              text="LiveByTheRules"
              className="text-3xl sm:text-4xl md:text-6xl font-bold mb-2.5 relative z-20"
              style={{ color: '#16a34a', textShadow: '0 0 4px rgba(255,255,255,0.8)' }}
            />
          </div>
          <p className="text-lg sm:text-xl mb-2.5 max-w-2xl mx-auto px-4 relative z-20" style={{ color: '#000000', textShadow: '0 0 4px rgba(255,255,255,0.8)' }}>
            Find the full videos of the clips posted on the page
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-2.5 px-4">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search videos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-12 px-4 pr-12 bg-white/80 backdrop-blur-lg border border-green-600/30 text-black placeholder:text-gray-500 focus:outline-none focus:border-green-600 focus:shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all duration-300"
              />
              <button className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-600 hover:text-green-400 transition-colors">
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
          <div className="flex justify-center">
            <div className="flex items-center gap-1 bg-white/20 border border-gray-200 backdrop-blur-lg py-1 px-1 rounded-full shadow-lg overflow-x-auto scrollbar-hide">
              {categories.map((category) => {
                const isActive = selectedCategory === category
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className="relative cursor-pointer text-sm font-semibold px-4 py-2 rounded-full transition-colors text-black/80 hover:text-green-600 whitespace-nowrap flex-shrink-0"
                  >
                    {category}
                    {isActive && (
                      <motion.div
                        layoutId="categoryLamp"
                        className="absolute inset-0 w-full bg-green-600/10 rounded-full -z-10"
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
              <div className="text-black text-xl">Loading videos...</div>
            </div>
          ) : filteredVideos.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1">
            {filteredVideos.map((video) => (
              <div
                key={video.id}
                className="bg-white/50 border border-gray-200 hover:bg-white/70 transition-all cursor-pointer overflow-hidden rounded-lg"
                onClick={() => handleVideoClick(video)}
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
              </div>
            ))}
          </div>
          ) : (
            <div className="text-center py-20">
              <h3 className="text-2xl font-semibold text-black mb-2">
                No videos found
              </h3>
              <p className="text-black">
                Try adjusting your search or category filter
              </p>
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
