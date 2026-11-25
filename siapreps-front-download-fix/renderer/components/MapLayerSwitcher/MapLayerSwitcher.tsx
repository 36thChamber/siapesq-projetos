interface MapLayerSwitcherProps {
  baseMap: "openstreetmap" | "google";
  setBaseMap: (map: "openstreetmap" | "google") => void;
}

export default function MapLayerSwitcher({
  baseMap,
  setBaseMap,
}: MapLayerSwitcherProps) {
  return (
    <div className="bg-white p-1.5 rounded-lg shadow-md flex flex-col gap-1 border border-gray-100 min-w-[160px]">
      <button
        onClick={() => setBaseMap("openstreetmap")}
        className={`px-4 py-2 rounded-md text-sm font-semibold transition-all w-full text-center ${
          baseMap === "openstreetmap"
            ? "bg-dark_green text-white"
            : "bg-transparent text-gray-500 hover:bg-gray-100"
        }`}
      >
        OpenStreetMap
      </button>

      <button
        onClick={() => setBaseMap("google")}
        className={`px-4 py-2 rounded-md text-sm font-semibold transition-all w-full text-center ${
          baseMap === "google"
            ? "bg-dark_green text-white"
            : "bg-transparent text-gray-500 hover:bg-gray-100"
        }`}
      >
        Satélite
      </button>
    </div>
  );
}