"use client";

import { usePlatformTheme } from "@/context/PlatformThemeContext";

interface AnalysisOpacityControlProps {
  analysisId: string;
  label: string;
  analysisName?: string;
  opacity: number;
  onChange: (id: string, opacity: number) => void;
}

export function AnalysisOpacityControl({
  analysisId,
  label,
  analysisName,
  opacity,
  onChange,
}: AnalysisOpacityControlProps) {
  const { theme } = usePlatformTheme();
  const percentage = Math.round(opacity * 100);

  return (
    <div className="mt-1 mb-2 pl-5">
      <div
        className="flex items-center justify-between text-[10px] mb-0.5"
        style={{ color: theme.colors.gray[500] }}
      >
        <span>{label}</span>
        <span>{percentage}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={percentage}
        onChange={(e) => onChange(analysisId, Number(e.target.value) / 100)}
        className="w-full h-1 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: theme.colors.primary[500], background: theme.colors.gray[300] }}
        aria-label={`Opacidade de ${analysisName ?? label}`}
      />
    </div>
  );
}
