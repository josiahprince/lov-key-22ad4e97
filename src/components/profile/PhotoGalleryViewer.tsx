import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';

interface UserPhoto {
  id: string;
  photo_url: string;
  photo_slot: number;
  is_main: boolean;
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

  // Filter photos that have URLs
  const validPhotos = photos.filter(photo => photo.photo_url);

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
      setCanScrollPrev(emblaApi.canScrollPrev());
      setCanScrollNext(emblaApi.canScrollNext());
    };

    emblaApi.on('select', onSelect);
    onSelect();

    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi]);

  useEffect(() => {
    if (emblaApi && isOpen) {
      emblaApi.scrollTo(initialIndex);
    }
  }, [emblaApi, initialIndex, isOpen]);

  const scrollPrev = () => emblaApi?.scrollPrev();
  const scrollNext = () => emblaApi?.scrollNext();

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
              {validPhotos.map((photo) => (
                <div key={photo.id} className="flex-[0_0_100%] min-w-0 relative">
                  <div className="flex items-center justify-center h-full p-8">
                    <img
                      src={photo.photo_url}
                      alt={`Photo ${photo.photo_slot}`}
                      className={`max-h-full max-w-full object-contain ${
                        !canViewPhotos ? 'blur-md' : ''
                      }`}
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
