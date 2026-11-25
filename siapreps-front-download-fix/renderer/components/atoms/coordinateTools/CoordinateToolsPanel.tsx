import { useRef, useState } from "react";
import CoordinateSearch from "./CoordinateSearch";
import ManualPoints from "./ManualPoints";
import { Coordinate, ManualPoint, isDuplicatePoint } from "./types";

interface CoordinateToolsPanelProps {
  searchMarker: Coordinate | null;
  setSearchMarker: (coord: Coordinate | null) => void;
  manualPoints: ManualPoint[];
  setManualPoints: (points: ManualPoint[]) => void;
  onFocusPoint: (lat: number, lng: number) => void;
  onImportCsv: (file: File) => void;
  csvPointsCount: number;
  onClearCsv: () => void;
}

type Tab = "search" | "points";

const CoordinateToolsPanel: React.FC<CoordinateToolsPanelProps> = ({
  searchMarker,
  setSearchMarker,
  manualPoints,
  setManualPoints,
  onFocusPoint,
  onImportCsv,
  csvPointsCount,
  onClearCsv,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("search");

  const csvInputRef = useRef<HTMLInputElement>(null);

  const manualOnlyPoints = manualPoints.filter((p) => p.source !== "csv");

  const handleSearch = (lat: number, lng: number) => {
    setSearchMarker({ lat, lng });
  };

  const handleClearSearch = () => {
    setSearchMarker(null);
  };

  const handleAddPoint = (lat: number, lng: number) => {
    if (isDuplicatePoint(manualPoints, lat, lng)) return false;

    const newPoint: ManualPoint = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      lat,
      lng,
      source: "manual",
    };

    setManualPoints([...manualPoints, newPoint]);

    return true;
  };

  const handleRemovePoint = (id: string) => {
    setManualPoints(manualPoints.filter((p) => p.id !== id));
  };

  if (!isOpen) {
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
          stroke="#006767"
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
    <div className="bg-white rounded-lg shadow-lg w-64 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <span className="text-xs font-medium text-dark_green">Coordenadas</span>

        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600 text-sm leading-none"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setActiveTab("search")}
          className={`flex-1 py-1.5 text-[11px] font-medium transition-colors ${
            activeTab === "search"
              ? "text-dark_green border-b-2 border-dark_green"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          Buscar
        </button>

        <button
          onClick={() => setActiveTab("points")}
          className={`flex-1 py-1.5 text-[11px] font-medium transition-colors ${
            activeTab === "points"
              ? "text-dark_green border-b-2 border-dark_green"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          Pontos
          {manualPoints.length > 0 ? ` (${manualPoints.length})` : ""}
        </button>
      </div>

      <input
        ref={csvInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];

          if (file) {
            onImportCsv(file);
          }

          e.target.value = "";
        }}
      />

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
            <button
              onClick={() => csvInputRef.current?.click()}
              className="bg-dark_green text-white rounded px-3 py-2 text-xs hover:opacity-90 transition"
            >
              Importar CSV
            </button>

            {csvPointsCount > 0 && (
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />

                      <span className="text-xs font-semibold text-emerald-800">
                        Arquivo CSV carregado
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-500 mt-1 ml-4">
                      {csvPointsCount.toLocaleString()} pontos importados
                    </p>
                  </div>

                  <button
                    onClick={onClearCsv}
                    className="
          text-[11px]
          text-red-500
          hover:text-red-700
          transition-colors
        "
                  >
                    Remover
                  </button>
                </div>
              </div>
            )}

            <ManualPoints
              points={manualOnlyPoints}
              onAddPoint={handleAddPoint}
              onRemovePoint={handleRemovePoint}
              onFocusPoint={onFocusPoint}
            />

            <p className="text-[10px] text-gray-400">
              Ou clique no mapa para adicionar
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoordinateToolsPanel;
