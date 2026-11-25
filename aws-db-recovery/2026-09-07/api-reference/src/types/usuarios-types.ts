import Embarcacoes from "../models/Embarcacoes"
import UsuariosAtivos from "../models/UsuariosAtivos"

export type UsuarioLoginRequestBody={
    email:string
    senha:string
}
export type UsuarioLoginResponse={
    id:number
    nome:string
    email:string
    criado_em:Date
    atualizado_em:Date
    token:string
}
export type CriarUsuarioBody={
    nome:string
    email:string
    senha:string
    telefone:string
    insc_capt_portos:string
    documento:string
}

export type CriarUsuarioResponse={
    id:number
    nome:string
    email:string
    telefone:string
    insc_capt_portos:string
    documento:string
    token:string
}
export type GetUsuarioResponse={
    id:number
    nome:string
    administracao: boolean
    insc_capt_portos:string
    documento:string
    email:string
    telefone:string
    ativo:boolean
    criado_em:Date
    atualizado_em:Date
    deletado_em:Date
    embarcacoes: Array<Embarcacoes>
}
export type UpdateUsuarioBody={
    nome?:string
    email?:string
    telefone?:string
    senha?:string
    antiga_senha?:string
    insc_capt_portos?:string
    documento?:string
    ativo?: boolean
}
export type UpdateUsuarioResponse={
    id:number
    nome:string
    email:string
    telefone:string
    insc_capt_portos:string
    documento:string
    ativo:boolean
    criado_em:Date
    atualizado_em:Date
    deletado_em:Date
}

export type ListarUsuariosAtivos = {
    limit:number
    offset:number
}

export type ListarUsuariosAtivosReponse = {
    usuariosAtivos:UsuariosAtivos[],
    total:number
}