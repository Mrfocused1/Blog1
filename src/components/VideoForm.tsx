'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Video, addVideo, updateVideo, getYouTubeVideoData, extractVideoId } from '@/lib/database'
import { toast } from 'sonner'

interface VideoFormProps {
  video?: Video | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onVideoSaved?: () => void
}

const categories = [
  'All', 'Music', 'Interviews', 'Podcasts', 'Freestyle', 'Off The Porch'
]

const detectCategoriesFromContent = (title: string, description: string): string[] => {
  const content = `${title} ${description}`.toLowerCase()
  const detectedCategories: string[] = []

  if (content.includes('music') || content.includes('song') || content.includes('album') || content.includes('artist') || content.includes('beat') || content.includes('track')) {
    detectedCategories.push('Music')
  }
  if (content.includes('interview') || content.includes('conversation') || content.includes('talk') || content.includes('discussion')) {
    detectedCategories.push('Interviews')
  }
  if (content.includes('podcast') || content.includes('episode') || content.includes('show')) {
    detectedCategories.push('Podcasts')
  }
  if (content.includes('freestyle') || content.includes('cypher') || content.includes('bars') || content.includes('rap') || content.includes('flow')) {
    detectedCategories.push('Freestyle')
  }
  if (content.includes('off the porch') || content.includes('porch') || content.includes('street') || content.includes('hood')) {
    detectedCategories.push('Off The Porch')
  }

  return detectedCategories.length > 0 ? detectedCategories : ['Music']
}

export default function VideoForm({ video, open, onOpenChange, onVideoSaved }: VideoFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    videoUrl: '',
    category: '',
    tags: [] as string[],
    thumbnail: ''
  })
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingYouTube, setIsLoadingYouTube] = useState(false)

  const clearFormData = () => {
    setFormData({
      title: '',
      description: '',
      videoUrl: '',
      category: 'All',
      tags: ['All'],
      thumbnail: ''
    })
    setSelectedCategories(['All'])
  }

  useEffect(() => {
    if (video) {
      setFormData({
        title: video.title || '',
        description: video.description || '',
        videoUrl: video.videoUrl || '',
        category: video.category || 'All',
        tags: video.tags || ['All'],
        thumbnail: video.thumbnail || ''
      })
      setSelectedCategories(video.tags || ['All'])
    } else {
      setFormData({
        title: '',
        description: '',
        videoUrl: '',
        category: 'All',
        tags: ['All'],
        thumbnail: ''
      })
      setSelectedCategories(['All'])
    }
  }, [video])

  const handleYouTubeUrlChange = async (url: string) => {
    setFormData(prev => ({ ...prev, videoUrl: url }))

    const videoId = extractVideoId(url)
    if (videoId) {
      setIsLoadingYouTube(true)
      try {
        const youtubeData = await getYouTubeVideoData(videoId)
        if (youtubeData) {
          // Try to auto-detect category based on video title/description
          const autoCategories = detectCategoriesFromContent(youtubeData.title, youtubeData.description)

          setFormData(prev => ({
            ...prev,
            title: prev.title || youtubeData.title,
            description: prev.description || youtubeData.description.slice(0, 500),
            thumbnail: youtubeData.thumbnail,
            category: autoCategories.length > 0 ? autoCategories[0] : 'All',
            tags: autoCategories.length > 0 ? autoCategories : ['All']
          }))
          setSelectedCategories(autoCategories.length > 0 ? autoCategories : ['All'])
          toast.success('YouTube video data loaded automatically')
        }
      } catch (error) {
        console.error('Error loading YouTube data:', error)
      } finally {
        setIsLoadingYouTube(false)
      }
    }
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title || !formData.videoUrl || selectedCategories.length === 0) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsLoading(true)
    try {
      if (video?.id) {
        // Update existing video
        await updateVideo(video.id, formData)
        toast.success('Video updated successfully')
      } else {
        // Add new video with selected categories
        await addVideo({
          ...formData,
          tags: selectedCategories
        })
        toast.success('Video added successfully')
      }
      onVideoSaved?.()
      onOpenChange(false)
    } catch (error) {
      toast.error(video?.id ? 'Failed to update video' : 'Failed to add video')
      console.error('Error saving video:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && !video) {
      // Clear form data when closing if it's a new video (not editing)
      clearFormData()
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl w-full bg-white border-gray-200 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-black text-2xl">
            {video ? 'Edit Video' : 'Add New Video'}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {video ? 'Update video information' : 'Add a new video to the directory'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="videoUrl" className="text-black">
              Video URL * {isLoadingYouTube && <span className="text-blue-600">(Loading YouTube data...)</span>}
            </Label>
            <Input
              id="videoUrl"
              value={formData.videoUrl}
              onChange={(e) => handleYouTubeUrlChange(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="bg-white border-gray-300 text-black placeholder:text-gray-500"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title" className="text-black">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter video title"
              className="bg-white border-gray-300 text-black placeholder:text-gray-500"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-black">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter video description"
              className="bg-white border-gray-300 text-black placeholder:text-gray-500 min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-black">Categories * (Select all that apply)</Label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map((category) => (
                <div key={category} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={category}
                    checked={selectedCategories.includes(category)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const newCategories = [...selectedCategories, category]
                        setSelectedCategories(newCategories)
                        setFormData(prev => ({
                          ...prev,
                          category: newCategories[0] || 'All',
                          tags: newCategories
                        }))
                      } else {
                        const newCategories = selectedCategories.filter(c => c !== category)
                        if (newCategories.length === 0) {
                          newCategories.push('All')
                        }
                        setSelectedCategories(newCategories)
                        setFormData(prev => ({
                          ...prev,
                          category: newCategories[0] || 'All',
                          tags: newCategories
                        }))
                      }
                    }}
                    className="w-4 h-4 text-black bg-gray-100 border-gray-300 rounded focus:ring-black"
                  />
                  <label htmlFor={category} className="text-sm text-black cursor-pointer">
                    {category}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-black">Selected Categories</Label>
            <div className="flex flex-wrap gap-2">
              {selectedCategories.map((category) => (
                <Badge
                  key={category}
                  variant="outline"
                  className="bg-gray-100 border-gray-300 text-black"
                >
                  {category}
                </Badge>
              ))}
              {selectedCategories.length === 0 && (
                <p className="text-gray-500 text-sm">Select categories above</p>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={clearFormData}
              disabled={isLoading}
              className="bg-white/20 border border-gray-200 text-black hover:bg-white/40 backdrop-blur-lg"
            >
              Clear Data
            </Button>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="border-gray-300 text-black hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || isLoadingYouTube}
                className="bg-white/20 border border-gray-200 text-black hover:bg-white/40 backdrop-blur-lg"
              >
                {isLoading ? 'Saving...' : video ? 'Update Video' : 'Add Video'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}