"use client";

import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import type { OccurrencePoint } from "@/hook/useSpeciesOccurrence";

const occurrenceMarkerIcon = L.icon({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [18, 30],
  iconAnchor: [9, 30],
  popupAnchor: [0, -28],
  shadowSize: [30, 30],
});

interface OccurrenceMarkersProps {
  points: OccurrencePoint[];
}

export default function OccurrenceMarkers({ points }: OccurrenceMarkersProps) {
  return points.map((point, index) => (
    <Marker
      key={`${point.latitude}-${point.longitude}-${index}`}
      position={[point.latitude, point.longitude]}
      icon={occurrenceMarkerIcon}
    >
      <Popup>
        <div className="p-1">
          <p className="mb-1 text-sm font-semibold text-slate-800">{point.description}</p>
          <span className="block font-mono text-xs text-gray-500">Lat: {point.latitude.toFixed(4)}</span>
          <span className="block font-mono text-xs text-gray-500">Lng: {point.longitude.toFixed(4)}</span>
        </div>
      </Popup>
    </Marker>
  ));
}
