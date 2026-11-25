import Portos from '../models/Portos';
export type CriarPortoBodyRequest={
    nome:string
}
export type CriarPortoResponse={
    id:number
    nome:string
    ativo:Boolean
    criado_em:Date
    atualizado_em:Date | null
    deletado_em:Date | null
}
export type GetPortoParamsRequest = {
    id:number
}
export type GetPortoResponse = {
    id:number
    nome:string
    ativo:Boolean
    criado_em:Date
    atualizado_em:Date | null
    deletado_em:Date | null
}

export type ListarPortosQueryRequest = {
    limit:number
    offset:number
}
export type ListarPortosResponse = {
    portos:Portos[],
    total:number
}