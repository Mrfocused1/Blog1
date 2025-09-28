'use client'

import { useState, useEffect } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Toaster } from '@/components/ui/sonner'
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { Video, getVideos, deleteVideo, updateVideoSortOrder } from '@/lib/database'
import { SparklesCore } from '@/components/ui/sparkles-core'
import VideoPlayerModal from '@/components/VideoPlayerModal'
import VideoForm from '@/components/VideoForm'
import DigitalSerenityEffects from '@/components/DigitalSerenityEffects'
import { toast } from 'sonner'
import Link from 'next/link'

function SortableVideoCard({ video, onVideoClick, onEditVideo, onDeleteVideo, getThumbnailUrl }: {
  video: Video
  onVideoClick: (video: Video) => void
  onEditVideo: (video: Video) => void
  onDeleteVideo: (video: Video) => Promise<void>
  getThumbnailUrl: (video: Video) => string | null
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: video.id || '' })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white/50 border border-gray-200 hover:bg-white/70 transition-all cursor-pointer overflow-hidden rounded-lg ${isDragging ? 'opacity-50 rotate-3 scale-105 z-50' : ''}`}
      onClick={() => onVideoClick(video)}
      {...attributes}
    >
      <div className="relative">
        {getThumbnailUrl(video) ? (
          <img
            src={getThumbnailUrl(video)!}
            alt={video.title}
            className="aspect-video w-full object-cover bg-black rounded-t-lg"
          />
        ) : (
          <div className="aspect-video bg-gray-700 flex items-center justify-center rounded-t-lg">
            <span className="text-gray-400">🎬</span>
          </div>
        )}
      </div>
      <div className="px-2 py-1 text-center">
        <div className="mb-1">
          <div className="text-sm font-bold line-clamp-1 word-animate leading-tight" style={{ color: '#000000' }} data-delay="0">
            {video.title}
          </div>
          <div
            {...listeners}
            className="ml-1 p-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 touch-none"
            onClick={(e) => e.stopPropagation()}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="6" r="2"/>
              <circle cx="5" cy="12" r="2"/>
              <circle cx="5" cy="18" r="2"/>
              <circle cx="19" cy="6" r="2"/>
              <circle cx="19" cy="12" r="2"/>
              <circle cx="19" cy="18" r="2"/>
            </svg>
          </div>
          {video.duration && (
            <div className="text-sm font-bold mt-1" style={{ color: '#000000' }}>
              {video.duration}
            </div>
          )}
        </div>
        <div className="flex justify-center mb-0.5">
          <span className="text-xs leading-tight" style={{ color: '#000000' }}>
            {video.createdAt?.toDate().toLocaleDateString()}
          </span>
        </div>

        {/* Admin Actions */}
        <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
          <Button
            onClick={() => onEditVideo(video)}
            size="sm"
            className="flex-1 bg-white/20 border border-gray-200 hover:bg-white/40 backdrop-blur-lg text-xs py-0 h-6" style={{ color: '#000000' }}
          >
            Edit
          </Button>
          <Button
            onClick={() => onDeleteVideo(video)}
            size="sm"
            className="flex-1 bg-white/20 border border-gray-200 hover:bg-white/40 backdrop-blur-lg text-xs py-0 h-6" style={{ color: '#000000' }}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [editingVideo, setEditingVideo] = useState<Video | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 8,
      },
    })
  )

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

  // Filter videos based on search
  useEffect(() => {
    filterVideos()
  }, [videos, searchTerm])

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

  const handleAddVideo = () => {
    setEditingVideo(null)
    setIsFormModalOpen(true)
  }

  const handleEditVideo = (video: Video) => {
    setEditingVideo(video)
    setIsFormModalOpen(true)
    setIsPlayerModalOpen(false)
  }

  const handleDeleteVideo = async (video: Video) => {
    if (!video.id) return

    const confirmed = window.confirm(`Are you sure you want to delete "${video.title}"?`)
    if (!confirmed) return

    try {
      await deleteVideo(video.id)
      toast.success('Video deleted successfully')
      loadVideos()
    } catch (error) {
      toast.error('Failed to delete video')
      console.error('Error deleting video:', error)
    }
  }

  const handleVideoSaved = () => {
    loadVideos() // Reload videos after save
  }

  const handleVideoDeleted = () => {
    loadVideos() // Reload videos after delete
  }


  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = filteredVideos.findIndex((video) => video.id === active.id)
    const newIndex = filteredVideos.findIndex((video) => video.id === over.id)

    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    const reorderedVideos = arrayMove(filteredVideos, oldIndex, newIndex)

    // Update local state immediately for responsive UI
    setFilteredVideos(reorderedVideos)

    // Update main videos array
    setVideos((prevVideos) => {
      const mainOldIndex = prevVideos.findIndex((video) => video.id === active.id)
      const mainNewIndex = prevVideos.findIndex((video) => video.id === over.id)

      if (mainOldIndex === -1 || mainNewIndex === -1) {
        return prevVideos
      }

      const reorderedMainVideos = arrayMove(prevVideos, mainOldIndex, mainNewIndex)

      // Save the new order to database
      updateVideoSortOrder(reorderedMainVideos).catch((error) => {
        console.error('Error updating video sort order:', error)
        toast.error('Failed to save video order')
      })

      return reorderedMainVideos
    })

    toast.success('Video order updated')
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

  return (
    <div className="min-h-screen relative bg-white">
      {/* SparklesCore Background */}
      <div className="w-full absolute inset-0 h-screen">
        <SparklesCore
          id="admin-particles"
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
              <Link href="/">
                <Button
                  variant="outline"
                  className="bg-green-100 border-green-300 text-black hover:bg-green-200"
                >
                  ← Back to Site
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-1 sm:py-2">
        <div className="text-center py-1 sm:py-2 mb-2.5">
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-2.5 relative z-20" style={{ color: '#16a34a', textShadow: '0 0 4px rgba(255,255,255,0.8)' }}>
            LiveByTheRules Admin
          </h1>
          <p className="text-lg sm:text-xl mb-2.5 max-w-2xl mx-auto px-4 relative z-20" style={{ color: '#000000', textShadow: '0 0 4px rgba(255,255,255,0.8)' }}>
            Manage your video directory
          </p>

          {/* Search Bar with Add Video Button */}
          <div className="max-w-2xl mx-auto mb-2.5 px-4">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search videos to manage..."
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
            <div className="mt-2.5 relative z-50">
              <Button
                onClick={handleAddVideo}
                className="w-full bg-white/20 border border-gray-200 text-black hover:bg-white/40 backdrop-blur-lg transition-all relative z-50 pointer-events-auto"
              >
                Add Video
              </Button>
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
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filteredVideos.map(v => v.id || '')}
                strategy={verticalListSortingStrategy}
              >
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1">
                  {filteredVideos.map((video) => (
                    <SortableVideoCard
                      key={video.id}
                      video={video}
                      onVideoClick={handleVideoClick}
                      onEditVideo={handleEditVideo}
                      onDeleteVideo={handleDeleteVideo}
                      getThumbnailUrl={getThumbnailUrl}
                    />
                  ))}
                </div>
              </SortableContext>
              <DragOverlay>
                {activeId ? (
                  <div className="transform rotate-3 opacity-90">
                    <div className="bg-white/50 border border-gray-200 rounded-lg overflow-hidden">
                      <div className="relative">
                        {getThumbnailUrl(filteredVideos.find(v => v.id === activeId)!) ? (
                          <img
                            src={getThumbnailUrl(filteredVideos.find(v => v.id === activeId)!)!}
                            alt={filteredVideos.find(v => v.id === activeId)!.title}
                            className="aspect-video w-full object-cover bg-black rounded-t-lg"
                          />
                        ) : (
                          <div className="aspect-video bg-gray-700 flex items-center justify-center rounded-t-lg">
                            <span className="text-gray-400">🎬</span>
                          </div>
                        )}
                      </div>
                      <div className="px-2 py-1 text-center">
                        <div className="text-sm font-bold line-clamp-1 leading-tight" style={{ color: '#000000' }}>
                          {filteredVideos.find(v => v.id === activeId)!.title}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          ) : (
            <div className="text-center py-20">
              <h3 className="text-2xl font-semibold mb-2" style={{ color: '#000000' }}>
                {searchTerm ? 'No videos found' : 'No videos yet'}
              </h3>
              <p className="mb-6" style={{ color: '#000000' }}>
                {searchTerm
                  ? 'Try adjusting your search terms'
                  : 'Add your first video to get started!'}
              </p>
              <Button onClick={handleAddVideo} className="bg-white/20 border border-gray-200 hover:bg-white/40 backdrop-blur-lg transition-all" style={{ color: '#000000' }}>
                Add First Video
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