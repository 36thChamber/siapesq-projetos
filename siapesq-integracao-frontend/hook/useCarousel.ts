import { useRef, useEffect } from "react";

export function useCarousel() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const arrowLeftRef = useRef<HTMLButtonElement>(null);
  const arrowRightRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const carousel = carouselRef.current;
    const arrowL = arrowLeftRef.current;
    const arrowR = arrowRightRef.current;

    if (!carousel || !arrowL || !arrowR) return;

    let scrollPx = (carousel.clientWidth / 100) * 20;

    const handleLeftClick = () => {
      carousel.scrollBy({ left: -scrollPx, behavior: "smooth" });
    };

    const handleRightClick = () => {
      carousel.scrollBy({ left: scrollPx, behavior: "smooth" });
    };

    const isMobile = () => window.innerWidth < 640;
    const hasOverflow = () =>
      carousel.scrollWidth > carousel.scrollLeft + carousel.clientWidth;

    const toggleArrows = () => {
      if (isMobile()) {
        arrowL.style.display = "none";
        arrowR.style.display = hasOverflow() ? "flex" : "none";
        return;
      }
      arrowL.style.display = carousel.scrollLeft > 0 ? "flex" : "none";
      arrowR.style.display = hasOverflow() ? "flex" : "none";
    };

    arrowL.addEventListener("click", handleLeftClick);
    arrowR.addEventListener("click", handleRightClick);
    carousel.addEventListener("scroll", toggleArrows);
    window.addEventListener("resize", toggleArrows);

    toggleArrows();

    return () => {
      arrowL.removeEventListener("click", handleLeftClick);
      arrowR.removeEventListener("click", handleRightClick);
      carousel.removeEventListener("scroll", toggleArrows);
      window.removeEventListener("resize", toggleArrows);
    };
  }, []);

  return {
    carouselRef,
    arrowLeftRef,
    arrowRightRef,
  };
}
