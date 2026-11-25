"use client";

import { useState } from "react";
import { useMapEvents } from "react-leaflet";
import { usePlatformTheme } from "@/context/PlatformThemeContext";

export default function MouseCoordinates() {
  const { theme } = usePlatformTheme();
  const [position, setPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  useMapEvents({
    mousemove(e) {
      setPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
    mouseout() {
      setPosition(null);
    },
  });

  if (!position) return null;

  return (
    <div
      className="absolute bottom-2 left-2 z-[1000] rounded px-3 py-1.5 text-xs shadow pointer-events-none flex gap-4"
      style={{
        backgroundColor: "rgba(255,255,255,0.92)",
        color: theme.colors.text,
      }}
    >
      <span>
        <span className="font-semibold">LAT:</span>{" "}
        {position.lat.toFixed(5)}
      </span>
      <span>
        <span className="font-semibold">LONG:</span>{" "}
        {position.lng.toFixed(5)}
      </span>
      <span>
        <span className="font-semibold">EPSG:</span> 4326
      </span>
    </div>
  );
}
