export type type_login = {
    email: string,
    senha: string
}

export type type_usuario = {
    id_usuario: string;
    nome: string
    email: string
    contato: string
    cpf: string
    titulo_cientifico: boolean
    tipo_usuario: TipoUsuario
    email_verificado: boolean
    ultimo_acesso: Date
    criado_em: Date
    atualizado_em: Date
    token?: string
}

export type type_login_response = {
    id_usuario: string;
    nome: string
    email: string
    senha: string
    contato: string
    cpf: string
    titulo_cientifico: boolean
    tipo_usuario: TipoUsuario
    email_verificado: boolean
    ultimo_acesso: Date
    criado_em: Date
    atualizado_em: Date
    token: string
}

export enum TipoUsuario {
    ADMIN = "ADMIN",
    PESQUISADOR = "PESQUISADOR",
    PADRAO = "PADRAO",
}

export type type_register = {
    nome: string,
    email: string,
    senha: string,
    contato: string,
    cpf: string,
    titulo_cientifico: boolean,
    tipo_usuario: TipoUsuario
}

export type type_register_response = {
    id_usuario: string;
    nome: string
    email: string
    contato: string
    cpf: string
    titulo_cientifico: boolean
    tipo_usuario: TipoUsuario
    email_verificado: boolean
    ultimo_acesso: Date
    criado_em: Date
    atualizado_em: Date
    token: string
    email_verification_sent?: boolean
}

export type FormDataType = type_register & {
  confirm_senha: string;
};

export type refresh_response = {
    id_usuario: string;
    nome: string
    email: string
    senha: string
    contato: string
    cpf: string
    titulo_cientifico: boolean
    tipo_usuario: TipoUsuario
    email_verificado: boolean
    ultimo_acesso: Date
    criado_em: Date
    atualizado_em: Date
    token: string
}

export type type_get_id_usuario = {
    id_usuario: string;
    nome: string
    email: string
    contato: string
    cpf: string
    titulo_cientifico: boolean
    tipo_usuario: TipoUsuario
    email_verificado: boolean
    ultimo_acesso: Date
    criado_em: Date
    atualizado_em: Date
    token: string
}

export type type_list_usuarios = {
    usuarios: type_login_response[] // reutilizando type de login por ser igual
}

export type type_update = {
    id_usuario: string
    nome?: string
    email?: string
    senha?: string
    contato?: string
    cpf?: string
    titulo_cientifico?: boolean
    token: string
}

export type type_update_response = {
    id_usuario: string
    nome: string
    email: string
    contato: string
    cpf: string
    titulo_cientifico: boolean
    tipo_usuario: TipoUsuario
    email_verificado: boolean
    ultimo_acesso: Date
    criado_em: Date
    atualizado_em: Date
}

export type send_verificatin_email = {
    id_usuario: string
    email: string
    nome: string
}