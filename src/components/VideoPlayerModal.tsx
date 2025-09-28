'use client'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { Video } from '@/lib/database'

interface VideoPlayerModalProps {
  video: Video | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onVideoDeleted?: () => void
  onEditVideo?: (video: Video) => void
}

export default function VideoPlayerModal({
  video,
  open,
  onOpenChange,
  onVideoDeleted,
  onEditVideo
}: VideoPlayerModalProps) {
  if (!video) return null

  const getEmbedUrl = (url: string) => {
    // Convert YouTube URL to embed URL
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)?.[1]
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`
    }
    return url
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full bg-white border-gray-200 p-0">
        <VisuallyHidden>
          <DialogTitle>{video.title}</DialogTitle>
        </VisuallyHidden>
        {/* Video Player */}
        <div className="aspect-video w-full">
          <iframe
            src={getEmbedUrl(video.videoUrl)}
            title={video.title}
            className="w-full h-full rounded-lg"
            allowFullScreen
            frameBorder="0"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}