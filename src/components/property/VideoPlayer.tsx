import { useState } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoPlayerProps {
  url: string;
  thumbnail?: string;
}

export const VideoPlayer = ({ url, thumbnail }: VideoPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);

  if (!isPlaying) {
    return (
      <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden group cursor-pointer">
        {thumbnail && (
          <img
            src={thumbnail}
            alt="Video thumbnail"
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/50 transition-colors">
          <Button
            size="lg"
            onClick={() => setIsPlaying(true)}
            className="rounded-full w-20 h-20"
          >
            <Play className="h-8 w-8 fill-current" />
          </Button>
        </div>
      </div>
    );
  }

  // Check if it's a YouTube or Vimeo URL
  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
  const isVimeo = url.includes('vimeo.com');

  if (isYouTube || isVimeo) {
    let embedUrl = url;
    if (isYouTube) {
      const videoId = url.includes('youtu.be') 
        ? url.split('youtu.be/')[1]?.split('?')[0]
        : url.split('v=')[1]?.split('&')[0];
      embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    } else if (isVimeo) {
      const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
      embedUrl = `https://player.vimeo.com/video/${videoId}?autoplay=1`;
    }

    return (
      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
        <iframe
          src={embedUrl}
          className="w-full h-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
      <video
        src={url}
        className="w-full h-full"
        controls
        autoPlay
      />
    </div>
  );
};
