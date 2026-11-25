import Armadilhas from '../models/Armadilhas';
export type CriarArmadilhaBodyRequest={
    modelo:string
    tipo:string 
    forma:string 
}
export type CriarArmadilhaResponse={
    id:number
    modelo:string
    tipo:string 
    forma:string 
    ativo:Boolean
    criado_em:Date
    atualizado_em:Date | null
    deletado_em:Date | null
}
export type GetArmadilhaParamsRequest = {
    id:number
}
export type GetArmadilhaResponse = {
    id:number
    modelo:string
    tipo:string 
    forma:string 
    ativo:Boolean
    criado_em:Date
    atualizado_em:Date | null
    deletado_em:Date | null
}

export type ListarArmadilhasQueryRequest = {
    limit:number
    offset:number
}
export type ListarArmadilhasResponse = {
    armadilhas:Armadilhas[]
    total:number
}