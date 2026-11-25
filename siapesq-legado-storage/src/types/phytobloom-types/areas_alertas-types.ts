import Areas_Alertas from "../../models/phytoBloom/Areas_Alertas";

export interface PosicaoData {
    latitude: string;
    longitude: string;
}

export type CriarArea_AlertaBody={
    id_reservatorio:number;
    nome:string;
    regiao_alerta: PosicaoData[]
}

export type CriarArea_AlertaResponse={
    id:number;
    id_reservatorio:number;
    nome:string;
    regiao_alerta: PosicaoData[]
}
export type GetArea_AlertaResponse={
    alertas:Areas_Alertas[]
}
export type UpdateArea_AlertasBody={
    id_reservatorio?:number;
    nome?: string;
    regiao_alerta?: PosicaoData[]
}
export type UpdateArea_AlertaResponse={
    id:number
    id_reservatorio:number;
    nome:string;
    regiao_alerta: PosicaoData[]
}

export type ListarArea_AlertasRequeryRequest = {
    limit:number
    offset:number
}
export type ListarArea_AlertasResponse = {
    areas_alertas:Areas_Alertas[],
    total:number
}