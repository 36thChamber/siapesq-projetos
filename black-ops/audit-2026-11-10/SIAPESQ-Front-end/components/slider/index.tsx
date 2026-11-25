"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useSlider } from "@/hook/useSlider";

export type SliderImage = {
  src: string;
  alt: string;
};

type SliderProps = {
  images?: SliderImage[];
  variant?: "species" | "hero";
  autoMove?: boolean;
  itemClassName?: string;
  imageClassName?: string;
  mapSrc?: string;
};

function HeroImage({ src, alt, mapSrc }: SliderImage & { mapSrc?: string }) {
  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-xl">
      <img
        src={src}
        alt={alt}
        className="w-full h-[280px] sm:h-[380px] lg:h-[460px] object-cover block"
      />
      {mapSrc && (
        <img
          src={mapSrc}
          alt=""
          aria-hidden="true"
          className="absolute bottom-3 right-3 w-16 sm:w-20 opacity-40 pointer-events-none select-none"
        />
      )}
    </div>
  );
}

function SpeciesSlider({ itemClassName }: { itemClassName?: string }) {
  const { sliderRef, species } = useSlider();

  return (
    <div ref={sliderRef} className="slider">
      {species
        .filter((res) => res.gbifImage)
        .map((res) => (
          <div
            key={res.nome_cientifico}
            className={itemClassName ?? "slider-item"}
            style={{ flex: "0 0 auto", width: 300, height: 250, position: "relative" }}
          >
            <Image
              src={res.gbifImage}
              alt={res.nome_cientifico}
              fill
              unoptimized
              style={{ objectFit: "cover", borderRadius: "4px" }}
              sizes="(max-width: 768px) 100vw, 300px"
            />
          </div>
        ))}
    </div>
  );
}

function HeroSpeciesSlider() {
  const { species } = useSlider();
  const [index, setIndex] = useState(0);
  const filtered = species.filter((s) => s.gbifImage);

  useEffect(() => {
    if (!filtered.length) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % filtered.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [filtered.length]);

  if (!filtered.length) {
    return <div className="w-full h-[280px] sm:h-[380px] lg:h-[460px] rounded-2xl bg-gray-100 animate-pulse" />;
  }

  const current = filtered[index];
  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-xl">
      <img
        src={current.gbifImage}
        alt={current.nome_cientifico}
        className="w-full h-[280px] sm:h-[380px] lg:h-[460px] object-cover block transition-opacity duration-500"
      />
    </div>
  );
}

export default function Slider({ images, variant = "species", itemClassName, mapSrc }: SliderProps) {
  if (variant === "hero") {
    if (images?.length) {
      return <HeroImage src={images[0].src} alt={images[0].alt} mapSrc={mapSrc} />;
    }
    return <HeroSpeciesSlider />;
  }

  return <SpeciesSlider itemClassName={itemClassName} />;
}
