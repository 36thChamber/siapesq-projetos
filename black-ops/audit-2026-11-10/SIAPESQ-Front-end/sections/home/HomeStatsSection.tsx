"use client";

import React from "react";
import Slider from "@/components/slider";
import { usePlatformTheme } from "@/context/PlatformThemeContext";

export default function HomeHeroSection() {
  const { theme } = usePlatformTheme();

  return (
    <section className="w-full py-10 lg:py-16">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div className="relative">
          <img
            src={theme.map}
            alt=""
            aria-hidden="true"
            className="absolute -right-2 -top-6 w-20 sm:w-28 lg:w-36 opacity-[0.75] pointer-events-none select-none"
          />

          <h1
            className="text-[28px] sm:text-[32px] lg:text-[38px] font-bold mb-3 leading-tight relative"
            style={{ color: theme.colors.titleColor }}
          >
            Sobre a Plataforma
            <br />
            <span style={{ color: theme.colors.titleHighlight }}>
              SIAPESQ-{theme.state}
            </span>
          </h1>

          <h2
            className="text-[15px] sm:text-[17px] font-semibold mb-4 relative"
            style={{ color: theme.colors.titleColor }}
          >
            {theme.texts.subtitle}
          </h2>

          <p
            className="text-[14px] sm:text-[15px] leading-relaxed relative"
            style={{ color: theme.colors.text }}
          >
            {theme.texts.description}
          </p>
        </div>

        <div>
          <Slider variant="hero" />
        </div>
      </div>
    </section>
  );
}