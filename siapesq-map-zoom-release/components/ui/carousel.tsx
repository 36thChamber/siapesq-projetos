"use client";

import { ReactNode } from "react";
import { useCarousel } from "@/hook/useCarousel";
import { usePlatformTheme } from "@/context/PlatformThemeContext";

type CarouselProps = {
  children: ReactNode;
  variant?: "default" | "categories";
};

export default function Carousel({
  children,
  variant = "default",
}: CarouselProps) {
  const { carouselRef, arrowLeftRef, arrowRightRef } = useCarousel();
  const { theme } = usePlatformTheme();

  if (variant === "categories") {
    return (
      <div className="relative flex items-center w-full">
        <button
          ref={arrowLeftRef}
          className="shrink-0 w-7 h-7 items-center justify-center hidden sm:flex text-lg"
          style={{ color: theme.colors.gray[500] }}
          aria-label="Anterior"
        >
          ‹
        </button>

        <div
          ref={carouselRef}
          className="flex items-center gap-3 overflow-x-auto w-full py-2 px-1"
          style={{ scrollBehavior: "smooth", scrollbarWidth: "none" }}
        >
          {children}
        </div>

        <button
          ref={arrowRightRef}
          className="shrink-0 w-7 h-7 flex items-center justify-center text-lg"
          style={{ color: theme.colors.gray[500] }}
          aria-label="Próximo"
        >
          ›
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-row gap-[50px] w-full carousel-container min-h-[100px]">
      <button className="arrow left" ref={arrowLeftRef}>
        {"<"}
      </button>

      <div
        className="carousel flex flex-row w-full gap-[5px]"
        ref={carouselRef}
      >
        {children}
      </div>

      <button className="arrow right" ref={arrowRightRef}>
        {">"}
      </button>
    </div>
  );
}
