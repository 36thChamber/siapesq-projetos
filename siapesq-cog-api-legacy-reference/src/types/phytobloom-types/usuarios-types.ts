import Reservatorios from "../../models/phytoBloom/Reservatorios"
import Usuarios from "../../models/phytoBloom/Usuarios"

export type UsuarioLoginRequestBody={
    email:string
    senha:string
}
export type UsuarioLoginResponse={
    id:number
    nome:string
    documento:string
    email:string
    ativo: boolean
    user_verify:boolean
    criado_em:Date
    atualizado_em:Date
    token:string
}
export type CriarUsuarioBody={
    nome:string
    documento:string
    email:string
    senha:string
    ativo: boolean
    user_verify:boolean
    telefone:string
}

export type CriarUsuarioResponse={
    id:number
    nome:string
    documento:string
    email:string
    ativo: boolean
    user_verify:boolean
    telefone:string
    token:string
}
export type GetUsuarioResponse={
    id:number
    nome:string
    email:string
    documento:string
    telefone:string
    ativo:boolean
    user_verify: boolean
    criado_em:Date
    atualizado_em:Date
    deletado_em:Date,
    reservatorios: Reservatorios[]
}
export type UpdateUsuarioBody={
    nome?:string
    email?:string
    documento?:string
    telefone?:string   
    ativo?:boolean
    user_verify?: boolean
    senha?:string
    antiga_senha?:string
}
export type UpdateUsuarioResponse={
    id:number
    nome:string
    email:string
    telefone:string
    documento:string
    ativo:boolean
    user_verify: boolean
    criado_em:Date
    atualizado_em:Date
    deletado_em:Date
}
export type ListarUsuarios = {
    limit:number
    offset:number
}

export type ListarUsuariosResponse = {
    usuarios:Usuarios[],
    total:number
}
export type DeleteUsuarioBody={
    email:string
    }
    
export type DeleteUsuarioResponse={
    id:number
    email:string
    telefone:string
    }