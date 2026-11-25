import { useState } from "react";
import { isValidCoordinate } from "./types";

interface CoordinateSearchProps {
  hasMarker: boolean;
  onSearch: (lat: number, lng: number) => void;
  onClear: () => void;
}

const CoordinateSearch: React.FC<CoordinateSearchProps> = ({ hasMarker, onSearch, onClear }) => {
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
      <span className="text-xs font-medium text-dark_green">Buscar coordenada</span>
      <div className="flex gap-1.5 items-center">
        <input
          type="text"
          placeholder="Lat"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-dark_green"
        />
        <input
          type="text"
          placeholder="Lng"
          value={lng}
          onChange={(e) => setLng(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-dark_green"
        />
        <button
          onClick={handleSearch}
          className="px-2 py-1 text-xs bg-dark_green text-white rounded hover:opacity-90 shrink-0"
        >
          Ir
        </button>
        {hasMarker && (
          <button
            onClick={handleClear}
            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:opacity-90 shrink-0"
          >
            ×
          </button>
        )}
      </div>
      {error && <span className="text-[10px] text-red-500">{error}</span>}
    </div>
  );
};

export default CoordinateSearch;
