import PeixeRFID  from './../models/PeixeRFID';

type CriarPeixeRFIDBodyRequest = {
    id_especie: number;
    id_lance: number;
    latitude: number;
    longitude: number;
    hex: string;
    created: Date;
    deleted: boolean;
};

type CriarPeixeRFIDResponse = PeixeRFID; 

type GetPeixeRFIDParamsRequest = {
    id: number;
};

type GetPeixeRFIDResponse = PeixeRFID | null;

type ListarPeixesRFIDQueryRequest = {
    limit: number;
    offset: number;
};

type ListarPeixesRFIDResponse = {
    peixesRFID: PeixeRFID[];
    total: number;
};

export {
    CriarPeixeRFIDBodyRequest,
    CriarPeixeRFIDResponse,
    GetPeixeRFIDParamsRequest,
    GetPeixeRFIDResponse,
    ListarPeixesRFIDQueryRequest,
    ListarPeixesRFIDResponse,
};

export interface ObterPeixeRFIDParamsRequest {
    id: number;
}

export interface ObterPeixeRFIDResponse {
    id: number;
    id_especie: number;
    id_lance: number;
    latitude: number;
    longitude: number;
    hex: string;
    created: Date;
    deleted: boolean;
}