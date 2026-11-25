import { useState } from "react";
import { isValidCoordinate, ManualPoint } from "./types";

interface ManualPointsProps {
  points: ManualPoint[];
  onAddPoint: (lat: number, lng: number) => boolean;
  onRemovePoint: (id: string) => void;
  onFocusPoint: (lat: number, lng: number) => void;
}

const ManualPoints: React.FC<ManualPointsProps> = ({
  points,
  onAddPoint,
  onRemovePoint,
  onFocusPoint,
}) => {
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [error, setError] = useState("");

  const handleAdd = () => {
    setError("");

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (!isValidCoordinate(latNum, lngNum)) {
      setError("Latitude: -90 a 90 | Longitude: -180 a 180");
      return;
    }

    const added = onAddPoint(latNum, lngNum);
    if (!added) {
      setError("Ponto já adicionado");
      return;
    }
    setLat("");
    setLng("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAdd();
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-dark_green">Inserir ponto</span>
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
          onClick={handleAdd}
          className="px-2 py-1 text-xs bg-dark_green text-white rounded hover:opacity-90 shrink-0"
        >
          +
        </button>
      </div>
      {error && <span className="text-[10px] text-red-500">{error}</span>}

      {points.length > 0 && (
        <div className="flex flex-col gap-0.5 max-h-28 overflow-y-auto">
          {points.map((point) => (
            <div
              key={point.id}
              className="flex items-center justify-between bg-gray-100 hover:bg-gray-200 rounded px-2 py-0.5 text-[11px] cursor-pointer transition-colors"
              onClick={() => onFocusPoint(point.lat, point.lng)}
            >
              <span className="text-gray-700 truncate mr-1">
                {point.label || `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemovePoint(point.id);
                }}
                className="text-red-500 hover:text-red-700 font-bold ml-1 shrink-0"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManualPoints;
