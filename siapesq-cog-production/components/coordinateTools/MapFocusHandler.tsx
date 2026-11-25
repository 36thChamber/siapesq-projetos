"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { Coordinate } from "./types";

interface MapFocusHandlerProps {
  target: Coordinate | null;
}

export default function MapFocusHandler({ target }: MapFocusHandlerProps) {
  const map = useMap();

  useEffect(() => {
    if (target) {
      map.setView([target.lat, target.lng], 14);
    }
  }, [target, map]);

  return null;
}
