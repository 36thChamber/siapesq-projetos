"use client";
import { useEffect } from "react";
import { useMap } from "react-leaflet";

/** MapContainer uses initial props; apply a new species center once it arrives. */
export default function MapViewport({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const [latitude, longitude] = center;
  useEffect(() => {
    map.setView([latitude, longitude], zoom, { animate: false });
  }, [map, latitude, longitude, zoom]);
  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    let frame: number;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => map.invalidateSize({ animate: false, pan: false }));
    });
    observer.observe(map.getContainer());
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [map]);
  return null;
}
