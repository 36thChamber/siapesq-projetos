"use client";

import { useEffect } from "react";
import { CircleMarker } from "react-leaflet";
import { useMap } from "react-leaflet";
import { CsvPoint } from "../../../utils/parseCSV";

type Props = {
  points: CsvPoint[];
  visible: boolean;
};

const CSV_PANE = "csvPane";

const CsvPointsLayer: React.FC<Props> = ({ points, visible }) => {
  const map = useMap();

  useEffect(() => {
    if (!map.getPane(CSV_PANE)) {
      map.createPane(CSV_PANE);
      map.getPane(CSV_PANE)!.style.zIndex = "600";
    }
  }, [map]);

  if (!visible || !points.length) return null;

  return (
    <>
      {points.map((pt, i) => (
        <CircleMarker
          key={i}
          center={[pt.lat, pt.lng]}
          radius={6}
          pane={CSV_PANE}
          pathOptions={{
            color: "#ff6b35",
            fillColor: "#ff6b35",
            fillOpacity: 0.9,
            weight: 1.5,
          }}
        />
      ))}
    </>
  );
};

export default CsvPointsLayer;
