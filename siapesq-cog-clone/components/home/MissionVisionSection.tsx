"use client";

import { usePlatformTheme } from "@/context/PlatformThemeContext";

const MissionIcon = ({ color }: { color: string }) => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="12" stroke={color} strokeWidth="1.8" />
    <circle cx="16" cy="16" r="6" stroke={color} strokeWidth="1.8" />
    <circle cx="16" cy="16" r="2" fill={color} />
    <path
      d="M16 4V8M16 24V28M4 16H8M24 16H28"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const VisionIcon = ({ color }: { color: string }) => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <path
      d="M4 16C4 16 8 8 16 8C24 8 28 16 28 16C28 16 24 24 16 24C8 24 4 16 4 16Z"
      stroke={color}
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <circle cx="16" cy="16" r="4" stroke={color} strokeWidth="1.8" />
  </svg>
);

const DecorativeArc = ({ color }: { color: string }) => (
  <svg width="295" height="148" viewBox="0 0 295 148" fill="none">
    <path
      d="M0 148 Q147.5 0 295 148"
      stroke={color}
      strokeWidth="1.5"
      fill="none"
    />
    <path
      d="M147.5 30 L147.5 118"
      stroke={color}
      strokeWidth="1"
      strokeDasharray="4 4"
    />
  </svg>
);

export default function MissionVisionSection() {
  const { theme } = usePlatformTheme();
  const colors = theme.colors;

  const missionGradient = `linear-gradient(132deg, ${colors.gradientFrom} 0%, ${colors.gradientTo} 100%)`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
      <div
        className="relative overflow-hidden rounded-[24px] px-8 py-[84px] flex flex-col justify-center min-h-[280px] shadow-sm"
        style={{ background: missionGradient }}
      >
        <div className="flex gap-6 items-start">
          <div
            className="flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center border-2"
            style={{ borderColor: "rgba(255, 255, 255, 0.35)" }}
          >
            <MissionIcon color="#FFFFFF" />
          </div>

          <div className="flex flex-col gap-[10px]">
            <h3 className="text-[24px] font-bold text-white leading-[32px]">
              Missão
            </h3>

            <p
              className="text-[14px] leading-[22.75px]"
              style={{ color: "#F3F4F6" }}
            >
              {theme.texts.mission}
            </p>
          </div>
        </div>
      </div>

      <div
        className="relative overflow-hidden rounded-[24px] px-[33px] py-[72px] flex flex-col justify-center min-h-[280px] border shadow-sm"
        style={{
          backgroundColor: colors.lightBlock,
          borderColor: colors.surface,
        }}
      >
        <div className="absolute bottom-0 right-0 opacity-20 pointer-events-none">
          <DecorativeArc color={colors.titleHighlight} />
        </div>

        <div className="flex gap-6 items-start relative">
          <div
            className="flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center border-2"
            style={{ borderColor: colors.titleHighlight }}
          >
            <VisionIcon color={colors.titleHighlight} />
          </div>

          <div className="flex flex-col gap-[11px]">
            <h3
              className="text-[24px] font-bold leading-[32px]"
              style={{ color: colors.titleColor }}
            >
              Visão
            </h3>

            <p
              className="text-[14px] leading-[22.75px]"
              style={{ color: colors.text }}
            >
              {theme.texts.vision}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}