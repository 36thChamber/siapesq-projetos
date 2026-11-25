import dynamic from "next/dynamic";
import { useSpeciesOccurrence } from "@/hook/useSpeciesOccurrence";
import { usePlatformTheme } from "@/context/PlatformThemeContext";
import { DownloadIcon, LockIcon } from "@/components/icons";

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full w-full bg-slate-50 text-sm italic text-gray-400">
      Carregando mapa interativo...
    </div>
  ),
});

interface SpeciesOccurrenceMapSectionProps {
  id_especie: string;
  isBlocked?: boolean;
}

export default function SpeciesOccurrenceMapSection({
  id_especie,
  isBlocked = false,
}: SpeciesOccurrenceMapSectionProps) {
  
  const { points, loading, error, empty, downloading, downloadCsv, retry } = useSpeciesOccurrence(
    isBlocked ? "" : id_especie,
  );
  const { theme } = usePlatformTheme();

  if (loading && !isBlocked) {
    return (
      <div
        className="p-6 text-center italic"
        style={{ color: theme.colors.muted }}
      >
        Carregando mapa e pontos de ocorrência...
      </div>
    );
  }

  return (
    <section className="relative w-full mt-8 p-6 bg-white rounded-lg border border-gray-100 shadow-sm">

      {isBlocked && (
        <div className="absolute inset-0 z-20 backdrop-blur-[3px] bg-[#00000086] flex flex-col justify-center items-center rounded-lg">
          <LockIcon size={30} color="white" />
          <p className="text-white font-semibold mt-2">Mapa de Ocorrências Bloqueado</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <h2
          className="text-xl font-bold tracking-tight"
          style={{ color: theme.colors.titleColor }}
        >
          Mapa de Ocorrências
        </h2>

        <button
          type="button"
          onClick={() => void downloadCsv()}
          disabled={isBlocked || loading || downloading}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all shadow-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: theme.colors.primary[500],
            color: "#FFFFFF",
          }}
        >
          <DownloadIcon size={16} color="#FFFFFF" />
          {downloading ? "Baixando CSV..." : "Baixar CSV"}
        </button>
      </div>

      <div className="w-full h-96 rounded-lg relative overflow-hidden bg-slate-100 border border-gray-200 shadow-inner">
        
        {!isBlocked && <LeafletMap points={points} />}

        {!isBlocked && !loading && error && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white/85 px-4 text-center">
            <p className="text-sm text-red-700" role="alert">{error}</p>
            <button type="button" className="text-sm underline" onClick={retry}>Tentar novamente</button>
          </div>
        )}

        {!isBlocked && !loading && !error && empty && (
          <p className="absolute inset-0 z-10 flex items-center justify-center bg-white/75 px-4 text-center text-sm" style={{ color: theme.colors.muted }} role="status">
            Nenhuma ocorrência com coordenadas válidas foi encontrada.
          </p>
        )}
      </div>
    </section>
  );
}
