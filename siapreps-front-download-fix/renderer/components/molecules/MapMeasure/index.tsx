import { useState } from 'react';
import { Polyline, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

interface MapMeasureProps {
  isActive: boolean;
  onDistanceChange: (d: number) => void;
}

const pointIcon = L.divIcon({
  className: '',
  html: `
    <div
      style="
        width:18px;
        height:18px;
        border-radius:50%;
        background:#00706d;
        display:flex;
        align-items:center;
        justify-content:center;
        box-shadow:0 0 0 2px white;
      "
    >
      <div
        style="
          width:6px;
          height:6px;
          border-radius:50%;
          background:white;
        "
      ></div>
    </div>
  `,
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

export default function MapMeasure({
  isActive,
  onDistanceChange
}: MapMeasureProps) {
  const [points, setPoints] = useState<[number, number][]>([]);

  useMapEvents({
    click(e) {
      if (!isActive) return;

      const newPoints = [
        ...points,
        [e.latlng.lat, e.latlng.lng] as [number, number]
      ];

      setPoints(newPoints);

      if (newPoints.length > 1) {
        let distanceMeters = 0;
        for (let i = 1; i < newPoints.length; i++) {
          const [lat1, lng1] = newPoints[i - 1];
          const [lat2, lng2] = newPoints[i];
          distanceMeters += L.latLng(lat1, lng1).distanceTo(
            L.latLng(lat2, lng2)
          );
        }

        onDistanceChange(distanceMeters / 1000);
      }
    }
  });

  if (!isActive) return null;

  return (
    <>
      {points.map((p, i) => (
        <Marker
          key={i}
          position={p}
          icon={pointIcon}
        />
      ))}

      {points.length > 1 && (
        <Polyline
          positions={points}
          color="#1e40af"
          weight={4}
          dashArray="10, 10"
        />
      )}
    </>
  );
}
