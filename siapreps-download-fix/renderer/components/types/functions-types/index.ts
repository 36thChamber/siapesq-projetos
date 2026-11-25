import { Dispatch, SetStateAction } from "react"
import { body_salvar_relatorio } from "../controllers-types"

export type types_recolher = {
    setCabEspDescartes: Dispatch<SetStateAction<string[]>>,
    setHDadosDescartes:  Dispatch<SetStateAction<string[][]>>,
    setHCabEspDescartes: Dispatch<SetStateAction<string[]>>,
    setCabStatusEs: Dispatch<SetStateAction<string[]>>,
    setHcabStatusEs:Dispatch<SetStateAction<string[]>>
    setCabTabela: Dispatch<SetStateAction<string[]>>,
    setDataPetrecho:Dispatch<SetStateAction<String[][]>>,
    setHistCab: Dispatch<SetStateAction<string[]>>,
    setHistTabela:Dispatch<SetStateAction<String[][]>>,
    
    setLancado:  Dispatch<SetStateAction<boolean>>,
    setMostrarTabela:  Dispatch<SetStateAction<boolean>>,

    setHIdadosEs: Dispatch<SetStateAction<string[][]>>,

    setMostrar3Botoes:  Dispatch<SetStateAction<boolean>>,
    setMostrarConcluir:  Dispatch<SetStateAction<boolean>>,
    setMostrarMissao:  Dispatch<SetStateAction<boolean>>,

    setHistCabE: Dispatch<SetStateAction<string[]>>,

    setLatRec:(value: string) => void,
    setLogRec:(value: string) => void,

    setMostrarRecolher:  Dispatch<SetStateAction<boolean>>,
    setDesativaBotoes:  Dispatch<SetStateAction<boolean>>,
    setMensagemLance:  Dispatch<SetStateAction<boolean>>,

    dadosDescartes: string[][],

    tipoDeArte: string,

    lancamentos: number,

    dataPetrecho: String[][],

    lat: string,
    log: string,

    cabEspDescartes: string[],
    cabStatusEs: string[],
    cabTabela: string[],
    cabEspinhel: string[],
    IdadosEs: string[][]
}

export type types_cancelar = {
    setMostrar3Botoes: Dispatch<SetStateAction<boolean>>;
    setMostrarTabela: Dispatch<SetStateAction<boolean>>;
    setMostrarLancar: Dispatch<SetStateAction<boolean>>;
    setDesativaBotoes: Dispatch<SetStateAction<boolean>>;
    setMostrarConcluir: Dispatch<SetStateAction<boolean>>;
    setMostrarMissao: Dispatch<SetStateAction<boolean>>;
    setDesativaEspecie: Dispatch<SetStateAction<boolean>>;
    setDesativaConcluir: Dispatch<SetStateAction<boolean>>;
    setLancado: Dispatch<SetStateAction<boolean>>;
    
    setCabEspinhel: Dispatch<SetStateAction<string[]>>;
    setCabTabela: Dispatch<SetStateAction<string[]>>;
    setLancamentos: Dispatch<SetStateAction<number>>;
    setDataPetrecho: Dispatch<SetStateAction<String[][]>>;
    histTabela: string[][];
    setCabLanceExtras: Dispatch<SetStateAction<string[]>>;
    setCabEspecieExtras: Dispatch<SetStateAction<string[]>>;
    setDadosExtrasEs: Dispatch<SetStateAction<string[][]>>;
    setCabLanceDescartes: Dispatch<SetStateAction<string[]>>;
    setCabEspDescartes: Dispatch<SetStateAction<string[]>>;
    setDadosDescartes: Dispatch<SetStateAction<string[][]>>;
    HcabLanceDescartes: string[];
    HcabEspDescartes: string[];
    HdadosDescartes: string[][];
    setCabLanceEs: Dispatch<SetStateAction<string[]>>;
    setCabStatusEs: Dispatch<SetStateAction<string[]>>;
    HcabLanceEs: string[];
    HcabStatusEs: string[];
    setMensagemLance: Dispatch<SetStateAction<boolean>>;
    setMostrarRecolher: Dispatch<SetStateAction<boolean>>;
    setIDadosEs: Dispatch<SetStateAction<string[][]>>;
    HIdadosEs: string[][];
    lancado: boolean;
    histCabE: string[];
    histCab: string[];
    lancamentos: number;
    HcabLanceExtras: string[];
    HcabEspecieExtras: string[];
    HdadosExtrasEs: string[][];
    tipoDeArte: string;
}

export interface Fundo {
    id: string;
    nome: string;
  }
export interface Isca {
    id: string;
    nome: string;
  }
export type types_handle_petrecho = {
    setCabLanceDescartes: Dispatch<SetStateAction<string[]>>;
    setCabEspDescartes: Dispatch<SetStateAction<string[]>>;
    setHCabLanceDescartes: Dispatch<SetStateAction<string[]>>;
    setHCabEspDescartes: Dispatch<SetStateAction<string[]>>;
    setCabLanceEs: Dispatch<SetStateAction<string[]>>;
    setCabStatusEs: Dispatch<SetStateAction<string[]>>;
    setHCabLanceEs: Dispatch<SetStateAction<string[]>>;
    setHcabStatusEs: Dispatch<SetStateAction<string[]>>;
    setCabTabela: Dispatch<SetStateAction<string[]>>;
    setCabEspinhel: Dispatch<SetStateAction<string[]>>;
    setDataPetrecho: Dispatch<SetStateAction<String[][]>>;
    setHistCab: Dispatch<SetStateAction<string[]>> ;
    setHistTabela: Dispatch<SetStateAction<String[][]>>;
    setMostrarBIncidentais: Dispatch<SetStateAction<boolean>>;
    setMostrarBDescartes: Dispatch<SetStateAction<boolean>>;
    setLancado: Dispatch<SetStateAction<boolean>>;
    setMostrarTabela: Dispatch<SetStateAction<boolean>>;
    setMostrarLancar: Dispatch<SetStateAction<boolean>>;
    setMostrar3Botoes: Dispatch<SetStateAction<boolean>>;
    setMostrarConcluir: Dispatch<SetStateAction<boolean>>;
    setMostrarMissao: Dispatch<SetStateAction<boolean>>;
    setDesativaConcluir: Dispatch<SetStateAction<boolean>>;
    setDesativaEspecie: Dispatch<SetStateAction<boolean>>;
    setIscas: Dispatch<SetStateAction<Isca[]>>;
    setFundos: Dispatch<SetStateAction<Fundo[]>>;
    setLancamentos: Dispatch<SetStateAction<number>>;
    setCabEm: Dispatch<SetStateAction<string[]>>;
  
    tipoDeArte: string;
    lancamentos: number;
    dataPetrecho:String[][];
    lat: string;
    log: string;
    cabLanceDescartes: string[];
    cabEspDescartes: string[];
    cabLanceEs: string[];
    cabStatusEs: string[];
    cabTabela: string[];
    cabEspinhel: string[];
    cabEm: string[];
  }

export interface Usuario {
    id: string;
    nome: string;
    insc_capt_portos: string;
    documento: string;
    email: string;
    telefone: string;
    ativo: boolean;
    criado_em: string; // ou Date, dependendo do uso
    atualizado_em: string; // ou Date, dependendo do uso
    deletado_em: string | null; // ou Date | null, dependendo do uso
  }

export type types_salvar  = {
    setCabLanceDescartes: Dispatch<SetStateAction<string[]>>;
    setCabEspDescartes: Dispatch<SetStateAction<string[]>>;
    setHCabLanceDescartes: Dispatch<SetStateAction<string[]>>;
    setHCabEspDescartes: Dispatch<SetStateAction<string[]>>;
    setCabLanceEs:Dispatch<SetStateAction<string[]>>;
    setCabStatusEs: Dispatch<SetStateAction<string[]>>;
    setHCabLanceEs: Dispatch<SetStateAction<string[]>>;
    setHcabStatusEs: Dispatch<SetStateAction<string[]>>,
    setCabTabela: Dispatch<SetStateAction<string[]>>,
    setCabEspinhel:Dispatch<SetStateAction<string[]>>;
    setDataPetrecho: Dispatch<SetStateAction<(string|String)[][]>>;
    setMostrarBIncidentais: Dispatch<SetStateAction<boolean>>;
    setMostrarBDescartes: Dispatch<SetStateAction<boolean>>;
    setLancado: Dispatch<SetStateAction<boolean>>;
    setMostrarTabela: Dispatch<SetStateAction<boolean>>;
    setMostrarLancar: Dispatch<SetStateAction<boolean>>;
    setMostrar3Botoes: Dispatch<SetStateAction<boolean>>;
    setMostrarConcluir: Dispatch<SetStateAction<boolean>>;
    setMostrarMissao: Dispatch<SetStateAction<boolean>>;
    setDesativaConcluir: Dispatch<SetStateAction<boolean>>;
    setDesativaEspecie: Dispatch<SetStateAction<boolean>>;
    setLancamentos: Dispatch<SetStateAction<number>>;
    setCabEm:Dispatch<SetStateAction<string[]>>;
    setHIdadosEs:Dispatch<SetStateAction<string[][]>>;
    setMostrarRecolher: Dispatch<SetStateAction<boolean>>;
    setDesativaBotoes: Dispatch<SetStateAction<boolean>>;
    setMensagemLance: Dispatch<SetStateAction<boolean>>;
    setDadosDescartes: Dispatch<SetStateAction<string[][]>>;
    setIDadosEs: Dispatch<SetStateAction<string[][]>>;
    setDadosEm: Dispatch<SetStateAction<string[][]>>;
    setTabelaDate: Dispatch<SetStateAction<string[][]>>;
    setEspecieExtra: Dispatch<SetStateAction<string[]>>;
    setEspeciesDescartadas:Dispatch<SetStateAction<string[]>>;
    setMostrarModal4: Dispatch<SetStateAction<boolean>>;
    setMostrarModal1: Dispatch<SetStateAction<boolean>>;
    setMostrarConfig: Dispatch<SetStateAction<boolean>>;
    setMostrarBotaoConfig: Dispatch<SetStateAction<boolean>>;
    
    dadosDescartes: string[][];
    tipoDeArte: string;
    lancamentos: number;
    dataPetrecho: String[][];
    IdadosEs: string[][];
    lancado: boolean;
    nomeEspecie: string;
    latRec: string;
    logRec: string;
    dadosDaViagem: string[];
    dadosViagemId: number[];
    dadosUsuario: Usuario;
    tabelaDate: string[][];
    dadosEm: string[][];
    mapaEscolhido: string[][];
}

export type type_sincronizar= {
  conexaoDaApi: (conectada: any) => Promise<any>,
  tipoDeArte: string,
  latRec: string,
  logRec: string,
  nomeEspecie: string,
  salvarDadosRelatorio: (relatorio: body_salvar_relatorio) => Promise<boolean>,
  setMostrarModal5: Dispatch<SetStateAction<boolean>>,
  setMostrarModal6: Dispatch<SetStateAction<boolean>>
}

export type types_missao_concluida = {
  dadosDeConclusao: any[],  //deixei any por que dentro desse array passado temos 2 tipos de dados string e date, any fica mais facil
  comp: string,
  alturaS: string,
  setDesativaBotoes: Dispatch<SetStateAction<boolean>>,
  setConcluindoMissao: Dispatch<SetStateAction<boolean>>,
  setDesativaEspecie: Dispatch<SetStateAction<boolean>>,
  setMostrarLancar: Dispatch<SetStateAction<boolean>>,
  setMostrarModal3: Dispatch<SetStateAction<boolean>>,
  conexaoDaApi: (conectada: any) => Promise<any>,
  tipoDeArte: string,
  latRec: string,
  logRec: string,
  nomeEspecie: string,
  salvarDadosRelatorio:  (relatorio: body_salvar_relatorio) => Promise<boolean>,
  setMostrarModal5: Dispatch<SetStateAction<boolean>>,
  setMostrarModal6: Dispatch<SetStateAction<boolean>>
}


//Types do dadosPescaria
export interface DadosPescariaArmadilha {
  data: Date;
  n_lance_armadilhas: number;
  n_recolha_armadilhas: number;
  latitude_inicial: number;
  longitude_inicial: number;
  latitude_final: number;
  longitude_final: number;
  inicio_arrasto: Date;
  final_arrasto: Date;
  profundidade: number;
  especies: any[]; // Defina o tipo específico de `especies` conforme necessário
  id_fundo: number;
  id_isca: number;
}

export interface DadosPescariaEspinhel {
  data: Date;
  latitude_inicial: number;
  longitude_inicial: number;
  latitude_final: number;
  longitude_final: number;
  inicio_arrasto: Date;
  final_arrasto: Date;
  profundidade: number;
  profundidade_recolha: number;
  light_stick: boolean;
  especies: any[];
  id_isca: number;
  n_anzois: number;
  n_samburas: number;
  n_anzois_recolha: number;
  n_samburas_recolha: number;
  temperatura_superficie: number;
  temperatura_superficie_recolha: number;
  dados_descartes: any[];
  dados_incidentais_espinhel: any[];
}

export interface DadosPescariaCerco {
  data: Date;
  latitude_inicial: number;
  longitude_inicial: number;
  latitude_final: number;
  longitude_final: number;
  inicio_arrasto: Date;
  final_arrasto: Date;
  especies: any[];
  tempo_procura_minutos: number;
  temperatura_superficie: number;
  profundidade: number;
}

export interface DadosPescariaEmalhar {
  data: Date;
  latitude_inicial: number;
  longitude_inicial: number;
  latitude_final: number;
  longitude_final: number;
  inicio_arrasto: Date;
  final_arrasto: Date;
  comprimento_total_rede: number;
  altura_total_rede: number;
  tamanho_malha: number;
  profundidade: number;
  especies: any[];
  dados_incidentais_emalhe: any[];
}

