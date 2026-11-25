import MarcaMotores from '../models/Marca-Motores';
export type CriarMarcaMotorBodyRequest={
    nome:string
}
export type CriarMarcaMotorResponse={
    id:number
    nome:string
    ativo:Boolean
    criado_em:Date
    atualizado_em:Date | null
    deletado_em:Date | null
}
export type GetMarcaMotorParamsRequest = {
    id:number
}
export type GetMarcaMotorResponse = {
    id:number
    nome:string
    ativo:Boolean
    criado_em:Date
    atualizado_em:Date | null
    deletado_em:Date | null
}

export type ListarMarcaMotoresQueryRequest = {
    limit:number
    offset:number
}
export type ListarMarcaMotoresResponse = {
    marca_motores:MarcaMotores[],
    total:number
}