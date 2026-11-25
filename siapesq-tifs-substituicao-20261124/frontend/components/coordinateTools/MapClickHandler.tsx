"use client";

import { useRef } from "react";
import { useMapEvents } from "react-leaflet";
import L from "leaflet";
import { usePlatformTheme } from "@/context/PlatformThemeContext";

interface MapClickHandlerProps {
  onAddPoint: (lat: number, lng: number) => void;
}

export default function MapClickHandler({ onAddPoint }: MapClickHandlerProps) {
  const { theme } = usePlatformTheme();
  const popupRef = useRef<L.Popup | null>(null);

  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;

      if (popupRef.current) {
        popupRef.current.remove();
      }

      const container = L.DomUtil.create("div");
      container.innerHTML = `
        <div style="text-align:center;font-family:sans-serif;">
          <p style="margin:0 0 6px;font-size:13px;color:${theme.colors.text};">
            <b>Lat:</b> ${lat.toFixed(5)}<br/>
            <b>Lng:</b> ${lng.toFixed(5)}
          </p>
          <button id="confirm-point-btn" style="
            background:${theme.colors.primary[500]};color:#fff;border:none;
            padding:5px 14px;border-radius:4px;cursor:pointer;
            font-size:12px;
          ">Adicionar ponto</button>
        </div>
      `;

      const popup = L.popup({ closeButton: true, minWidth: 140 })
        .setLatLng(e.latlng)
        .setContent(container)
        .openOn(e.target);

      popupRef.current = popup;

      const btn = container.querySelector(
        "#confirm-point-btn",
      ) as HTMLButtonElement;
      btn.addEventListener("click", () => {
        onAddPoint(lat, lng);
        popup.remove();
      });
    },
  });

  return null;
}
