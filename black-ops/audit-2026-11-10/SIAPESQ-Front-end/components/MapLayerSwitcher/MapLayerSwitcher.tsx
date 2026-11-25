import { PlatformTheme } from "@/config/platformThemes";


interface MapLayerSwitcherProps {
  baseMap: "openstreetmap" | "google";
  setBaseMap: (map: "openstreetmap" | "google") => void;
  theme: PlatformTheme;
}

export default function MapLayerSwitcher({
  baseMap,
  setBaseMap,
  theme,
}: MapLayerSwitcherProps) {
  return (

    <div className="absolute top-3 left-16 z-[1000] bg-white p-1.5 rounded-lg shadow-md flex flex-col gap-1 border border-gray-100 min-w-[160px]">
      <button
        onClick={() => setBaseMap("openstreetmap")}
        className="px-4 py-2 rounded-md text-sm font-semibold transition-all w-full text-center"
        style={{
          backgroundColor:
            baseMap === "openstreetmap" ? theme.colors.primary[400] : "transparent",
          color: baseMap === "openstreetmap" ? "#FFFFFF" : theme.colors.muted,
        }}
      >
        OpenStreetMap
      </button>

      <button
        onClick={() => setBaseMap("google")}
        className="px-4 py-2 rounded-md text-sm font-semibold transition-all w-full text-center"
        style={{
          backgroundColor:
            baseMap === "google" ? theme.colors.primary[400] : "transparent",
          color: baseMap === "google" ? "#FFFFFF" : theme.colors.muted,
        }}
      >
        Satélite
      </button>
    </div>
  );
}