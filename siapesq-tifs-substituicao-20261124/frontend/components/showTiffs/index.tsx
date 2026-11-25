import { useCallback, useMemo } from "react";
import AnalysisRasterLayer from "@/components/map/GeoRasterLayer";
import { Especie as Specie } from "@/services/types/especie.types";
import { getSuitabilityColor } from "@/utils/suitabilityColor";

export const getColorScale = getSuitabilityColor;
type ShowTiffsProps = {
  url: string; renewAt?: number; opacity?: number; specie?: Specie | null;
  onError?: () => void; onLoadingChange?: (loading: boolean) => void;
};
export default function ShowTiffs({ url, renewAt, opacity = 1, onError, onLoadingChange }: ShowTiffsProps) {
  const analyses = useMemo(() => [{ id: "prediction", nome: "Adequabilidade", url, renewAt, opacity }], [url, renewAt, opacity]);
  const loading = useCallback((_id: string, value: boolean) => onLoadingChange?.(value), [onLoadingChange]);
  const error = useCallback(() => onError?.(), [onError]);
  return <AnalysisRasterLayer analyses={analyses} onLoadingChange={loading} onLoadError={error} />;
}
