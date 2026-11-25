"use client";

import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { getPlatformTheme, PlatformState } from "@/config/platformThemes";
import MapLayerSwitcher from "../MapLayerSwitcher/MapLayerSwitcher";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const occurrenceMarkerIcon = L.icon({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [18, 30],
  iconAnchor: [9, 30],
  popupAnchor: [0, -28],
  shadowSize: [30, 30],
});

interface Point {
  latitude: number;
  longitude: number;
  description: string;
}

interface LeafletMapProps {
  points: Point[];
}

function FitOccurrencePoints({ points }: LeafletMapProps) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;

    const coordinates = points.map(
      ({ latitude, longitude }) => [latitude, longitude] as [number, number],
    );

    if (coordinates.length === 1) {
      map.setView(coordinates[0], 10);
      return;
    }

    map.fitBounds(coordinates, { padding: [24, 24], maxZoom: 10 });
  }, [map, points]);

  return null;
}

export default function LeafletMap({ points }: LeafletMapProps) {
  const [baseMap, setBaseMap] = useState<"openstreetmap" | "google">("openstreetmap");

  const [platform, setPlatform] = useState<PlatformState>("RS");

  useEffect(() => {
    const savedState = localStorage.getItem("platformState") as PlatformState;
    if (savedState === "RS" || savedState === "ES" || savedState === "MG") {
      setPlatform(savedState);
    }
  }, []);

  const theme = getPlatformTheme(platform);
  const defaultCenter: [number, number] = [-30.0346, -51.2177];
  
  const hasValidPoints = points.length > 0 && !isNaN(points[0].latitude) && !isNaN(points[0].longitude);
  const center: [number, number] = hasValidPoints 
    ? [points[0].latitude, points[0].longitude] 
    : defaultCenter;

  return (
    <div className="w-full h-full relative">

      <MapLayerSwitcher baseMap={baseMap} setBaseMap={setBaseMap} theme={theme} />

      <MapContainer 
        center={center} 
        zoom={7} 
        scrollWheelZoom={false}
        className="z-0"
        style={{ height: "100%", width: "100%" }}
      >
        {baseMap === "openstreetmap" ? (
          <TileLayer
            key="osm"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        ) : (
          <TileLayer
            key="google"
            attribution='&copy; Google Maps'
            url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
            maxZoom={20}
          />
        )}

        <FitOccurrencePoints points={points} />

        {points.map((point, index) => (
          <Marker
            key={`${point.latitude}-${point.longitude}-${index}`}
            position={[point.latitude, point.longitude]}
            icon={occurrenceMarkerIcon}
          >
            <Popup>
              <div className="p-1">
                <p className="font-semibold text-sm mb-1 text-slate-800">
                  {point.description}
                </p>
                <span className="text-xs text-gray-500 font-mono block">
                  Lat: {point.latitude.toFixed(4)}
                </span>
                <span className="text-xs text-gray-500 font-mono block">
                  Lng: {point.longitude.toFixed(4)}
                </span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
