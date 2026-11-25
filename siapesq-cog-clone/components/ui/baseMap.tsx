"use client";

import dynamic from "next/dynamic";

const MapContainerDynamic = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);

const TileLayerDynamic = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);


const MapViewport = dynamic(() => import("@/components/map/MapViewport"), { ssr: false });

interface BaseMapProps {
  center: [number, number];
  zoom: number;
  baseMap: "openstreetmap" | "google";
  children?: React.ReactNode;
}

export default function BaseMap({ center, zoom, baseMap, children }: BaseMapProps) {
  return (
    <MapContainerDynamic
      center={center}
      zoom={zoom}
      className="w-full h-full"
    >
      <MapViewport center={center} zoom={zoom} />
      {baseMap === "openstreetmap" ? (
        <TileLayerDynamic
          key="osm" 
          noWrap
          attribution="© OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      ) : (
        <TileLayerDynamic
          key="google"
          noWrap
          attribution="© Google Maps"
          url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
          maxZoom={20}
        />
      )}
      
      {children}
    </MapContainerDynamic>
  );
}