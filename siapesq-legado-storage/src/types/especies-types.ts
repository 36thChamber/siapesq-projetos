import Especies from '../models/Especies';
export type CriarEspecieBodyRequest={
    nome:string
    image:string
}
export type CriarEspecieResponse={
    id:number
    nome:string
    imagem:string
    ativo:Boolean
    criado_em:Date
    atualizado_em:Date | null
    deletado_em:Date | null
}
export type GetEspecieParamsRequest = {
    id:number
}
export type GetEspecieResponse = {
    id:number
    nome:string
    imagem:string
    ativo:Boolean
    criado_em:Date
    atualizado_em:Date | null
    deletado_em:Date | null
}

export type ListarEspeciesQueryRequest = {
    limit:number
    offset:number
}
export type ListarEspeciesResponse = {
    especies:Especies[],
    total:number
}