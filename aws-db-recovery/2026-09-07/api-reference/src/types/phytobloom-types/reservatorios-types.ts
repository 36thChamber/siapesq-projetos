import Areas_Alertas from "../../models/phytoBloom/Areas_Alertas";
import Reservatorios from "../../models/phytoBloom/Reservatorios";

export interface PosicaoData {
    latitude: string;
    longitude: string;
}


export type CriarReservatorioBody={
    id_usuario: number,
    nome:string,
    prioridade: number;
    posicoes: PosicaoData[];
}

export type CriarReservatorioResponse={
    id:number,
    id_usuario: number,
    nome:string,
    prioridade: number;
    posicoes: PosicaoData[];
}
export type GetReservatorioResponse={
    id:number,
    id_usuario: number,
    nome:string,
    prioridade: number;
    posicoes: PosicaoData[];
    areas_alertas: Areas_Alertas[]
    criado_em:Date
    atualizado_em:Date
    deletado_em:Date
}
export type UpdateReservatorioBody={
    nome?:string,
    id_usuario?: number,
    prioridade?: number;
    posicoes?: PosicaoData[];
    ativo?:boolean
}
export type UpdateReservatorioResponse={
    id:number,
    id_usuario: number,
    nome:string,
    prioridade: number;
    posicoes: PosicaoData[];
    criado_em:Date
    atualizado_em:Date
    deletado_em:Date
}

export type DeleteReservatorio={
    id:number
}

export type ListarReservatorioQueryRequest = {
    limit:number
    offset:number
}
export type ListarReservatorioResponse = {
    reservatorios:Reservatorios[],
    total:number
}