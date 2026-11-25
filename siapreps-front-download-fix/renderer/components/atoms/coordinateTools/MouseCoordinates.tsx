import { useState } from "react";
import { useMapEvents } from "react-leaflet";

const MouseCoordinates: React.FC = () => {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);

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
    <div className="absolute bottom-2 left-2 z-[1000] bg-white/90 rounded px-3 py-1 text-xs text-gray-700 shadow pointer-events-none">
      <span className="font-medium">Lat:</span> {position.lat.toFixed(5)}
      <span className="ml-2 font-medium">Lng:</span> {position.lng.toFixed(5)}
    </div>
  );
};

export default MouseCoordinates;
