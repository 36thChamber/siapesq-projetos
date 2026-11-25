"use client";

import Categories from "@/components/categories";
import Footer from "@/components/layout/footer";
import Header from "@/components/layout/header";
import Species from "@/components/species";
import SpeciesInfoSection from "@/components/speciesInfoSection";
import { useGbifImages } from "@/context/GbifImagesContext";
import { useAuth } from "@/context/AuthContext";
import { usePlatformTheme } from "@/context/PlatformThemeContext";
import { getGbifUsageKey, getSpeciesImages } from "@/services/api/gbif.service";
import type { SpeciesImageApiItem } from "@/services/types/gbif.types";
import { evaluateSpeciesAccess, getSpeciesAccessErrorMessage, isSpeciesAccessLimitError } from "@/services/types/plano.types";
import { buscarEspeciePorId } from "@/services/api/especies.service";
import { Especie as Specie } from "@/services/types/especie.types";
import { use, useCallback, useState } from "react";
import PredictionMap from "@/components/PredictionMap";
import { usePredictionMap } from "@/hook/usePredictionMap";
import { useSpeciesOccurrence } from "@/hook/useSpeciesOccurrence";

type PageMonitoringProps = {
  params: Promise<{ species: string }>;
};

const PageMonitoring = ({ params }: PageMonitoringProps) => {
  const { species } = use(params);
  return <SpeciesMonitoring key={species} species={species} />;
};

const SpeciesMonitoring = ({ species }: { species: string }) => {
  const [selectedSpecie, setSelectedSpecie] = useState<Specie | null>(null);
  const [specieDetails, setSpecieDetails] = useState<Specie | null>(null);
  const [usageKey, setUsageKey] = useState<number | null>(null);
  const [imageDetails, setImageDetails] = useState<SpeciesImageApiItem[]>([]);
  const { imageDetailsCache } = useGbifImages();
  const { plano, accessControl, accessDispatch, user } = useAuth();
  const { theme } = usePlatformTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);

  const prediction = usePredictionMap(isBlocked ? "" : (selectedSpecie?.id_especie ?? ""));
  const occurrences = useSpeciesOccurrence(isBlocked ? "" : (selectedSpecie?.id_especie ?? ""));

  const currentImageDetails = (usageKey && imageDetailsCache[usageKey]) || imageDetails;
  const images = currentImageDetails.map(image => image.url);

  const handleSelectSpecie = useCallback(
    async (specie: Specie) => {
      setSelectedSpecie(specie);
      setSpecieDetails(null);
      setUsageKey(null);
      setImageDetails([]);
      setLoading(true);
      setError(null);

      const { isBlocked: currentlyBlocked, shouldRegisterView } = evaluateSpeciesAccess(
        accessControl,
        plano,
        specie.id_especie,
        user?.tipo_usuario,
      );

      setIsBlocked(currentlyBlocked);

      if (currentlyBlocked) {
        setLoading(false);
        return;
      }

      if (shouldRegisterView) {
        accessDispatch({
          type: "attSpecies",
          id: specie.id_especie,
        });
      }

      try {
        const [details, key] = await Promise.all([
          buscarEspeciePorId(specie.id_especie),
          specie.is_aggregate ? Promise.resolve(null) : specie.gbifUsageKey ? Promise.resolve(specie.gbifUsageKey) : getGbifUsageKey(specie.nome_cientifico),
        ]);
        
        setSpecieDetails(details);

        try {
          const details = key
            ? (imageDetailsCache[key] ?? (await getSpeciesImages(key)).images)
            : [];

          setUsageKey(key ?? null);
          setImageDetails(details);
        } catch (gbifError) {
          console.error("Erro ao carregar imagens do GBIF:", gbifError);
        }
      } catch (err) {
        const message = getSpeciesAccessErrorMessage(err);

        if (isSpeciesAccessLimitError(err)) {
          setIsBlocked(true);
          setError(message);
        } else {
          console.error("Erro ao carregar dados da espécie:", err);
          setError(message);
        }
      } finally {
        setLoading(false);
      }
    },
    [imageDetailsCache, plano, accessControl, accessDispatch, user]
  );

  return (
    <div className="flex flex-col min-h-screen bg-[#F9FAFB]">
      <Header />

      <div className="mx-[40px] max-sm:mx-[12px] my-[10px]">
        <Categories />

        <div className="grid grid-cols-10 gap-4 p-4 max-sm:p-1">
          <Species
            category={species}
            onSelectSpecie={handleSelectSpecie}
          />

          <div className="col-span-8 max-[1024px]:col-span-full">

            {loading && !isBlocked && (
              <div
                className="space-y-4 animate-pulse bg-white p-8 rounded-xl border"
                style={{ borderColor: theme.colors.gray[200] }}
              >
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="h-[300px] bg-gray-200 rounded-xl"></div>
                <div className="h-5 bg-gray-200 rounded w-1/3 mt-4"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            )}

            {error && (
              <p
                className={isBlocked ? "text-amber-700" : "text-red-500"}
                role="alert"
              >
                {error}
              </p>
            )}

            {!loading && (!error || isBlocked) && selectedSpecie ? (
              <>
                <SpeciesInfoSection
                  specie={selectedSpecie}
                  images={images}
                  imageDetails={currentImageDetails}
                  details={specieDetails ?? undefined}
                  isBlocked={isBlocked}
                />
                
                <div className="mt-6">
                  <PredictionMap
                    {...prediction}
                    isBlocked={isBlocked}
                    monitoringHref={!isBlocked ? `/map/${encodeURIComponent(selectedSpecie.id_especie)}` : undefined}
                    occurrencePoints={occurrences.points}
                    occurrenceLoading={occurrences.loading}
                    occurrenceError={occurrences.error}
                    occurrencesEmpty={occurrences.empty}
                    downloadingOccurrences={occurrences.downloading}
                    onDownloadOccurrences={occurrences.downloadCsv}
                    onRetryOccurrences={occurrences.retry}
                  />
                </div>
              </>
            ) : (
              !loading &&
              !error && (
                <p style={{ color: theme.colors.muted }}>
                  Selecione uma espécie para visualizar
                </p>
              )
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PageMonitoring;
