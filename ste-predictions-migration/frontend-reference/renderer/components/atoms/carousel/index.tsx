import { useRef, useState } from "react";

export type ImageItem = {
  id: string | number;
  url: string;
  alt?: string;
};

type CarouselProps = {
  images: ImageItem[]; 
};

export default function Carousel({
  images,
}: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const startX = useRef<number | null>(null);

  const next = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prev = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? images.length - 1 : prev - 1
    );
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    const x = "touches" in e ? e.touches[0].clientX : e.clientX;
    startX.current = x;
  };

  const handleDragEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (startX.current === null) return;

    const endX = "touches" in e ? e.changedTouches[0].clientX : e.clientX;
    const diff = startX.current - endX;

    if (diff > 50) next();
    if (diff < -50) prev();

    startX.current = null;
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      {/* Área arrastável */}
      <div
        onMouseDown={handleDragStart}
        onMouseUp={handleDragEnd}
        onTouchStart={handleDragStart}
        onTouchEnd={handleDragEnd}
        className="w-full h-full overflow-hidden flex items-center justify-center cursor-grab"
      >
        <img
          key={images[currentIndex].id}
          src={images[currentIndex].url}
          alt={images[currentIndex].alt || "imagem"}
          className="max-w-full max-h-full object-contain select-none pointer-events-none 
                     opacity-0 animate-fadeIn"
        />
      </div>

      <button
        onClick={prev}
        className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/50"
       >
        <img src="../images/icons/arrowLeft.svg" className="w-8 h-8" />
      </button>

      <button
        onClick={next}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/50"
      >
        <img src="../images/icons/arrowRight.svg" className="w-8 h-8" />
      </button>

      <div className="flex gap-2 mt-4">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-3 h-3 rounded-full transition-all 
              ${index === currentIndex ? "bg-white scale-125" : "bg-white/40"}
            `}
          />
        ))}
      </div>
    </div>
  );
}
