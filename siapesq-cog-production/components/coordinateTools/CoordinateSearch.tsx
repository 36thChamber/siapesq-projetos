"use client";

import { useState } from "react";
import { usePlatformTheme } from "@/context/PlatformThemeContext";
import { isValidCoordinate } from "./types";

interface CoordinateSearchProps {
  hasMarker: boolean;
  onSearch: (lat: number, lng: number) => void;
  onClear: () => void;
}

export default function CoordinateSearch({
  hasMarker,
  onSearch,
  onClear,
}: CoordinateSearchProps) {
  const { theme } = usePlatformTheme();
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [error, setError] = useState("");

  const handleSearch = () => {
    setError("");
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (!isValidCoordinate(latNum, lngNum)) {
      setError("Latitude: -90 a 90 | Longitude: -180 a 180");
      return;
    }

    onSearch(latNum, lngNum);
  };

  const handleClear = () => {
    setLat("");
    setLng("");
    setError("");
    onClear();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span
        className="text-xs font-medium"
        style={{ color: theme.colors.primary[500] }}
      >
        Buscar coordenada
      </span>
      <div className="flex gap-1.5 items-center">
        <input
          type="text"
          placeholder="Lat"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-0 px-2 py-1 text-xs border rounded focus:outline-none"
          style={{
            borderColor: theme.colors.gray[300],
            color: theme.colors.text,
          }}
        />
        <input
          type="text"
          placeholder="Lng"
          value={lng}
          onChange={(e) => setLng(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-0 px-2 py-1 text-xs border rounded focus:outline-none"
          style={{
            borderColor: theme.colors.gray[300],
            color: theme.colors.text,
          }}
        />
        <button
          onClick={handleSearch}
          className="px-2 py-1 text-xs text-white rounded hover:opacity-90 shrink-0"
          style={{ backgroundColor: theme.colors.primary[500] }}
        >
          Ir
        </button>
        {hasMarker && (
          <button
            onClick={handleClear}
            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:opacity-90 shrink-0"
          >
            &times;
          </button>
        )}
      </div>
      {error && <span className="text-[10px] text-red-500">{error}</span>}
    </div>
  );
}
