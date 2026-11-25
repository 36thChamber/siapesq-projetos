import Motores from '../models/Motores';
export type CriarMotorBodyRequest={
    nome:string
    id_marca:number,
    potencia:number
}
export type CriarMotorResponse={
    id:number
    nome:string
    id_marca:number,
    potencia:number
    ativo:Boolean
    criado_em:Date
    atualizado_em:Date | null
    deletado_em:Date | null
}
export type GetMotorParamsRequest = {
    id:number
}
export type GetMotorResponse = {
    id:number
    nome:string
    id_marca:number,
    potencia:number
    ativo:Boolean
    criado_em:Date
    atualizado_em:Date | null
    deletado_em:Date | null
}

export type ListarMotoresQueryRequest = {
    limit:number
    offset:number
}
export type ListarMotoresResponse = {
    motores:Motores[],
    total:number
}