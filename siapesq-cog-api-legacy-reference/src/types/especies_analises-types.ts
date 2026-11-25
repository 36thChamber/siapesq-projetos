import Especies_analises from '../models/Especies_analises';

export type GetEspeciesAnalisesParamsRequest = {
    id:number
}
export type GetEspeciesAnalisesResponse = {
    id:number
    nome_padrao:string
    nome_cientifico:string
}

export type ListarEspeciesAnalisesQueryRequest = {
    limit:number
    offset:number
}
export type ListarEspeciesAnalisesResponse = {
    especies:Especies_analises[],
    total:number
}