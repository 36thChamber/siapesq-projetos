import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Popup, useMapEvents } from "react-leaflet";

const MarkerDynamic = dynamic(
  () => import("react-leaflet").then((module) => module.Marker),
  {
    ssr: false,
  }
);

let customIconMarker;
let popup;
if (typeof window !== "undefined") {
  window.MarkerDynamic = MarkerDynamic;
  import("leaflet").then((L) => {
    customIconMarker = L.icon({
      iconUrl: "images/iconMarker.png",
      iconSize: [25, 40],
      iconAnchor: [20, 40],
    });

    return customIconMarker;
  });
}
const UseMapEventsComponent = () => {
  type Marker = {
    lat: number;
    lng: number;
  };

  const [markers, setMarkers] = useState<Marker[]>([]);

  useMapEvents({
    dblclick(e) {
      const { lat, lng } = e.latlng;
      if (
        markers.map((index) => index.lat).toString() != e.latlng.lat.toString()
      ) {
        //Se não for o mesmo ponto, exibe outro. Se for, some com o popup
        setMarkers([{ lat, lng }]);
      } else {
        setMarkers([{ lat: 70, lng: 70 }]);
      }
    },
  });

  return (
    <>
      {markers.map((marker, index) => (
        <MarkerDynamic
          key={index}
          icon={customIconMarker}
          position={[marker.lat, marker.lng]}
        >
          <Popup>
            {`Latitude: ${marker.lat.toFixed(
              4
            )} Longitude: ${marker.lng.toFixed(4)}`}
          </Popup>
        </MarkerDynamic>
      ))}
    </>
  ); // Este componente não renderiza nada
};

export default UseMapEventsComponent;
