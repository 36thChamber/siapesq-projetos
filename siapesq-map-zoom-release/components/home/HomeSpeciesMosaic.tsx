"use client";

import { useEffect, useState } from "react";
import { usePlatformTheme } from "@/context/PlatformThemeContext";
import type { GalleryImage } from "@/components/ImageGallery";

type Props = { images: GalleryImage[]; autoPlay?: boolean };
const THUMBNAIL_COUNT = 7;

export default function HomeSpeciesMosaic({ images, autoPlay = true }: Props) {
  const { theme } = usePlatformTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const onMotionChange = () => setReducedMotion(media?.matches ?? false);
    const onVisibilityChange = () => setVisible(!document.hidden);
    onMotionChange();
    onVisibilityChange();
    media?.addEventListener("change", onMotionChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      media?.removeEventListener("change", onMotionChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!autoPlay || images.length < 2 || paused || !visible) return;
    const timer = window.setTimeout(() => setActiveIndex((index) => (index + 1) % images.length), 5000);
    return () => window.clearTimeout(timer);
  }, [activeIndex, autoPlay, images.length, paused, visible]);

  const firstImageSrc = images[0]?.src;

  useEffect(() => setActiveIndex(0), [firstImageSrc]);

  if (!images.length) return null;
  const current = images[activeIndex % images.length];
  const thumbs = Array.from({ length: Math.min(THUMBNAIL_COUNT, images.length - 1) }, (_, offset) => {
    const index = (activeIndex + offset + 1) % images.length;
    return { image: images[index], index };
  });

  return (
    <div
      className="mx-auto grid w-[75%] min-w-0 grid-cols-4 grid-rows-4 gap-2 aspect-square"
      role="region"
      aria-label="Espécies monitoradas"
      aria-roledescription="mosaico de imagens"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <div
        key={current.src}
        className={`relative col-span-3 row-span-3 min-h-0 min-w-0 overflow-hidden rounded-xl shadow-lg ${reducedMotion ? "" : "animate-[galleryFade_500ms_ease-in-out]"}`}
        style={{ border: `2px solid ${theme.colors.primary[500]}` }}
      >
        <img src={current.src} alt={current.alt} className="h-full w-full object-cover" />
        {current.caption && (
          <span className="absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate rounded-full bg-black/55 px-3 py-1 text-sm italic text-white">
            {current.caption}
          </span>
        )}
        <span className="sr-only" aria-live="polite">{`Imagem ${activeIndex + 1} de ${images.length}: ${current.alt}`}</span>
      </div>
      {thumbs.map(({ image, index }) => (
        <button
          key={`${image.src}-${index}`}
          type="button"
          onClick={() => setActiveIndex(index)}
          aria-label={`Selecionar imagem: ${image.alt}`}
          aria-current={false}
          className="aspect-square h-full w-full min-h-0 min-w-0 overflow-hidden rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ border: `2px solid ${theme.colors.gray[200]}`, outlineColor: theme.colors.primary[500] }}
        >
          <img src={image.src} alt={`Miniatura: ${image.caption ?? image.alt}`} className="h-full w-full object-cover" />
        </button>
      ))}
    </div>
  );
}
