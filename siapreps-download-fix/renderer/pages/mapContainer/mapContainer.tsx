import React, { SetStateAction, useEffect, useRef, useState } from "react";
import { BackgroundImage } from "../../resources/styles/mapContainer/styles";
import "leaflet/dist/leaflet.css";
import Image from "next/image";

//Import das moléculas
import TopButtonsNavigation from "../../components/mapContainer/molecules/TopButtonsNavigation";
import TableDateEspinhel from "../../components/mapContainer/molecules/tableEspinhel";
import HistoricoLances from "../../components/mapContainer/molecules/HistoricoLances";
import ButtonConcluir from "../../components/mapContainer/molecules/ButtonConcluir";
import ConcluirMissao from "../../components/mapContainer/molecules/ConcluirMissao";
import ButtonRecolher from "../../components/mapContainer/molecules/ButtonRecolher";
import MesageLance from "../../components/mapContainer/molecules/MesageLance/Index";
import EspeciesExtras from "../../components/mapContainer/molecules/EspeciesExtras";
import HistoricoMapas from "../../components/mapContainer/molecules/mapaDebordo";
import MenuEspecies from "../../components/mapContainer/molecules/MenuEspecies";
import ButtonLancar from "../../components/mapContainer/molecules/ButtonLancar";
import DownloadPdf from "../../components/mapContainer/molecules/DownloadPdf";
import TableLances from "../../components/mapContainer/molecules/TableDate";
import Modal1 from "../../components/mapContainer/molecules/Modal1";
import Modal3 from "../../components/mapContainer/molecules/Modal3";
import Modal4 from "../../components/mapContainer/molecules/Modal4";
import GlobalFonts from "../../components/assets/font/font";
import Store from "electron-store";

//import { LatLngBoundsExpression } from 'leaflet';
import MenuEspeciesMapas from "../../components/mapContainer/molecules/MenuEspeciesMapas";
import TelaIncidentais from "../../components/mapContainer/molecules/Incidentais";
import TelaDescarte from "../../components/mapContainer/molecules/Descartes";
import Circulo from "../../components/mapContainer/atoms/divCirculo";
import { salvarDadosRelatorio } from "../../controllers/relatorio";
import CloseWarning from "../../components/molecules/closeWarning";
import { conexaoDaApi } from "../../resources/conexaoDaApi";
import Router, { useRouter } from "next/router";
import dynamic from "next/dynamic";

import {
  especieDescarte,
  adicionarDescarte,
  atualizarEspecie,
  historicoLancesFeitos,
  adicionarIncidentesEs,
  descartes,
  incidentais,
  voltarTabela,
  voltarTabLances,
  concluirMissao,
  voltarMissao,
  pegandoPorto,
  naoConcluirMissao,
  functionModal1,
  especiesExtra,
  adicionarExtra,
  adicionarEspecieExtra,
  atualizarEspecieMapa,
  haveConection,
} from "../../components/funcao/funcoesDeAcao";
import missaoConcluida from "../../components/funcao/sincronizarNoBanco";
import Modal6 from "../../components/mapContainer/molecules/modal6";
import Modal5 from "../../components/mapContainer/molecules/modal5";
import handlePetrecho from "../../components/funcao/handlePetrecho";
import { Fundo, Isca, Usuario } from "../../components/types/functions-types";
import { cancelar } from "../../components/funcao/cancelar";
import recolher from "../../components/funcao/recolher";
import salvar from "../../components/funcao/salvar";
import DivButton from "../../components/mapContainer/atoms/divButton";
import ConfirmButton from "../../components/mapContainer/molecules/updateImagesModal";
import UserInfoCard from "../../components/mapContainer/molecules/UserInfoCard";
import OnboardingTooltip from "../../components/mapContainer/molecules/OnboardingTooltip";
import GeoTiffTooltip from "../../components/mapContainer/molecules/GeoTiffInfoTooltip";
import { set } from "date-fns";
import {
  handleClose,
  handleNext,
  tooltipsProps,
} from "../../components/funcao/tooltips/onBoardingTooltips";
import {
  TableProbabilidade,
  TableProbabilidadeXerelete,
  TabelaClorofilla,
  TabelaProfundidade,
  TabelaSalinidade,
  TabelaTemperatura
} from "../../components/mapContainer/molecules/tableProbabilidade";
import TooltipsComponent from "../../components/mapContainer/molecules/TooltipsComponent";
import { get_principal_pngs_names } from "../../controllers/pngsMapas";
import { useMap } from "react-leaflet";
import Modal2 from "../../components/mapContainer/molecules/Modal2";
import { useElectronLog } from "../../hook/listening_electron";
//Importação Dinâmica para rendenizar de forma offline



const MapContainerDynamic = dynamic(
  () => import("react-leaflet").then((module) => module.MapContainer),
  {
    ssr: false,
  }
);
const MapInteractionDynamic = dynamic(
  () => import("../../components/mapContainer/molecules/MapInteraction/index"),
  {
    ssr: false,
  }
);

const GeoRasterLayerComponent = dynamic(
  () => import("../../components/funcao/funcoesTifs/UseMapComponent"), // Insira o caminho correto para o componente
  {
    ssr: false,
  }
);

const MarkerDynamic = dynamic(
  () => import("react-leaflet").then((module) => module.Marker),
  {
    ssr: false,
  }
);
const TileLayerDynamic = dynamic(
  () => import("react-leaflet").then((module) => module.TileLayer),
  {
    ssr: false,
  }
);
const ImageOverlayDynamic = dynamic(
  () => import("react-leaflet").then((module) => module.ImageOverlay),
  {
    ssr: false,
  }
);

// Declaração da window

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
      iconUrl: "images/fishing-boat-ofc.png",
      iconSize: [40, 40],
      iconAnchor: [20, 40],
    }));
  });
}

const store = new Store();

function MapContainerX() {
  const [dadosUsuario, setDadosUsuario] = useState<Usuario>({
    id: "",
    nome: "",
    insc_capt_portos: "",
    documento: "",
    email: "",
    telefone: "",
    ativo: true,
    criado_em: "",
    atualizado_em: "",
    deletado_em: null,
  });
  const [dadosDaViagem, setDadosDaViagem] = useState<string[]>([]);
  const [dadosViagemId, setDadosDaViagemId] = useState<number[]>([]);
  const [nomeEspecie, setNomeEspecie] = useState("");
  const [especieMapa, setEspecieMapa] = useState("");
  const [especies, setEspecies] = useState<String[]>([]);
  const [especiesMapa, setEspeciesMapa] = useState([]);
  const [iscas, setIscas] = useState<Isca[]>([]);
  const [fundos, setFundos] = useState<Fundo[]>([]);
  
  // ### useState usados para mostrar ou ocultar componentes ### //
  const [mostrarBotaoTutorial, setMostrarBotaoTutorial] = useState(true);
  const [mostrarTutorial, setMostrarTutorial] = useState(false);
  const [mostrarMenuEspeciesMapas, setMostrarMenuEspeciesMapas] =
  useState(false);
  const [mostrarBIncidentais, setMostrarBIncidentais] = useState(false);
  const [mostrarMenuEspecies, setMostrarMenuEspecies] = useState(false);
  const [mostrarIncidentais, setMostrarIncidentais] = useState(false);
  const [mostrarBotaoConfig, setMostrarBotaoConfig] = useState(true);
  const [mostrarBDescartes, setMostrarBDescartes] = useState(false);
  const [mostrarDescartes, setMostrarDescartes] = useState(false);
  const [mostrarRecolher, setMostrarRecolher] = useState(false); //mostrar botão de recolher
  const [mostrarConcluir, setMostrarConcluir] = useState(true);
  const [primeiroClique, setPrimeiroClique] = useState(true);
  const [mostrar3Botoes, setMostrar3Botoes] = React.useState(false);
  const [mostrarTabela, setMostrarTabela] = useState(false); // mostrar ou não a tabela
  const [mostrarModal1, setMostrarModal1] = useState(false);
  const [mostrarModal2, setMostrarModal2] = useState(false);
  const [mostrarModal3, setMostrarModal3] = useState(false);
  const [mostrarModal4, setMostrarModal4] = useState(false);
  const [mostrarLancar, setMostrarLancar] = useState(true); // mostrar ou não botão de Lançar Petrecho
  const [mostrarMissao, setMostrarMissao] = useState(true);
  const [mostrarConfig, setMostrarConfig] = useState(true);
  const [mostrarProb, setMostrarProb] = useState(true);
  const [desativaConcluir, setDesativaConcluir] = useState(false);
  const [desativaEspecie, setDesativaEspecie] = useState(false);
  const [desativaConfig, setDesativaConfig] = useState(false);
  const [desativaLancar, setDesativaLancar] = useState(false);
  const [desativaBotoes, setDesativaBotoes] = useState(false);
  const [mensagemLance, setMensagemLance] = useState(false);
  const [lancamentos, setLancamentos] = useState(Number()); // auxilia na quantidade de lances feito
  const [lancado, setLancado] = useState(false);
  const [lat, setLat] = useState("");
  const [log, setLog] = useState("");
  const [latRec, setLatRec] = useState("");
  const [logRec, setLogRec] = useState("");
  const [cabTabela, setCabTabela] = useState<string[]>(["Discriminação"]);
  const [histCab, setHistCab] = useState<string[]>(["Discriminação"]);

  const [openLateral2, setOpenLateral2] = useState<boolean>();
  const [openLateral, setOpenLateral] = useState<boolean>();
  const [dataPetrecho, setDataPetrecho] = useState<String[][]>([]);
  const [cabEspinhel, setCabEspinhel] = useState<string[]>([""]);
  const [histTabela, setHistTabela] = useState<string[][]>([]);
  const [histCabE, setHistCabE] = useState<string[]>([""]);
  const [armadilha, setArmadilha] = useState<string[][]>([
    ["Latitude"],
    ["Longitude"],
    ["Data"],
    ["Hora (Lançamento)"],
    ["N° de armadilhas (Lançadas)"],
    ["Hora (Recolhimento)"],
    ["N° de armadilhas (Recolhidas)"],
    ["Profundidade"],
    ["Peso(kg)"],
    ["Isca"],
    ["Fundo"],
  ]);
  const [espinhel, setEspinhel] = useState<string[][]>([
    ["Latitude"],
    ["Longitude"],
    ["Data"],
    ["Hora (Lançamento)"],
    ["N° de Anzóis"],
    ["Hora (Recolhimento)"],
    ["N° de Samburás"],
    ["Profundidade"],
    ["Temp de Superfície"],
    ["Tipo de isca"],
    ["Light-Stick (sim/não)"],
  ]);
  const [cerco, setCerco] = useState<string[][]>([
    ["Latitude"],
    ["Longitude"],
    ["Data"],
    ["Hora (Lançamento)"],
    ["Temp. de Superficie"],
    ["Hora (Recolhimento)"],
    ["Profundidade"],
    ["Tempo de procura"],
  ]);
  const [emalhe, setEmalhe] = useState<string[][]>([
    ["Latitude"],
    ["Longitude"],
    ["Data"],
    ["Hora (Lançamento)"],
    ["Comprimento total da rede (m)"],
    ["Hora (Recolhimento)"],
    ["Altura total da rede (m)"],
    ["Profundidade"],
    ["Tamanho da Malha (cm)"],
  ]);
  const [mapaEscolhido, setMapaEscolhido] = useState<string[][]>([]);
  const [tipoDeArte, setTipoDeArte] = useState("");
  const [historicoLances, setHistoricoLances] = useState<string[][]>([[]]);
  const [mapasDeBordo, setMapasDeBordo] = useState<string[][]>([]);
  const [dadosDeConclusao, setDadosDeConclusao] = useState<String[]>([]);
  const [mapaEncontrado, setMapaEncontrado] = useState();
  const [mostrarPdf, setMostrarPdf] = useState(false);
  const [mostrarModal5, setMostrarModal5] = useState(false);
  const [mostrarModal6, setMostrarModal6] = useState(false);
  //tabela especies extras espinhel
  const [cabLanceExtras, setCabLanceExtras] = useState<string[]>([
    "N°de identificação",
    "Espécie",
  ]);
  const [HcabLanceExtras, setHcabLanceExtras] = useState<string[]>([]);
  const [cabEspecieExtras, setCabEspecieExtras] = useState<string[]>(["", ""]);
  const [HcabEspecieExtras, setHcabEspecieExtras] = useState<string[]>([]);
  const [dadosExtrasEs, setDadosExtrasEs] = useState<string[][]>([[]]);
  const [HdadosExtrasEs, setHdadosExtrasEs] = useState<string[][]>([[]]);
  
  //tabela de descartes espinhel
  const [cabLanceDescartes, setCabLanceDescartes] = useState<string[]>([
    "",
    "",
  ]);
  const [HcabLanceDescartes, setHCabLanceDescartes] = useState<string[]>([""]);
  const [cabEspDescartes, setCabEspDescartes] = useState<string[]>([
    "N°de identificação",
    "Espécies",
  ]);
  const [HcabEspDescartes, setHCabEspDescartes] = useState<string[]>([]);
  const [dadosDescartes, setDadosDescartes] = useState<string[][]>([]);
  const [HdadosDescartes, setHDadosDescartes] = useState<string[][]>([]);
  const [especiesDescartadas, setEspeciesDescartadas] = useState<string[]>([]);
  
  //tabela de incidentais de espinhel
  const [cabLanceEs, setCabLanceEs] = useState<string[]>([""]);
  const [HcabLanceEs, setHCabLanceEs] = useState<string[]>([""]);
  const [cabStatusEs, setCabStatusEs] = useState<string[]>(["Espécies"]);
  const [HcabStatusEs, setHcabStatusEs] = useState<string[]>(["Espécies"]);
  const [IdadosEs, setIDadosEs] = useState<string[][]>([]);
  const [HIdadosEs, setHIdadosEs] = useState<string[][]>([]);

  //tabela incidentais emalhe
  const [cabEm, setCabEm] = useState<string[]>([""]);
  const [dadosEm, setDadosEm] = useState<string[][]>([]);
  const [HcabEm, setHcabEm] = useState<String[]>([]);
  const [HdadosEm, setHdadosEm] = useState<String[]>([]);
  
  //tabela de especies extras
  const [mostrarEspecieExtra, setMostrarEspecieExtra] = useState(false);
  const [tabelaDate, setTabelaDate] = useState<string[][]>([]);
  const [especieExtra, setEspecieExtra] = useState<string[]>([]);
  const [tipoDoTif, setTipoDoTif] = useState<{ label: string; value: string }>({
    label: "",
    value: "",
  });
  const [concluindoMissao, setConcluindoMissao] = useState(false);
  const [nomePortos, setNomePortos] = useState<String[]>([]);
  
  const isOnline = haveConection();
  const router = useRouter();
  const [isWaiting, setIsWaiting] = useState(false);
  
  const [showModal, setShowModal] = useState(false);
  
  const [directionText, setDirectionText] = useState("");
  
  const [xerelete, setXerelete] = useState({
    label: "",
    value: "",
  });

  let toolB = false;
  
  const renderTable = (especie) => {
    if(especie === 'Clorofila')return <TabelaClorofilla /> 
    if(especie === 'Profundidade') return <TabelaProfundidade /> 
    if(especie === 'Temperatura') return <TabelaTemperatura /> 
    if(especie === 'Salinidade') return <TabelaSalinidade /> 
  

    if(especie === 'Xerelete') {
      toolB=true;
      return <TableProbabilidadeXerelete />
    }
  
    toolB=true;
    return <TableProbabilidade/>
  };
  
  // ---------------------------------
  // Onboarding tooltips
  const tooltipMapRef = useRef(null);
  const updateGeoTiffsRef = useRef(null);
  const changeSpeciesTiffRef = useRef(null);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [hideTooltips, setHideTooltips] = useState(false);
  const [hideTooltipGeoRaster, setHideTooltipGeoRaster] = useState(false);
  const [geoRasterLayerIsLoaded, setGeoRasterLayerIsLoaded] = useState(false);
  
  const tooltips = tooltipsProps([
    { id: "mapDoubleClickRef", refEl: tooltipMapRef },
    { id: "updateGeoTiffsRef", refEl: updateGeoTiffsRef },
    { id: "changeSpeciesTiffRef", refEl: changeSpeciesTiffRef },
  ]);
  
  useEffect(() => {
    const stored = localStorage.getItem("onboardingSkipped");
    const tooltip_georaster = localStorage.getItem("geoTiffTooltipSkipped");
    //console.log("🚀 ~ useEffect ~ stored:", stored);
    if (!stored) {
      localStorage.setItem("onboardingSkipped", "false");
    }

    if (stored === "true") {
      setHideTooltips(true);
    }

    if (!tooltip_georaster) {
      localStorage.setItem("geoTiffTooltipSkipped", "false");
    }
    if (tooltip_georaster === "true") {
      setHideTooltipGeoRaster(true);
    }
  }, []);

  // ------------------------------

  const handleConfirm = () => {
    setShowModal(false);
    Router.push("/loadingPage");
  };
  //Pega os dados da viagem e o nome da especie alvo

  useEffect(() => {
    const dados = JSON.parse(localStorage.getItem("Dados") || "[]");

    if (dados == null) {
    } else if (dados != null && dados.dateEspecieId) {
      setNomeEspecie(dados.dateEspecieId.nome);
      setDadosDaViagemId([
        dados.dateEmbarcacaoId.id,
        dados.dateEspecieId.id,
        dados.dateArteId.id,
        dados.datePortoId.id,
        dados.formattedDate,
      ]);
      setDadosDaViagem([
        dados.dateEmbarcacaoId.nome,
        dados.dateEspecieId.nome,
        dados.dateArteId.nome,
        dados.datePortoId.nome,
        dados.formattedDate,
      ]);
    }
  }, [global?.window?.localStorage.getItem("Dados")]);

  //Pega os dados do usuário
  useEffect(() => {
    setDadosUsuario(JSON.parse(localStorage.getItem("userData") || "[]"));
  }, [global?.window?.localStorage.getItem("userData")]);

  useEffect(() => {
    const useEffect = async () => {
      const especiesLocal = JSON.parse(
        global?.window?.localStorage.getItem("especies_analises") || "[]"
      );
      const especies_mapa =
        especiesLocal.length > 0
          ? especiesLocal
          : await get_principal_pngs_names();
      const especies = especies_mapa.map((item) => ({
        id: item.value,
        nome: item.label,
      }));
      setEspeciesMapa(especies);
    };
    useEffect();
  }, []);
  // carrega os portos do localStorage e cria um array com id e nome de cada
  useEffect(() => {
    const loadPortos = () => {
      const portos = JSON.parse(localStorage.getItem("Portos") || "[]");
      if (portos) {
        const nomePorto = portos.map((porto) => ({
          id: porto.id,
          nome: porto.nome,
        }));
        setNomePortos(nomePorto);
      } else {
        setNomePortos([]);
      }
    };

    loadPortos();
  }, []);

  //Atualiza o nome da espécie
  useEffect(() => {
    const especies = JSON.parse(
      global?.window?.localStorage.getItem("Especies") || "[]"
    );
    if (especies) {
      const nome = especies.map((especie) => ({
        id: especie.id,
        nome: especie.nome,
      }));

      const novoNome = nome.filter((item) => item.nome !== nomeEspecie);

      setEspecies(novoNome);
    } else {
      setEspecies([]);
    }
  }, [nomeEspecie]);

  //verifica se temos dados de viagem,e  verifica qual o tipo de arte que a missão ta usando
  useEffect(() => {
    const dados = JSON.parse(localStorage.getItem("Dados") || "[]") || "[]";

    if (dados == null) {
      // Lida com a situação em que os dados não estão disponíveis
      console.error("Dados não encontrados");
      // Faça algo mais apropriado aqui, como redirecionar para uma página de erro
    } else if (dados != null && dados.dateArteId) {
      const artes = JSON.parse(
        global?.window?.localStorage.getItem("Artes") || "[]"
      );

      //verifica o tipo de arte
      if (artes && Array.isArray(artes)) {
        artes.forEach((arte) => {
          if (arte.id == dados.dateArteId.id) {
            if (
              arte.nome.toLowerCase().includes("armadilha") ||
              arte.nome.toLowerCase().includes("arrasto")
            ) {
              setMapaEscolhido(armadilha);
              setDataPetrecho(armadilha);
              setTipoDeArte("armadilha");
              setMostrarBDescartes(false);
              setMostrarBIncidentais(false);
            } else if (arte.nome.toLowerCase().includes("espinhel")) {
              setDataPetrecho(espinhel);
              setMapaEscolhido(espinhel);
              setTipoDeArte("espinhel");
              setMostrarBDescartes(true);
              setMostrarBIncidentais(true);
            } else if (arte.nome.toLowerCase().includes("cerco")) {
              setDataPetrecho(cerco);
              setMapaEscolhido(cerco);
              setTipoDeArte("cerco");
              setMostrarBDescartes(false);
              setMostrarBIncidentais(false);
            } else if (arte.nome.toLowerCase().includes("emalhar")) {
              setDataPetrecho(emalhe);
              setMapaEscolhido(emalhe);
              setTipoDeArte("emalhar");
              setMostrarBDescartes(false);
              setMostrarBIncidentais(true);
            }
          }
        });
      }
    }
  }, []);

  //useState para pegar a altura e comprimento da rede para o tipo de arte CERCO
  const [alturaS, setAltura] = useState("");
  const [comp, setComp] = useState("");

  // ### Salvar tudo no banco de dados após concluir missão ### //

  //useEffect usado para passar os dados para missaoConcluida assim que a conexão com a internet for estabelecida
  useEffect(() => {
    const concluindo = localStorage.getItem("missaoConcluida");
    if (concluindo === "true") {
      missaoConcluida({
        dadosDeConclusao,
        comp,
        alturaS,
        setDesativaBotoes,
        setConcluindoMissao,
        setDesativaEspecie,
        setMostrarLancar,
        setMostrarModal3,
        conexaoDaApi,
        tipoDeArte,
        latRec,
        logRec,
        nomeEspecie,
        salvarDadosRelatorio,
        setMostrarModal5,
        setMostrarModal6,
      });
    }
  }, []);

  //funçao que é acianda quando o usuario decide concluir a missao sem ter feito nada (lances)
  //só remove os dados da viagem e volta para home usando a page slashScreen
  function simConcluirMissao() {
    localStorage.removeItem("Dados");
    localStorage.removeItem("mapasPdf");
    localStorage.removeItem("historicoLances");
    localStorage.removeItem("mapasDeBordo");
    localStorage.removeItem("historicoPDF");
    localStorage.removeItem("dataCompleta");
    localStorage.removeItem("tabMapasDeBordo");
    localStorage.removeItem("missaoConcluida");
    Router.push("/home");
  }

  //UseEffect para verificar se o usuario tem lances em andamento
  useEffect(() => {
    const lance_andamento = JSON.parse(
      global?.window.localStorage.getItem("NumeroLancamentos") || "[]"
    );
    if (lance_andamento > 0) {
      setDesativaConcluir(true);
    } else {
      setDesativaConcluir(false);
    }
  }, [global?.window.localStorage.getItem("NumeroLancamentos")]);

  //PDF
  //função que pega o mapa selecionado para ser mandado para o download do pdf
  const downloadPdf = (mapa: string) => {
    const mapas = JSON.parse(
      global?.window?.localStorage.getItem("mapasPdf") || "[]"
    );
    if (mapas) {
      Object.keys(mapas).forEach((chave) => {
        if (String(chave) == mapa) {
          const mapaEncontrado1 = mapas[chave].lancesPdf;
          setMapaEncontrado(mapaEncontrado1);
        }
      });
    }
    setMostrarPdf(true);
  };
  const [mostrarDiv, setMostrarDiv] = useState(false);
  const handleFecharDiv = () => {
    if (mostrarDiv == true) {
      setMostrarDiv(false);
    } else {
      setMostrarDiv(true);
    }
  };

  //inicia em 299 para que nao seja exibido no mapa. assim, só terá icone se tiver local
  const [gpsData, setGpsData] = useState({ lat: 299, lon: 299 });

  const [initialImageSizeInMeters, setInitialImageSizeInMeters] = useState(350);
  const [imageSizeInMeters, setImageSizeInMeters] = useState(
    initialImageSizeInMeters
  );

  const [center, setCenter] = useState<any>({
    lat: gpsData.lat,
    lng: gpsData.lon,
  });

  const center_teste = {
    lat: -23.55052,
    lng: -46.63331,
  };

  const [errorMsg, setErrorMsg] = useState("");
  const [dados, setDados] = useState(null);
  const [backgroundColor, setBackgroundColor] = useState("#FF2F2F");

  // ### verificar de tempos em tempos o tempo retornado do gps. se for o mesmo durante um período, está Offline ### //
  let verificarDados = [[], [], [], []];

  function verifyData(timeDados: any) {
    if (verificarDados[0].length === 0) {
      verificarDados[0] = timeDados;
    } else if (verificarDados[1].length === 0) {
      verificarDados[1] = timeDados;
    } else if (verificarDados[2].length === 0) {
      verificarDados[2] = timeDados;
    } else if (verificarDados[3].length === 0) {
      verificarDados[3] = timeDados;
    }
    if (verificarDados[3].length !== 0) {
      if (
        verificarDados[0] === verificarDados[1] &&
        verificarDados[1] === verificarDados[2] &&
        verificarDados[2] === verificarDados[3] &&
        verificarDados[3] === verificarDados[3]
      ) {
        verificarDados = [[], [], [], []];
        setBackgroundColor("#FF2F2F");

        return setStateGps("Offline");
      } else if (
        verificarDados[0] !== verificarDados[1] ||
        verificarDados[1] !== verificarDados[2] ||
        verificarDados[2] !== verificarDados[3]
      ) {
        verificarDados = [[], [], [], []];
        setBackgroundColor("#3C8535");

        return setStateGps("Online");
      }
    }
  }

  // Função para atualizar a interface do usuário com os dados recebidos
  function atualizarInterfaceUsuario(dados) {
    setGpsData(dados);
    setCenter({ lat: dados.lat, lng: dados.lon });
    setLat(dados.lat);
    setLog(dados.lon);
  }

  const [stateGps, setStateGps] = useState("");
  const [speed, setSpeed] = useState<number>(0);

  useEffect(() => {
    // Verificar periodicamente se os dados do store foram atualizados
    const intervalId = setInterval(() => {
      let dados: any;

      dados = store.get("sharedData");
      let velocidade: number = Number(store.get("speedData"));

      if (dados === undefined || dados.lat === 299) {
        dados = store.get("approximateLocationData"); // Dados da localização aproximada
        velocidade = 0; // Velocidade zero para localização aproximada
      }

      // console.log("velocidade", velocidade);
      if (dados !== undefined) {
        setSpeed(parseFloat(velocidade?.toFixed(2)));
        verifyData(dados["time"]);
        atualizarInterfaceUsuario(dados);
      }
    }, 5000); // Verificar a cada 5 segundos

    // Limpar o intervalo quando o componente é desmontado
    return () => clearInterval(intervalId);
  }, []);

  // Referente a imagem de fundo do mapa
  const bottomLeftLat = -54;
  const topRightLat = 40.8;
  const bottomLeftLng = -90;
  const topRightLng = 55;

  // Referente ao mapa
  const left = -90;
  const bottom = -180;
  const right = 90;
  const top = 180;
  const maxBounds = [
    [bottom, left],
    [top, right],
  ];

  const [esconderMostrarMapa, setEsconderMostrarMapa] = useState(false);

  // Resolve bug de rendenização do mapa
  const mostrarMapa = () => {
    setTimeout(() => {
      setEsconderMostrarMapa(true);
    }, 500);
  };

  useEffect(() => {
    mostrarMapa();
  }, []);

  const [pngUrl, setPngUrl] = useState("");
  const mapRef = useRef(null);

  // Se tiver internet, usar:
  // https://tile.openstreetmap.org/{z}/{x}/{y}.png
  // Se não:
  // /tiles/{z}/{x}/{y}.png

  const [tile, setTile] = useState("/tiles/{z}/{x}/{y}.png");
  const [minZoom, setMinZoom] = useState(3);
  const [maxZoom, setMaxZoom] = useState(14);
  const [zoom, setZoom] = useState(3);
  useEffect(() => {
    if (isOnline == true) {
      setTile("https://tile.openstreetmap.org/{z}/{x}/{y}.png");
      setMinZoom(3);
      setMaxZoom(14);
    } else {
      setTile("/tiles/{z}/{x}/{y}.png");
      setMinZoom(3);
      setMaxZoom(8);
      setZoom(3);
    }
  }, [isOnline]);

  const [componenteIsActive, setComponenteIsActive] = useState(false);

  //função para pegar os logs do electron
  const [logs, setLogs] = useState<string[]>([]);

  useElectronLog((mensagem) => {
    setLogs((prev) => [...prev, mensagem]);
  });

  console.log('[Tela MapContainer] Retorno dos logs do electron: ', logs)
  //#################################################################Return da função. Componentes############################################################################################

  return (
    center && (
      <>
        <div>
          <div ref={tooltipMapRef}>
            <GlobalFonts />
            {esconderMostrarMapa ? (
              <MapContainerDynamic
                ref={mapRef}
                closePopupOnClick={true}
                maxBounds={[
                  [bottomLeftLat, bottomLeftLng],
                  [topRightLat, topRightLng],
                ]}
                zoom={zoom}
                minZoom={minZoom}
                maxZoom={maxZoom}
                bounds={[
                  [left, bottom],
                  [right, top],
                ]}
                zoomControl={false}
                worldCopyJump={true}
                doubleClickZoom={false}
              >
                <MarkerDynamic
                  position={[center.lat, center.lng]}
                  icon={customIcon}
                ></MarkerDynamic>

                <TileLayerDynamic
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors <a href="https://www.flaticon.com/free-icons/fishing" title="fishing icons">Fishing icons created by Freepik - Flaticon</a>'
                  url={tile}
                />

                <GeoRasterLayerComponent
                  url={pngUrl}
                  nome={tipoDoTif}
                  onLayerLoad={() => setGeoRasterLayerIsLoaded(true)}
                  isComponentActive={componenteIsActive}
                />

                {/* impede que ele saia da aplicação durante um lance */}
                {lancamentos != 0 && <CloseWarning lancamentos={lancamentos} tipoDeArte={tipoDeArte} />}

                {/* Logo */}
                <BackgroundImage>
                  <Image
                    src={require("../../public/images/SIAPESQ-LOGO.png")}
                    style={{ width: 164, height: 131 }}
                    alt={""}
                  />
                </BackgroundImage>

                {/* Componente que pergunta a confirmação do download do pdf */}
                {mostrarPdf && (
                  <DownloadPdf
                    mapaEncontrado={mapaEncontrado}
                    mostrarDiv={mostrarDiv}
                    setMostrarDiv={() => setMostrarDiv(false)}
                    setTipoDeArte={tipoDeArte}
                  />
                )}

                {/*Div da tabela de probabilidade*/}
                {/* {xerelete.label.includes("Xerelete") && (
                  <TableProbabilidadeXerelete />
                )} */}

                {renderTable(especieMapa)}

                {/* {!xerelete.label.includes("Xerelete") && <TableProbabilidade/>} */}


                <UserInfoCard
                  speed={speed}
                  stateGps={stateGps}
                  direction={directionText}
                  coordinates={{
                    latitude: center.lat,
                    longitude: center.lng,
                  }}
                  onMouseEnter={() => setComponenteIsActive(true)}
                  onMouseLeave={() => setComponenteIsActive(false)}
                />

                {mensagemLance && <MesageLance lancamentos={lancamentos} />}

                {mostrarConfig && (
                  <>
                    <DivButton
                      ref={changeSpeciesTiffRef}
                      width={"400px"}
                      height={"55px"}
                      borderradius={"15px"}
                      top={"15px"}
                      left={"220px"}
                      disabled={desativaConfig}
                      onClick={() => {
                        setMostrarMenuEspeciesMapas(true);
                        setMostrarConfig(false);
                        setMostrarBotaoTutorial(false);
                      }}
                    >
                      <p
                        ref={changeSpeciesTiffRef}
                        style={{
                          padding: 4,
                          marginLeft: "5px",
                          marginTop: "0px",
                          color: "rgba(255,255,255,0.75)",
                          fontSize: "17px",
                          textAlign: "left",
                        }}
                      >
                        Alterar mapa de localização do pescado
                      </p>

                      <Circulo marginleft={"365px"} margintop={"-44px"}>
                        <Image
                          src={require("../../components/assets/image/mapa.png")}
                          alt={""}
                        />
                      </Circulo>
                    </DivButton>
                  </>
                )}

                {/* Componentes para alterar especies e mapa*/}

                {mostrarMenuEspeciesMapas && (
                  <MenuEspeciesMapas
                    especieMapa={especieMapa}
                    especies={especiesMapa}
                    onClick={() => {
                      setMostrarMenuEspeciesMapas(false);
                      setMostrarBotaoConfig(true);
                      setMostrarBotaoTutorial(true);
                      setMostrarConfig(true);
                      setPrimeiroClique(true);
                      setComponenteIsActive(false);
                    }}
                    onChange={async (selected) => {
                      setTipoDoTif(selected);
                      setEspecieMapa(selected.label);
                      setTimeout(async () => {
                        try {
                          await atualizarEspecieMapa(selected, setPngUrl);
                        } finally {
                          setMostrarMenuEspeciesMapas(false);
                          setMostrarBotaoConfig(true);
                          setMostrarBotaoTutorial(true);
                          setMostrarConfig(true);
                          setPrimeiroClique(true);
                          setComponenteIsActive(false);
                        }
                      });
                    }}
                    onMouseEnter={() => setComponenteIsActive(true)}
                    onMouseLeave={() => setComponenteIsActive(false)}
                  />
                )}

                {mostrarBotaoConfig && (
                  <ConfirmButton ref={updateGeoTiffsRef} />
                )}
                {/* Botões para configura especie e mapa */}
                {mostrarBotaoConfig && (
                  <button
                    title="Configuração"
                    style={{
                      zIndex: 1000,
                      position: "absolute",
                      width: "40px",
                      height: "40px",
                      borderRadius: "25%",
                      right: "10px",
                      cursor: "pointer",
                      background: "rgba(20,26,34,0.75)",
                      border: "none",
                      top: "75px",
                    }}
                    onClick={() => {
                      if (primeiroClique == true) {
                        setMostrar3Botoes((prev) => !prev);
                      }
                    }}
                    disabled={desativaConfig}
                  >
                    <Circulo margintop={"8px"}>
                      <Image
                        src={require("../../components/assets/image/config.png")}
                        alt={""}
                      />
                    </Circulo>
                  </button>
                )}
                {/* Componente que indica a missao alvo e que mostra a opçao de alterar */}
                {mostrarMenuEspecies && (
                  <MenuEspecies
                    nomeEspecie={nomeEspecie}
                    onClick={() => {
                      setMostrarMenuEspecies(false);
                      setMostrarBotaoConfig(true);
                      setMostrarBotaoTutorial(true);
                      setPrimeiroClique(true);
                      setMostrarConfig(true);
                    }}
                    especies={especies}
                    onChange={(especie) => {
                      atualizarEspecie(especie, setNomeEspecie);
                    }}
                  />
                )}

                {/* Botões */}
                {mostrar3Botoes && (
                  <TopButtonsNavigation
                    clicklance={() => {
                      setOpenLateral(!openLateral);
                      setMostrar3Botoes(false);
                      historicoLancesFeitos(setHistoricoLances, tipoDeArte);
                      setDesativaConfig(true);
                      setDesativaConcluir(true);
                      setDesativaLancar(true);
                      setDesativaEspecie(true);
                      setMostrarBotaoConfig(false);
                    }}
                    clickMapa={() => {
                      setMostrarBotaoConfig(false);
                      setOpenLateral2(!openLateral2);
                      const mapas = JSON.parse(
                        global?.window?.localStorage.getItem(
                          "tabMapasDeBordo"
                        ) || "[]"
                      );
                      const dadosMapas: SetStateAction<string[][]> = [];

                      if (mapas && mapas.length > 0) {
                        for (let i = 0; i <= mapas.length - 1; i++) {
                          dadosMapas.push([
                            mapas[i][0],
                            mapas[i][1][0][1],
                            mapas[i][2],
                            mapas[i][3],
                          ]);
                        }
                      }
                      setMapasDeBordo(dadosMapas);
                      setDesativaConfig(true);
                      setDesativaConcluir(true);
                      setDesativaLancar(true);
                      setMostrar3Botoes(false);
                      setDesativaEspecie(true);
                    }}
                    desativa={desativaBotoes}
                  />
                )}

                {mostrarLancar && (
                  <ButtonLancar
                    onClick={() => {
                      handlePetrecho({
                        setCabLanceDescartes,
                        setCabEspDescartes,
                        setHCabLanceDescartes,
                        setHCabEspDescartes,
                        setCabLanceEs,
                        setCabStatusEs,
                        setHCabLanceEs,
                        setHcabStatusEs,
                        setCabTabela,
                        setCabEspinhel,
                        setDataPetrecho,
                        setHistCab,
                        setHistTabela,
                        setMostrarBIncidentais,
                        setMostrarBDescartes,
                        setLancado,
                        setMostrarTabela,
                        setMostrarLancar,
                        setMostrar3Botoes,
                        setMostrarConcluir,
                        setMostrarMissao,
                        setDesativaConcluir,
                        setDesativaEspecie,
                        setIscas,
                        setFundos,
                        setLancamentos,
                        setCabEm,
                        tipoDeArte,
                        lancamentos,
                        dataPetrecho,
                        lat,
                        log,
                        cabLanceDescartes,
                        cabEspDescartes,
                        cabLanceEs,
                        cabStatusEs,
                        cabTabela,
                        cabEspinhel,
                        cabEm,
                      });
                      setMostrarConfig(false);
                      setMostrarBotaoConfig(false);
                    }}
                    desativaLancar={desativaLancar}
                  />
                )}

                {mostrarRecolher && (
                  <ButtonRecolher
                    handleRecolher={() => {
                      recolher({
                        setCabEspDescartes,
                        setHDadosDescartes,
                        setHCabEspDescartes,
                        setCabStatusEs,
                        setHcabStatusEs,
                        setCabTabela,
                        setDataPetrecho,
                        setHistCab,
                        setHistTabela,
                        setLancado,
                        setMostrarTabela,
                        setHIdadosEs,
                        setMostrar3Botoes,
                        setMostrarConcluir,
                        setMostrarMissao,
                        setHistCabE,
                        setLatRec,
                        setLogRec,
                        setMostrarRecolher,
                        setDesativaBotoes,
                        setMensagemLance,
                        dadosDescartes,
                        tipoDeArte,
                        lancamentos,
                        dataPetrecho,
                        lat,
                        log,
                        cabEspDescartes,
                        cabStatusEs,
                        cabTabela,
                        cabEspinhel,
                        IdadosEs,
                      });
                      setMostrarConfig(false);
                      setMostrarBotaoConfig(false);
                    }}
                  />
                )}

                {mostrarConcluir && (
                  <ButtonConcluir
                    concluirMissao={() => {
                      if (!desativaConcluir) {
                        concluirMissao(
                          setConcluindoMissao,
                          setDesativaBotoes,
                          setDesativaEspecie,
                          setMostrarLancar
                        );
                      } else {
                        setMostrarModal2(true);
                      }
                    }}
                  />
                )}

                {/* Tela para concluir missão */}
                {concluindoMissao && (
                  <ConcluirMissao
                    nomePortos={nomePortos}
                    onChange={(porto) =>
                      pegandoPorto(porto, setDadosDeConclusao)
                    }
                    voltarMissao={() => {
                      voltarMissao(
                        setConcluindoMissao,
                        setDesativaEspecie,
                        setDesativaBotoes,
                        setMostrarLancar
                      );
                      setComponenteIsActive(false);
                    }}
                    missaoConcluida={() => {
                      missaoConcluida({
                        dadosDeConclusao,
                        comp,
                        alturaS,
                        setDesativaBotoes,
                        setConcluindoMissao,
                        setDesativaEspecie,
                        setMostrarLancar,
                        setMostrarModal3,
                        conexaoDaApi,
                        tipoDeArte,
                        latRec,
                        logRec,
                        nomeEspecie,
                        salvarDadosRelatorio,
                        setMostrarModal5,
                        setMostrarModal6,
                      });
                      setComponenteIsActive(false);
                    }}
                    tipoDeArte={tipoDeArte}
                    alt={(e) => {
                      setAltura(e);
                    }}
                    comp={(e) => {
                      setComp(e);
                    }}
                    altura={alturaS}
                    compS={comp}
                    onMouseEnter={() => setComponenteIsActive(true)}
                    onMouseLeave={() => setComponenteIsActive(false)}
                  />
                )}

                {/* Criando a tabela de lançar petrecho (tabela de lances sendo feitos) */}
                {mostrarTabela && tipoDeArte === "espinhel" ? (
                  <TableDateEspinhel
                    cabTabela={cabTabela}
                    cabEspinhel={cabEspinhel}
                    dataPetrecho={dataPetrecho}
                    cancelar={() => {
                      cancelar({
                        setMostrar3Botoes,
                        setMostrarTabela,
                        setMostrarLancar,
                        setDesativaBotoes,
                        setMostrarConcluir,
                        setMostrarMissao,
                        setDesativaEspecie,
                        setDesativaConcluir,
                        setLancado,

                        setCabEspinhel,
                        setCabTabela,

                        setLancamentos,

                        setDataPetrecho,
                        histTabela,
                        setCabLanceExtras,
                        setCabEspecieExtras,
                        setDadosExtrasEs,
                        setCabLanceDescartes,
                        setCabEspDescartes,
                        setDadosDescartes,
                        HcabLanceDescartes,
                        HcabEspDescartes,
                        HdadosDescartes,
                        setCabLanceEs,
                        setCabStatusEs,
                        HcabLanceEs,
                        HcabStatusEs,
                        setMensagemLance,
                        setMostrarRecolher,
                        setIDadosEs,
                        HIdadosEs,

                        lancado,
                        histCabE,
                        histCab,
                        lancamentos,
                        HcabLanceExtras,
                        HcabEspecieExtras,
                        HdadosExtrasEs,
                        tipoDeArte,
                      });
                      setMostrarConfig(true);
                      setMostrarBotaoConfig(true);
                      setMostrarBotaoTutorial(true);
                    }}
                    salvar={() => {
                      salvar({
                        setCabLanceDescartes,
                        setCabEspDescartes,
                        setHCabLanceDescartes,
                        setHCabEspDescartes,
                        setCabLanceEs,
                        setCabStatusEs,
                        setHCabLanceEs,
                        setHcabStatusEs,
                        setCabTabela,
                        setCabEspinhel,
                        setDataPetrecho,
                        setMostrarBIncidentais,
                        setMostrarBDescartes,
                        setLancado,
                        setMostrarTabela,
                        setMostrarLancar,
                        setMostrar3Botoes,
                        setMostrarConcluir,
                        setMostrarMissao,
                        setDesativaConcluir,
                        setDesativaEspecie,
                        setLancamentos,
                        setCabEm,
                        setHIdadosEs,
                        setMostrarRecolher,
                        setDesativaBotoes,
                        setMensagemLance,
                        setDadosDescartes,
                        setIDadosEs,
                        setDadosEm,
                        setTabelaDate,
                        setEspecieExtra,
                        setEspeciesDescartadas,
                        setMostrarModal4,
                        setMostrarModal1,
                        setMostrarConfig,
                        setMostrarBotaoConfig,
                        dadosDescartes,
                        tipoDeArte,
                        lancamentos,
                        dataPetrecho,
                        IdadosEs,
                        lancado,
                        nomeEspecie,
                        latRec,
                        logRec,
                        dadosDaViagem,
                        dadosViagemId,
                        dadosUsuario,
                        tabelaDate,
                        dadosEm,
                        mapaEscolhido,
                      });
                    }}
                    adicionarEspecie={() => {
                      especiesExtra(setMostrarTabela, setMostrarEspecieExtra);
                    }}
                    isca={iscas}
                    fundo={fundos}
                  />
                ) : (
                  mostrarTabela && (
                    <TableLances
                      tipoDeArte={tipoDeArte}
                      cabTabela={cabTabela}
                      dataPetrecho={dataPetrecho}
                      cancelar={() => {
                        cancelar({
                          setMostrar3Botoes,
                          setMostrarTabela,
                          setMostrarLancar,
                          setDesativaBotoes,
                          setMostrarConcluir,
                          setMostrarMissao,
                          setDesativaEspecie,
                          setDesativaConcluir,
                          setLancado,
                          setCabEspinhel,
                          setCabTabela,
                          setLancamentos,
                          setDataPetrecho,
                          histTabela,
                          setCabLanceExtras,
                          setCabEspecieExtras,
                          setDadosExtrasEs,
                          setCabLanceDescartes,
                          setCabEspDescartes,
                          setDadosDescartes,
                          HcabLanceDescartes,
                          HcabEspDescartes,
                          HdadosDescartes,
                          setCabLanceEs,
                          setCabStatusEs,
                          HcabLanceEs,
                          HcabStatusEs,
                          setMensagemLance,
                          setMostrarRecolher,
                          setIDadosEs,
                          HIdadosEs,

                          lancado,
                          histCabE,
                          histCab,
                          lancamentos,
                          HcabLanceExtras,
                          HcabEspecieExtras,
                          HdadosExtrasEs,
                          tipoDeArte,
                        });
                        setMostrarConfig(true);
                        setMostrarBotaoConfig(true);
                        setMostrarBotaoTutorial(true);
                        setComponenteIsActive(false);
                      }}
                      salvar={() => {
                        salvar({
                          setCabLanceDescartes,
                          setCabEspDescartes,
                          setHCabLanceDescartes,
                          setHCabEspDescartes,
                          setCabLanceEs,
                          setCabStatusEs,
                          setHCabLanceEs,
                          setHcabStatusEs,
                          setCabTabela,
                          setCabEspinhel,
                          setDataPetrecho,
                          setMostrarBIncidentais,
                          setMostrarBDescartes,
                          setLancado,
                          setMostrarTabela,
                          setMostrarLancar,
                          setMostrar3Botoes,
                          setMostrarConcluir,
                          setMostrarMissao,
                          setDesativaConcluir,
                          setDesativaEspecie,
                          setLancamentos,
                          setCabEm,
                          setHIdadosEs,
                          setMostrarRecolher,
                          setDesativaBotoes,
                          setMensagemLance,
                          setDadosDescartes,
                          setIDadosEs,
                          setDadosEm,
                          setTabelaDate,
                          setEspecieExtra,
                          setEspeciesDescartadas,
                          setMostrarModal4,
                          setMostrarModal1,
                          setMostrarConfig,
                          setMostrarBotaoConfig,
                          dadosDescartes,
                          tipoDeArte,
                          lancamentos,
                          dataPetrecho,
                          IdadosEs,
                          lancado,
                          nomeEspecie,
                          latRec,
                          logRec,
                          dadosDaViagem,
                          dadosViagemId,
                          dadosUsuario,
                          tabelaDate,
                          dadosEm,
                          mapaEscolhido,
                        });
                        setComponenteIsActive(false);
                      }}
                      adicionarEspecie={() => {
                        especiesExtra(setMostrarTabela, setMostrarEspecieExtra);
                      }}
                      isca={iscas}
                      fundo={fundos}
                      onMouseEnter={() => setComponenteIsActive(true)}
                      onMouseLeave={() => setComponenteIsActive(false)}
                    />
                  )
                )}

                {/* Dropdown para adicionar espécies extras */}

                {mostrarEspecieExtra && (
                  <EspeciesExtras
                    lancamentos={lancamentos}
                    adicionarEspecieExtra={() => {
                      adicionarEspecieExtra(
                        especieExtra,
                        tabelaDate,
                        tipoDeArte,
                        setTabelaDate,
                        setEspecieExtra
                      );
                    }}
                    voltarTabLances={() => {
                      voltarTabLances(setMostrarEspecieExtra, setMostrarTabela);
                    }}
                    especies={especies}
                    tabelaDate={tabelaDate}
                    onChange={(esp) => adicionarExtra(esp, setEspecieExtra)}
                    mostrarBDescartes={mostrarBDescartes}
                    mostrarBIncidentais={mostrarBIncidentais}
                    Descartes={() => {
                      descartes(setMostrarEspecieExtra, setMostrarDescartes);
                    }}
                    Incidentais={() => {
                      incidentais(
                        setMostrarEspecieExtra,
                        setMostrarIncidentais
                      );
                    }}
                    cabLanceExtras={cabLanceExtras}
                    cabEspecieExtras={cabEspecieExtras}
                    dadosExtras={dadosExtrasEs}
                    tipoDearte={tipoDeArte}
                  />
                )}

                {/* Telas para adicionar descarte e incidentes */}
                {mostrarDescartes && (
                  <TelaDescarte
                    lancamentos={lancamentos}
                    voltarInc={() => {
                      voltarTabela(
                        setMostrarEspecieExtra,
                        setMostrarDescartes,
                        setMostrarIncidentais
                      );
                    }}
                    adicionarOutro={() => {
                      adicionarDescarte(
                        setDadosDescartes,
                        setEspeciesDescartadas,
                        especiesDescartadas,
                        dadosDescartes,
                        cabEspDescartes
                      );
                    }}
                    dadosEs={dadosDescartes}
                    especies={especies}
                    onChange={(descarte) =>
                      especieDescarte(descarte, setEspeciesDescartadas)
                    }
                  />
                )}

                {mostrarIncidentais && (
                  <TelaIncidentais
                    lancamentos={lancamentos}
                    voltarInc={() => {
                      voltarTabela(
                        setMostrarEspecieExtra,
                        setMostrarDescartes,
                        setMostrarIncidentais
                      );
                    }}
                    adicionarOutro={() => {
                      adicionarIncidentesEs(
                        tipoDeArte,
                        cabStatusEs,
                        setIDadosEs,
                        IdadosEs,
                        dadosEm,
                        setDadosEm,
                        cabEm
                      );
                    }}
                    tipoDeArte={tipoDeArte}
                    cabecalho={cabLanceEs}
                    cabEm={cabEm}
                    cabAux={cabStatusEs}
                    dadosEs={IdadosEs}
                    dadosEm={dadosEm}
                  />
                )}

                {/* Tabela de historico de lances */}
                {openLateral && (
                  <HistoricoLances
                    onClick={() => {
                      setOpenLateral(false);
                      setDesativaConfig(false);
                      setDesativaEspecie(false);
                      setDesativaConcluir(false);
                      setDesativaLancar(false);
                      setMostrarBotaoConfig(true);
                      setComponenteIsActive(false);
                    }}
                    historicoLances={historicoLances}
                    onMouseEnter={() => setComponenteIsActive(true)}
                    onMouseLeave={() => setComponenteIsActive(false)}
                  ></HistoricoLances>
                )}

                {/* Tabela de mapas de bordo */}
                {openLateral2 && (
                  <HistoricoMapas
                    onClick={() => {
                      setOpenLateral2(false);
                      setDesativaConfig(false);
                      setDesativaEspecie(false);
                      setDesativaConcluir(false);
                      setDesativaLancar(false);
                      setMostrarBotaoConfig(true);
                      setComponenteIsActive(false);
                    }}
                    mapasDeBordo={mapasDeBordo}
                    baixar={(inicioLinha) => {
                      downloadPdf(inicioLinha);
                      handleFecharDiv();
                    }}
                    onMouseEnter={() => setComponenteIsActive(true)}
                    onMouseLeave={() => setComponenteIsActive(false)}
                  ></HistoricoMapas>
                )}

                {/* Modais de avisos */}
                {mostrarModal1 && (
                  // LANCES CONCLUIDOS
                  <Modal1
                    functionModal1={() => {
                      functionModal1(
                        setMostrarModal1,
                        setMostrarModal3,
                        setMostrarLancar,
                        setDesativaBotoes,
                        setDesativaEspecie
                      );
                    }}
                  />
                )}

               {mostrarModal2 && (
                  <Modal2 setMostrarModal2={setMostrarModal2} />
                )}
                
                {/* Modal de confirma terminar a missão sem fazer lances */}
                {mostrarModal3 && (
                  <Modal3
                    nao={() => {
                      naoConcluirMissao(
                        setMostrarModal3,
                        setDesativaEspecie,
                        setDesativaBotoes,
                        setMostrarLancar
                      );
                    }}
                    sim={simConcluirMissao}
                  />
                )}
                {/* Modal de aviso que nao preencheu tudo na tabela */}
                {mostrarModal4 && (
                  // Não preencheu todos os dados
                  <Modal4
                    functionModal4={() => {
                      setMostrarModal4(false);
                    }}
                  />
                )}

                {/* Modal de aviso que os dados foram salvos com sucesso */}
                {mostrarModal5 && (
                  <Modal5
                    functionModal5={() => {
                      setMostrarModal5(false);
                      localStorage.removeItem("Dados");
                      localStorage.removeItem("mapasPdf");
                      localStorage.removeItem("historicoLances");
                      localStorage.removeItem("mapasDeBordo");
                      localStorage.removeItem("historicoPDF");
                      localStorage.removeItem("dataCompleta");
                      localStorage.removeItem("tabMapasDeBordo");
                      localStorage.removeItem("missaoConcluida");
                      Router.push("/home");
                    }}
                  />
                )}
                {/* Modal que informa algum erro com o salvamento dos dados */}
                {mostrarModal6 && (
                  <Modal6
                    functionModal6={() => {
                      setMostrarModal6(false);
                      localStorage.removeItem("Dados");
                      localStorage.removeItem("mapasPdf");
                      localStorage.removeItem("historicoLances");
                      localStorage.removeItem("mapasDeBordo");
                      localStorage.removeItem("historicoPDF");
                      localStorage.removeItem("dataCompleta");
                      localStorage.removeItem("tabMapasDeBordo");
                      localStorage.removeItem("missaoConcluida");
                      Router.push("/home");
                    }}
                  />
                )}

                {/* Interações do mapa como: TRACKER, DISTANCIA ATÉ UM PONTO.. */}

                <MapInteractionDynamic
                  startLatLng={gpsData}
                  onDirectionChange={(direction: string) =>
                    setDirectionText(direction)
                  }
                />
              </MapContainerDynamic>
            ) : null}
          </div>

          {/* Tooltips para informar o usuário sobre algumas funcionalidades menos aparentes */}

          <TooltipsComponent
            tooltips={tooltips}
            currentStep={currentStep}
            setCurrentStep={setCurrentStep}
            mostrarBotaoConfig={mostrarBotaoConfig}
            geoRasterLayerIsLoaded={geoRasterLayerIsLoaded}
            setGeoRasterLayerIsLoaded={setGeoRasterLayerIsLoaded}
            hideTooltipInfos={hideTooltips}
            setHideToolTipInfos={setHideTooltips}
            hideTooltipGeoRaster={hideTooltipGeoRaster}
            setHideTooltipGeoRaster={setHideTooltipGeoRaster}
            positionT={toolB}
          />
        </div>
      </>
    )
  );
}

export default React.memo(MapContainerX);
