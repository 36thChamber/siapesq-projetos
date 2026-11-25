"use client";

import { useHomeStats } from "@/hook/useHomeStats";
import LoadingSpinner from "@/components/ui/loadingSpiner";
import { usePlatformTheme } from "@/context/PlatformThemeContext";
import { GlobalIcon, AnalyticsIcon, LocationIcon } from "@/components/icons";
import type { ComponentType } from "react";
import type { IconProps } from "@/components/icons";

const cards: Array<{
  label: string;
  statKey: "total_grupos" | "total_especies" | "total_analises";
  Icon: ComponentType<IconProps>;
}> = [
  { label: "GRUPOS EM MONITORAMENTO", statKey: "total_grupos", Icon: GlobalIcon },
  { label: "ESPÉCIES CATALOGADAS", statKey: "total_especies", Icon: AnalyticsIcon },
  { label: "ANÁLISES GERADAS", statKey: "total_analises", Icon: LocationIcon },
];

export default function HomeStatsSection() {
  const { stats, loading, error } = useHomeStats();
  const { theme } = usePlatformTheme();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[110px] my-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !stats) return null;

  const colors = theme.colors;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
      {cards.map(({ label, statKey, Icon }) => (
        <div
          key={label}
          className="p-6 rounded-xl shadow-sm border flex items-center gap-4 h-[110px] overflow-hidden"
          style={{
            backgroundColor: "#FFFFFF",
            borderColor: colors.surface,
          }}
        >
          <div
            className="w-14 h-14 flex items-center justify-center rounded-full shrink-0"
            style={{ backgroundColor: colors.buttonDetails }}
          >
            <Icon size={28} color="#FFFFFF" />
          </div>

          <div className="flex flex-col justify-center truncate min-w-0">
            <span
              className="text-[10px] font-bold tracking-wider uppercase block truncate"
              style={{ color: colors.muted }}
            >
              {label}
            </span>

            <span
              className="text-3xl font-extrabold block truncate"
              style={{ color: colors.titleHighlight }}
            >
              {stats[statKey]}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
