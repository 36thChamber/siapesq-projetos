import { SetStateAction, useEffect, useRef, useState } from "react";
import parseGeoraster from "georaster";
import GeoRasterLayer from "georaster-layer-for-leaflet";
import { useMap } from "react-leaflet";
import {
  color_clorofila,
  color_prof,
  color_sal,
  color_temp,
  colorXerelete,
  getColorScale,
} from "./paletas_cor";
import geoblaze from "geoblaze";
import GlobalFonts from "../../assets/font/font";
import {
  Tooltip,
  TooltipText,
  Loading,
  LoadingText,
  RotatingImage,
  LoadingBox,
} from "./georaster.styles";
import Image from "next/image";

interface GeoRasterLayerComponentProps {
  url: string;
  nome: { label: string; value: string };
  onLayerLoad?: () => void;
  isComponentActive: boolean;
}

const GeoRasterLayerComponent: React.FC<GeoRasterLayerComponentProps> = ({
  url,
  nome,
  onLayerLoad,
  isComponentActive = false,
}) => {
  const map = useMap();
  const [clickedPoint, setClickedPoint] = useState<string | null>(null);
  const [mostrarValor, setMostrarValor] = useState(false);
  const layerRef = useRef(null); // ref para a camada anterior
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousUrlRef = useRef<string | null>(null);
  const previousLabelRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isComponentActive) {
      map.dragging.disable();
      map.scrollWheelZoom.disable();
      map.doubleClickZoom.disable();
      map.touchZoom.disable();
    } else {
      map.dragging.enable();
      map.scrollWheelZoom.enable();
      map.doubleClickZoom.enable();
      map.touchZoom.enable();
    }
    return () => {
      map.dragging.enable();
      map.scrollWheelZoom.enable();
      map.doubleClickZoom.enable();
      map.touchZoom.enable();
    };
  }, [isComponentActive, map]);

  useEffect(() => {
    let isMounted = true;

    const addGeoRasterLayer = async () => {
      if (!url || !nome?.label) return;

      // Verificação de mudança otimizada
      if (
        url === previousUrlRef.current &&
        nome.label === previousLabelRef.current
      ) {
        return;
      }

      // Pré-limpeza
      map.off("click");
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setIsLoading(true);
      previousUrlRef.current = url;
      previousLabelRef.current = nome.label;

      try {
        const response = await fetch(url);
        if (!isMounted) return;

        const arrayBuffer = await response.arrayBuffer();
        if (!isMounted) return;

        const georaster = await parseGeoraster(arrayBuffer);
        if (!isMounted) return;

        // Remove camada anterior de forma segura
        if (layerRef.current) {
          map.removeLayer(layerRef.current);
          layerRef.current = null; // Limpa a referência imediatamente
        }

        const geoRasterLayer = new GeoRasterLayer({
          georaster,
          opacity: 0.9,
          resolution: 128,
          pixelValuesToColorFn: (values: number[]) => {
            const value = values[0];
            if (nome.label.includes("Temperatura")) return color_temp(value);
            if (nome.label.includes("Salinidade")) return color_sal(value);
            if (nome.label.includes("Clorofila")) return color_clorofila(value);
            if (nome.label.includes("Profundidade")) return color_prof(value);
            if (nome.label.includes("Xerelete")) return colorXerelete(value);
            return getColorScale(value);
          },
        });

        geoRasterLayer.addTo(map);
        layerRef.current = geoRasterLayer;

        // Configura eventos
        map.on("click", async (e) => {
          setMostrarValor(true);
          const latlng = [e.latlng.lng, e.latlng.lat];
          const geom = {
            srs: 4326,
            geometry: { type: "Point", coordinates: latlng },
          };
          try {
            const results = await geoblaze.identify(georaster, geom);
            const valor = results?.[0];
            if (typeof valor === "number") {
              setClickedPoint(valor.toFixed(3));
            }
          } catch (err) {
            console.error("Erro ao identificar valor:", err);
          }

          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => setMostrarValor(false), 2000);
        });

        if (onLayerLoad) onLayerLoad();
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Erro ao carregar o GeoTIFF:", error);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    addGeoRasterLayer();

    return () => {
      isMounted = false;

      // Não removemos a camada aqui para evitar flashes
    };
  }, [url, nome.label]);

  return (
    <>
      <GlobalFonts />
      {isLoading && (
        <Loading>
          <LoadingBox>
            <RotatingImage>
              <Image
                src={require("../../assets/image/reload.png")}
                alt="Carregando..."
                width={40}
                height={40}
              />
            </RotatingImage>
            <LoadingText>Carregando Mapa...</LoadingText>
          </LoadingBox>
        </Loading>
      )}

      {mostrarValor && clickedPoint && (
        <Tooltip>
          <TooltipText>Valor neste ponto: {clickedPoint}</TooltipText>
        </Tooltip>
      )}
    </>
  );
};

export default GeoRasterLayerComponent;
