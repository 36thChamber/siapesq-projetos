import React, { useState, useEffect } from "react";
import { Marker, Polyline, Popup, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import dynamic from "next/dynamic";
import CloseIcon from "../../../../resources/icons/common/CloseIcon";

const MarkerDynamic = dynamic(
  () => import("react-leaflet").then((module) => module.Marker),
  {
    ssr: false,
  }
);
declare global {
  interface Window {
    MarkerDynamic: typeof MarkerDynamic;
  }
}
let customIcon;
if (typeof window !== "undefined") {
  window.MarkerDynamic = MarkerDynamic;

  import("leaflet").then((L) => {
    return (customIcon = L.icon({
      iconUrl: "images/iconMarker.png",
      iconSize: [25, 40],
      iconAnchor: [25, 40],
    }));
  });
}

interface MapInteractionProps {
  startLatLng: {
    lat: number;
    lon: number;
  };
  onDirectionChange: (position: string) => void;
}

const MapInteraction = ({
  startLatLng,
  onDirectionChange,
}: MapInteractionProps) => {
  const map = useMap();
  const [markerScreenPosition, setMarkerScreenPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [customIcon, setCustomIcon] = useState<any>(null);

  /**
   * Hook que carrega o icone de fechar a linha de traçado de viagem apenas uma vez,
   * quando o componente é montado evitando "saltos" e "atrasos" na renderização da
   * nova posição do ícone ao mover o mapa ou mudar a posição do marcador.
   */
  useEffect(() => {
    import("leaflet").then((L) => {
      const icon = L.icon({
        iconUrl: "images/iconMarker.png",
        iconSize: [25, 40],
        iconAnchor: [25, 40],
      });
      setCustomIcon(icon);
    });
  }, []);

  // Função para Calcular o Ângulo (Azimute)
  function calculateBearing(lat1, lon1, lat2, lon2) {
    const toRadians = (degrees) => (degrees * Math.PI) / 180;
    const toDegrees = (radians) => (radians * 180) / Math.PI;

    const dLon = toRadians(lon2 - lon1);
    const lat1Rad = toRadians(lat1);
    const lat2Rad = toRadians(lat2);

    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x =
      Math.cos(lat1Rad) * Math.sin(lat2Rad) -
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

    let bearing = toDegrees(Math.atan2(y, x));
    bearing = (bearing + 360) % 360; // Normaliza para 0-360°

    return bearing;
  }

  // Função para Converter o Ângulo em Direção Cardeal
  function getCardinalDirection(bearing: number): string {
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "N"];
    const index = Math.round(bearing / 45);
    return directions[index];
  }

  function haversineDistance(
    coords1: [number, number] | null,
    coords2: [number, number] | null
  ): number {
    if (!coords1 || !coords2) {
      // Se uma das coordenadas for nula, retorna 0 como distância
      return 0;
    }

    const toRad = (x: number) => (x * Math.PI) / 180;

    const lat1 = coords1[0];
    const lon1 = coords1[1];
    const lat2 = coords2[0];
    const lon2 = coords2[1];

    const R = 6371; // Raio da Terra em km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distKm = R * c; // Distância em km
    return distKm;
  }

  ///////////////////////////////////// USE STATES ///////////////////////////////////////
  const [startPosition, setStartPosition] = useState<number[]>([
    startLatLng.lat,
    startLatLng.lon,
  ]); // Usando lat e lon
  const [previousPositions, setPreviousPositions] = useState<any>([]); // Posições anteriores para o rastro
  const [endPosition, setEndPosition] = useState<any>(null); // Ponto de destino clicado
  const [distance, setDistance] = useState<any>(null); // Distância entre startPosition e endPosition
  const [direction, setDirection] = useState<any>(1); // 1: Diagonal, 2: Vertical, 3: Horizontal
  const [pontoClicado, setPontoClicado] = useState<any>(null);
  const [directionText, setDirectionText] = useState(""); // Direção cardeal
  const [pontoClicadoFormatado, setPontoClicadoFormatado] = useState<string[]>(
    []
  );

  const [popupIsOpen, setPopupIsOpen] = useState(false);

  function conversao(lat: number, lon: number) {
    const toDegreesMinutes = (decimal: number) => {
      const degrees = Math.floor(Math.abs(decimal));
      const minutes = (Math.abs(decimal) - degrees) * 60;
      return `${degrees}°${minutes.toFixed(3)}`;
    };

    const latDirection = lat >= 0 ? "N" : "S";
    const lonDirection = lon >= 0 ? "E" : "W";

    const latitudeDM = `${toDegreesMinutes(lat)}${latDirection}`;
    const longitudeDM = `${toDegreesMinutes(lon)}${lonDirection}`;

    setPontoClicadoFormatado([latitudeDM, longitudeDM]);
  }
  // Atualizar a distancia sempre que mudar de posição
  useEffect(() => {
    const [lat, lon] = startPosition;
    const distKm = haversineDistance([lat, lon], pontoClicado);
    const distNauticalMiles = distKm * 0.539957; // Converter para milhas náuticas
    setDistance(distNauticalMiles);

    if (pontoClicado && pontoClicado[0] && pontoClicado[1]) {
      conversao(pontoClicado[0], pontoClicado[1]);
    }
  }, [startLatLng, pontoClicado]);

  // Atualiza a startPosition sempre que startLatLng mudar
  useEffect(() => {
    setStartPosition([startLatLng.lat, startLatLng.lon]);
    if (
      typeof window !== "undefined" &&
      typeof window.localStorage !== "undefined"
    ) {
      // Recuperar o valor do localStorage
      const storedData = localStorage.getItem("rastro");

      // Tratar o caso de dados inválidos ou inexistentes
      const posicoesAnteriores: [number, number][] = storedData
        ? JSON.parse(storedData)
        : [];

      const lat = startLatLng.lat;
      const lng = startLatLng.lon;

      // Define a margem de tolerância para comparar (em graus)
      const margem = 0.00001; // Aproximadamente 1 metro em coordenadas de latitude/longitude

      // Verificar se a nova posição é suficientemente diferente da última posição salva
      const ultimaPosicao = posicoesAnteriores[posicoesAnteriores.length - 1];
      const novaPosicao = [lat, lng];

      const posicaoDiferente =
        !ultimaPosicao ||
        Math.abs(lat - ultimaPosicao[0]) > margem ||
        Math.abs(lng - ultimaPosicao[1]) > margem;

      if (posicaoDiferente) {
        // Adicionar nova posição ao histórico
        posicoesAnteriores.push([
          parseFloat(lat.toFixed(5)),
          parseFloat(lng.toFixed(5)),
        ]);

        // Salvar novamente no localStorage para posteriormente salvar no Banco de Dados
        localStorage.setItem("rastro", JSON.stringify(posicoesAnteriores));
      }
    }
  }, [startLatLng]);

  // Função para mudar a direção a cada 5 segundos
  useEffect(() => {
    const directionChangeInterval = setInterval(() => {
      setDirection((prevDirection) => {
        // Alternar entre as direções
        if (prevDirection < 3) {
          return prevDirection + 1; // Muda para a próxima direção
        }
        return 1; // Volta para a primeira direção
      });
    }, 5000); // Muda a direção a cada 5 segundos

    return () => clearInterval(directionChangeInterval); // Limpar intervalo quando o componente desmontar
  }, []);

  useEffect(() => {
    if (startPosition && endPosition) {
      const bearing = calculateBearing(
        startPosition[0], // Latitude
        startPosition[1], // Longitude
        endPosition[0], // Latitude
        endPosition[1] // Longitude
      );
      console.log("🚀 ~ useEffect ~ bearing:", bearing);
      const direction = getCardinalDirection(bearing);
      onDirectionChange(`${Math.round(bearing)}° ${direction}`);
    }
  }, [startPosition, endPosition]);

  // Atualizar a distancia sempre que mudar de posição
  useEffect(() => {
    const [lat, lon] = startPosition;
    const distKm = haversineDistance([lat, lon], pontoClicado);
    const distNauticalMiles = distKm * 0.539957; // Converter para milhas náuticas
    setDistance(distNauticalMiles);
  }, [startLatLng, pontoClicado]);

  const AddMarkerOnClick = () => {
    useMapEvents({
      dblclick(e) {
        const { lat, lng } = e.latlng;
        setPontoClicado([lat, lng]);
        setEndPosition([lat, lng]); // Define o ponto de destino

        // Calcular distância com fórmula de Haversine
        const [latitude, longitude] = startPosition;
        const distKm = haversineDistance([latitude, longitude], [lat, lng]);
        const distNauticalMiles = distKm * 0.539957; // Converter para milhas náuticas
        setDistance(distNauticalMiles);
      },
    });
    return null;
  };

  /**
   * Atualiza a posição do botão de fechar linha do traçado de viagem na tela quando o mapa for movido ou
   * redimensionado.
   * @param {Map} map - O mapa Leaflet.
   * @param {Array<number>} endPosition - A posição do botão de fechar linha do traçado de viagem em latitude e longitude.
   */
  useEffect(() => {
    if (!map || !endPosition) return;

    const updateScreenPosition = () => {
      const point = map.latLngToContainerPoint(endPosition);
      setMarkerScreenPosition(point);
    };

    // Atualiza quando o mapa for movido ou redimensionado
    map.on("move", updateScreenPosition);
    map.on("zoom", updateScreenPosition);

    // Atualiza imediatamente após renderização
    updateScreenPosition();

    // Cleanup
    return () => {
      map.off("move", updateScreenPosition);
      map.off("zoom", updateScreenPosition);
    };
  }, [map, endPosition]);

  return (
    <>
      <AddMarkerOnClick />
      {markerScreenPosition && endPosition && !popupIsOpen && (
        <div
          style={{
            position: "absolute",
            left: markerScreenPosition.x + 2,
            top: markerScreenPosition.y - 55,
            zIndex: 9999,
            cursor: "pointer",
            display: endPosition && customIcon ? "block" : "none",
          }}
          onClick={() => {
            setEndPosition(null);
            setPontoClicado(null);
            onDirectionChange("");
          }}
        >
          <CloseIcon />
        </div>
      )}

      {endPosition && customIcon && (
        <div style={{ position: "relative", zIndex: 500000 }}>
          <Marker
            icon={customIcon}
            position={endPosition}
            eventHandlers={{
              click: () => {
                setPopupIsOpen(true);
              },
            }}
          >
            <Popup closeButton={false}>
              {popupIsOpen && (
                <>
                  <div
                    style={{
                      textAlign: "center",
                      padding: "10px",
                      position: "relative",
                      zIndex: 500000,
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        cursor: "pointer",
                        zIndex: 500000,
                      }}
                      onClick={() => {
                        setPopupIsOpen(false);
                      }}
                    >
                      <CloseIcon />
                    </div>

                    <p
                      style={{
                        margin: "5px 0",
                        fontSize: "16px",
                      }}
                    >
                      Distância até o ponto:
                    </p>
                    <p
                      style={{
                        margin: "5px 0 0 0",
                        fontWeight: "bold",
                        fontSize: "18px",
                        color: "#333",
                      }}
                    >
                      <span style={{ fontSize: "14px" }}> milhas náuticas</span>{" "}
                      {distance?.toFixed(2)}
                    </p>
                    <p
                      style={{
                        margin: "5px 0",
                        fontSize: "14px",
                        color: "#666",
                      }}
                    >
                      Aproximadamente {(distance / 0.539957).toFixed(2)} km
                    </p>
                  </div>

                  {pontoClicado && (
                    <>
                      <p>
                        <i>
                          {" "}
                          Latitude: {pontoClicadoFormatado[0]} | Longitude:{" "}
                          {pontoClicadoFormatado[1]}
                        </i>
                      </p>

                      <p> </p>
                    </>
                  )}
                </>
              )}
            </Popup>
          </Marker>
        </div>
      )}

      {/* Desenhar o rastro de rota usando previousPositions como linha tracejada */}
      {previousPositions.length > 0 && (
        <Polyline
          positions={previousPositions}
          color="red"
          dashArray="10, 10"
        />
      )}
      {directionText && (
        <div
          style={{
            zIndex: 999,
            position: "absolute",
            width: "60px",
            height: "15px",
            bottom: "100px",
            right: "10px",
            backgroundColor: "rgba(20,26,34,0.75)",
            borderRadius: "20px",
            padding: "10px",
            color: "white",
            textAlign: "center",
            textShadow: "2px 2px 2px rgba(0, 0, 0, 0.5)",
            cursor: "pointer",
          }}
        >
          <p
            style={{
              top: "-8px",
              position: "absolute",
              left: "16px",
              fontSize: "15px",
              fontFamily: "Poppins-Regular",
            }}
            title="Direção do ponto Clicado"
          >
            {directionText}
          </p>
        </div>
      )}
      {/* Desenhar a linha da posição atual até o destino como linha tracejada */}
      {startPosition && endPosition && (
        <Polyline
          positions={[startPosition, endPosition]}
          color="blue"
          dashArray="10, 10"
        />
      )}
    </>
  );
};

const directionOverlayStyle = {
  position: "absolute",
  bottom: "20px",
  right: "20px",
  padding: "10px 15px",
  backgroundColor: "rgba(128, 128, 128, 0.8)", // Cinza semi-transparente
  color: "white",
  borderRadius: "10px",
  zIndex: 10000,
  fontSize: "14px",
  boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
};

export default MapInteraction;
