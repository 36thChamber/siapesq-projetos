"use client";

import { useEffect, useState, type FocusEvent, type KeyboardEvent } from "react";
import { usePlatformTheme } from "@/context/PlatformThemeContext";

export type GalleryImage = {
  src: string;
  alt: string;
  caption?: string;
};

type ImageGalleryProps = {
  images: GalleryImage[];
  ariaLabel: string;
  mainClassName?: string;
  showArrows?: boolean;
  autoPlay?: boolean;
  thumbnailAlt?: (image: GalleryImage, index: number) => string;
  onMainImageClick?: (index: number) => void;
};

export default function ImageGallery({
  images,
  ariaLabel,
  mainClassName = "h-[280px] sm:h-[380px] lg:h-[460px]",
  showArrows = false,
  autoPlay = false,
  thumbnailAlt = (image) => image.alt,
  onMainImageClick,
}: ImageGalleryProps) {
  const { theme } = usePlatformTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [failedSrcs, setFailedSrcs] = useState<Set<string>>(() => new Set());
  const firstSrc = images[0]?.src;
  const [prevFirstSrc, setPrevFirstSrc] = useState(firstSrc);

  // Volta à primeira imagem quando a lista muda. Feito durante o render (e
  // não num useEffect) para não sobrescrever um clique feito logo após a
  // montagem, já que o efeito rodaria depois desse clique.
  if (firstSrc !== prevFirstSrc) {
    setPrevFirstSrc(firstSrc);
    setActiveIndex(0);
  }

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(media?.matches ?? false);
    const updateVisibility = () => setIsDocumentVisible(!document.hidden);
    updateMotion();
    updateVisibility();
    media?.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      media?.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (!autoPlay || images.length < 2 || isHovered || !isDocumentVisible) return;
    const timer = window.setTimeout(() => {
      setActiveIndex((index) => (index + 1) % images.length);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [activeIndex, autoPlay, images.length, isHovered, isDocumentVisible]);

  // Pré-carrega as imagens para a troca de destaque ser instantânea, sem
  // manter a foto anterior visível enquanto a nova baixa.
  useEffect(() => {
    images.forEach(({ src }) => {
      const img = new window.Image();
      img.src = src;
    });
  }, [images]);

  if (images.length === 0) return null;

  const total = images.length;
  const safeIndex = Math.min(activeIndex, total - 1);
  const current = images[safeIndex];
  const currentFailed = failedSrcs.has(current.src);
  const hasMultiple = total > 1;

  const goTo = (index: number) => setActiveIndex((index + total) % total);
  const markFailed = (src: string) =>
    setFailedSrcs((prev) => new Set(prev).add(src));

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!hasMultiple) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(safeIndex + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(safeIndex - 1);
    }
  };

  const mainImage = currentFailed ? (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ backgroundColor: theme.colors.gray[100] }}
    >
      <p style={{ color: theme.colors.muted }}>Imagem indisponível.</p>
    </div>
  ) : (
    <img
      src={current.src}
      alt={current.alt}
      className="w-full h-full object-cover"
      onError={() => markFailed(current.src)}
    />
  );

  return (
    <div
      className="flex flex-col gap-3 min-w-0 w-full"
      role="region"
      aria-roledescription="galeria"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={(event: FocusEvent<HTMLDivElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsHovered(false);
      }}
    >
      <div
        className={`relative w-full rounded-xl overflow-hidden shadow-lg ${mainClassName}`}
      >
        <div key={current.src} className={`h-full w-full ${reducedMotion ? "" : "animate-[galleryFade_500ms_ease-in-out]"}`}>
        {onMainImageClick ? (
          <button
            type="button"
            className="block w-full h-full cursor-pointer"
            onClick={() => onMainImageClick(safeIndex)}
            aria-label={`Ampliar imagem: ${current.alt}`}
          >
            {mainImage}
          </button>
        ) : (
          mainImage
        )}

        {current.caption && (
          <span className="absolute left-3 bottom-3 max-w-[calc(100%-1.5rem)] truncate px-3 py-1 rounded-full bg-black/55 text-white text-sm italic pointer-events-none">
            {current.caption}
          </span>
        )}

        {showArrows && hasMultiple && (
          <>
            <button
              type="button"
              onClick={() => goTo(safeIndex - 1)}
              aria-label="Imagem anterior"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white text-2xl flex items-center justify-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => goTo(safeIndex + 1)}
              aria-label="Próxima imagem"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white text-2xl flex items-center justify-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              ›
            </button>
          </>
        )}

        </div>
        {hasMultiple && (
          <span className="sr-only" aria-live="polite">
            {`Imagem ${safeIndex + 1} de ${total}: ${current.alt}`}
          </span>
        )}
      </div>

      {hasMultiple && (
        <div className="grid w-full grid-flow-col auto-cols-[56px] sm:auto-cols-[64px] gap-2 overflow-x-auto py-1 scrollbar-thin">
          {images.map((image, i) => {
            const isActive = i === safeIndex;
            return (
              <button
                key={`${image.src}-${i}`}
                type="button"
                onClick={() => goTo(i)}
                aria-current={isActive}
                className="aspect-square w-full min-w-0 overflow-hidden rounded-lg transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  border: `2px solid ${isActive ? theme.colors.primary[500] : theme.colors.gray[200]}`,
                  opacity: isActive ? 1 : 0.7,
                  outlineColor: theme.colors.primary[500],
                }}
              >
                <img
                  src={image.src}
                  alt={thumbnailAlt(image, i)}
                  className="h-full w-full object-cover"
                  onError={() => markFailed(image.src)}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
