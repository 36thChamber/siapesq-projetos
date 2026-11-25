export type CriarUsuarioAtivoBody={
    id_user:number
    email:string
    telefone:string
    tipo_assinatura: string
    ativo: boolean
    data_criacao:Date
    data_fim:Date
}
export type CriarUsuarioAtivoResponse={
    id:number
    id_user:number
    email:string
    telefone:string
    tipo_assinatura: string
    ativo: boolean
    data_criacao:Date
    data_fim:Date
}
export type GetUsuarioAtivoResponse={
    id:number
    id_user:number
    email:string
    telefone:string
    tipo_assinatura: string
    ativo: boolean
    data_criacao:Date
    data_fim:Date
}

export type UpdateUsuarioAtivoBody={
    id:number
    id_user:number
    email:string
    telefone:string
    tipo_assinatura: string
    data_fim:Date
    data_criacao:Date
    ativo: boolean
}

export type UpdateUsuarioAtivoResponse={
    id_user:number
    email:string
    telefone:string
    tipo_assinatura: string
    ativo: boolean
    data_fim:Date
    data_criacao:Date
}

export type DeleteUsuarioAtivoBody={
    email:string
    }
    
export type DeleteUsuarioAtivoResponse={
    id:number
    email:string
    telefone:string
    }