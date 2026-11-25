"use client";

import { useState } from "react";
import { usePlatformTheme } from "@/context/PlatformThemeContext";
import CoordinateSearch from "./CoordinateSearch";
import ManualPoints from "./ManualPoints";
import CsvPointImporter from "./CsvPointImporter";
import { Coordinate, MapPoint, isDuplicatePoint } from "./types";

interface CoordinateToolsPanelProps {
  searchMarker: Coordinate | null;
  setSearchMarker: (coord: Coordinate | null) => void;
  points: MapPoint[];
  setPoints: (points: MapPoint[]) => void;
  onFocusPoint: (lat: number, lng: number) => void;
  embedded?: boolean;
}

type Tab = "search" | "points" | "csv";

export default function CoordinateToolsPanel({
  searchMarker,
  setSearchMarker,
  points,
  setPoints,
  onFocusPoint,
  embedded = false,
}: CoordinateToolsPanelProps) {
  const { theme } = usePlatformTheme();
  const [isOpen, setIsOpen] = useState(embedded);
  const [activeTab, setActiveTab] = useState<Tab>("search");

  const manualPoints = points.filter((p) => p.source === "manual");
  const csvPoints = points.filter((p) => p.source === "csv");

  const handleSearch = (lat: number, lng: number) => {
    setSearchMarker({ lat, lng });
  };

  const handleClearSearch = () => {
    setSearchMarker(null);
  };

  const handleAddPoint = (lat: number, lng: number) => {
    if (isDuplicatePoint(points, lat, lng)) return false;

    const newPoint: MapPoint = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      lat,
      lng,
      source: "manual",
    };
    setPoints([...points, newPoint]);
    return true;
  };

  const handleRemovePoint = (id: string) => {
    setPoints(points.filter((p) => p.id !== id));
  };

  const handleImportCsv = (newPoints: MapPoint[]) => {
    setPoints([...points, ...newPoints]);
  };

  const tabStyle = (tab: Tab) => ({
    color:
      activeTab === tab ? theme.colors.primary[500] : theme.colors.gray[400],
    borderBottom:
      activeTab === tab
        ? `2px solid ${theme.colors.primary[500]}`
        : "2px solid transparent",
  });

  if (!embedded && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-9 h-9 bg-white rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
        title="Ferramentas de coordenadas"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={theme.colors.primary[500]}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      </button>
    );
  }

  return (
    <div className={`bg-white rounded-lg overflow-hidden ${embedded ? "w-full" : "w-64 shadow-lg"}`}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{ borderColor: theme.colors.gray[200] }}
      >
        <span
          className="text-xs font-medium"
          style={{ color: theme.colors.primary[500] }}
        >
          Coordenadas
        </span>
        {!embedded && (
          <button
            onClick={() => setIsOpen(false)}
            className="text-sm leading-none hover:opacity-70"
            style={{ color: theme.colors.gray[400] }}
            aria-label="Fechar ferramentas de coordenadas"
          >
            &times;
          </button>
        )}
      </div>

      {/* Tabs */}
      <div
        className="flex border-b"
        style={{ borderColor: theme.colors.gray[200] }}
      >
        <button
          onClick={() => setActiveTab("search")}
          className="flex-1 py-1.5 text-[11px] font-medium transition-colors"
          style={tabStyle("search")}
        >
          Buscar
        </button>
        <button
          onClick={() => setActiveTab("points")}
          className="flex-1 py-1.5 text-[11px] font-medium transition-colors"
          style={tabStyle("points")}
        >
          Pontos{manualPoints.length > 0 ? ` (${manualPoints.length})` : ""}
        </button>
        <button
          onClick={() => setActiveTab("csv")}
          className="flex-1 py-1.5 text-[11px] font-medium transition-colors"
          style={tabStyle("csv")}
        >
          CSV{csvPoints.length > 0 ? ` (${csvPoints.length})` : ""}
        </button>
      </div>

      {/* Content */}
      <div className="px-3 py-2.5">
        {activeTab === "search" && (
          <CoordinateSearch
            hasMarker={searchMarker !== null}
            onSearch={handleSearch}
            onClear={handleClearSearch}
          />
        )}

        {activeTab === "points" && (
          <div className="flex flex-col gap-2">
            <ManualPoints
              points={manualPoints}
              onAddPoint={handleAddPoint}
              onRemovePoint={handleRemovePoint}
              onFocusPoint={onFocusPoint}
            />
            <p className="text-[10px]" style={{ color: theme.colors.muted }}>
              Ou clique no mapa para adicionar
            </p>
          </div>
        )}

        {activeTab === "csv" && (
          <CsvPointImporter
            existingPoints={points}
            onImportPoints={handleImportCsv}
          />
        )}
      </div>
    </div>
  );
}
