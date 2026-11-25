import Fundos from '../models/Fundos';
export type CriarFundoBodyRequest={
    nome:string
}
export type CriarFundoResponse={
    id:number
    nome:string
    ativo:Boolean
    criado_em:Date
    atualizado_em:Date | null
    deletado_em:Date | null
}
export type GetFundoParamsRequest = {
    id:number
}
export type GetFundoResponse = {
    id:number
    nome:string
    ativo:Boolean
    criado_em:Date
    atualizado_em:Date | null
    deletado_em:Date | null
}

export type ListarFundosQueryRequest = {
    limit:number
    offset:number
}
export type ListarFundosResponse = {
    fundos:Fundos[],
    total:number
}