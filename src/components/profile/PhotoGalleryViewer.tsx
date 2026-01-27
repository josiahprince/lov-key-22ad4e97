import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useState, useRef, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';

interface UserPhoto {
  id: string;
  photo_url: string;
  photo_slot: number;
  is_main: boolean;
  signedUrl?: string;
  canViewUnblurred?: boolean;
}

interface PhotoGalleryViewerProps {
  photos: UserPhoto[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  canViewPhotos?: boolean;
}

const PhotoGalleryViewer = ({ 
  photos, 
  initialIndex = 0, 
  isOpen, 
  onClose,
  canViewPhotos = true 
}: PhotoGalleryViewerProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, startIndex: initialIndex });
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  
  // Zoom state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef({ x: 0, y: 0, distance: 0 });
  const lastTapRef = useRef(0);

  // Filter photos that have URLs (use signedUrl if available, fall back to photo_url)
  const validPhotos = photos.filter(photo => photo.signedUrl || photo.photo_url);
  
  // Reset zoom when changing slides
  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
      setCanScrollPrev(emblaApi.canScrollPrev());
      setCanScrollNext(emblaApi.canScrollNext());
      resetZoom();
    };

    emblaApi.on('select', onSelect);
    onSelect();

    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, resetZoom]);

  useEffect(() => {
    if (emblaApi && isOpen) {
      emblaApi.scrollTo(initialIndex);
    }
  }, [emblaApi, initialIndex, isOpen]);

  const scrollPrev = () => {
    if (scale === 1) emblaApi?.scrollPrev();
  };
  
  const scrollNext = () => {
    if (scale === 1) emblaApi?.scrollNext();
  };

  // Double tap to zoom
  const handleDoubleTap = useCallback(() => {
    if (scale > 1) {
      resetZoom();
    } else {
      setScale(2);
    }
  }, [scale, resetZoom]);

  // Touch handlers for pinch-to-zoom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Single touch - check for double tap
      const now = Date.now();
      const timeSinceLastTap = now - lastTapRef.current;
      
      if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
        handleDoubleTap();
      }
      lastTapRef.current = now;
      
      // Start drag if zoomed
      if (scale > 1) {
        setIsDragging(true);
        touchStartRef.current = {
          x: e.touches[0].clientX - position.x,
          y: e.touches[0].clientY - position.y,
          distance: 0
        };
      }
    } else if (e.touches.length === 2) {
      // Pinch gesture
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartRef.current = { x: 0, y: 0, distance };
    }
  }, [scale, position, handleDoubleTap]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartRef.current.distance) {
      // Pinch zoom
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const newScale = Math.min(Math.max((distance / touchStartRef.current.distance) * scale, 1), 4);
      setScale(newScale);
      
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      // Pan when zoomed
      e.preventDefault();
      const newX = e.touches[0].clientX - touchStartRef.current.x;
      const newY = e.touches[0].clientY - touchStartRef.current.y;
      setPosition({ x: newX, y: newY });
    }
  }, [scale, isDragging]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    touchStartRef.current = { x: 0, y: 0, distance: 0 };
  }, []);

  if (validPhotos.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full p-0 bg-black border-none">
        <div className="relative w-full h-[80vh]">
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white rounded-full"
            onClick={onClose}
          >
            <X className="w-6 h-6" />
          </Button>

          {/* Carousel */}
          <div className="overflow-hidden h-full" ref={emblaRef}>
            <div className="flex h-full">
              {validPhotos.map((photo, index) => (
                <div key={photo.id} className="flex-[0_0_100%] min-w-0 relative">
                  <div 
                    ref={index === selectedIndex ? imageRef : null}
                    className="flex items-center justify-center h-full p-8 touch-none"
                    onTouchStart={index === selectedIndex ? handleTouchStart : undefined}
                    onTouchMove={index === selectedIndex ? handleTouchMove : undefined}
                    onTouchEnd={index === selectedIndex ? handleTouchEnd : undefined}
                    style={{
                      cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
                    }}
                  >
                    <img
                      src={photo.signedUrl || photo.photo_url}
                      alt={`Photo ${photo.photo_slot}`}
                      className={`max-h-full max-w-full object-contain transition-transform ${
                        !canViewPhotos && !photo.canViewUnblurred ? 'blur-md' : ''
                      }`}
                      style={{
                        transform: index === selectedIndex ? `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)` : 'none',
                        transformOrigin: 'center center'
                      }}
                      draggable={false}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Arrows */}
          {validPhotos.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-40 bg-black/50 hover:bg-black/70 text-white rounded-full disabled:opacity-30"
                onClick={scrollPrev}
                disabled={!canScrollPrev}
              >
                <ChevronLeft className="w-8 h-8" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-40 bg-black/50 hover:bg-black/70 text-white rounded-full disabled:opacity-30"
                onClick={scrollNext}
                disabled={!canScrollNext}
              >
                <ChevronRight className="w-8 h-8" />
              </Button>
            </>
          )}

          {/* Photo Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
            {selectedIndex + 1} / {validPhotos.length}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PhotoGalleryViewer;
