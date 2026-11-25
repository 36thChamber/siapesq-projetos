import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { Coordinate } from "./types";

interface MapFocusHandlerProps {
  target: Coordinate | null;
}

const MapFocusHandler: React.FC<MapFocusHandlerProps> = ({ target }) => {
  const map = useMap();

  useEffect(() => {
    if (target) {
      map.setView([target.lat, target.lng], 14);
    }
  }, [target, map]);

  return null;
};

export default MapFocusHandler;
