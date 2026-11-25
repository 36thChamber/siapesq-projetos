import QueryString from "qs";
import Alertas from "../../models/phytoBloom/Alertas";

export type CriarAlertaBody={
    id_reservatorio:number;
    data_alerta:Date;
    hora_alerta:Date;
    nivel_critico: string;
    tipo: string;
    id_area_alerta: number;
}

export type CriarAlertaBulkBody={
    alertas:CriarAlertaBody[]
}

export type CriarAlertaResponse={
    id:number;
    id_reservatorio:number;
    data_alerta:Date;
    hora_alerta:Date;
    nivel_critico: string;
    tipo: string;
    id_area_alerta: number;
    criado_em:Date;
    atualizado_em:Date;
    deletado_em:Date;
}
export type GetAlertaResponse={
    id:number;
    id_reservatorio:number;
    data_alerta:Date;
    hora_alerta:Date;
    nivel_critico: string;
    tipo:string;
    id_area_alerta: number;
    criado_em:Date;
    atualizado_em:Date;
    deletado_em:Date;
}
export type UpdateAlertasBody={
    
    id_reservatorio?:number;
    data_alerta?:Date;
    hora_alerta?:Date;
    nivel_critico?: string;
    tipo?: string;
    id_area_alerta?: number;
}
export type UpdateAlertaResponse={
    id:number
    id_reservatorio:number;
    data_alerta:Date;
    hora_alerta:Date;
    nivel_critico: string;
    tipo?: string,
    id_area_alerta?: number;
    criado_em:Date
    atualizado_em:Date
    deletado_em:Date
}

export type ListarAlertasRequeryRequest = {
    limit:number
    offset:number
    data_inicio?: string | QueryString.ParsedQs | (string | QueryString.ParsedQs)[] | undefined
    data_fim?: string | QueryString.ParsedQs | (string | QueryString.ParsedQs)[] | undefined
}
export type ListarAlertasResponse = {
    alertas:Alertas[],
    total:number
}

