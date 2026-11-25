import Iscas from '../models/Iscas';
export type CriarIscaBodyRequest={
    nome:string
}
export type CriarIscaResponse={
    id:number
    nome:string
    ativo:Boolean
    criado_em:Date
    atualizado_em:Date | null
    deletado_em:Date | null
}
export type GetIscaParamsRequest = {
    id:number
}
export type GetIscaResponse = {
    id:number
    nome:string
    ativo:Boolean
    criado_em:Date
    atualizado_em:Date | null
    deletado_em:Date | null
}

export type ListarIscasQueryRequest = {
    limit:number
    offset:number
}
export type ListarIscasResponse = {
    iscas:Iscas[],
    total:number
}