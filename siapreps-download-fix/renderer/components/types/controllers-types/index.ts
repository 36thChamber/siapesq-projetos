// types do usuário

import { DadosPescariaArmadilha, DadosPescariaCerco, DadosPescariaEmalhar, DadosPescariaEspinhel } from "../functions-types"

export type body_login = {
    email: string,
    password: string
}

export type body_cadastro = {
    nome: string, 
    email: string, 
    senha: string,
    administracao: boolean,
    documento: string, 
    inscCaptPortos: string, 
    telefone: string
}

//types da embarcação 

export type body_cadastrar_embarcacao = {
    nome:string,
    RGP:string,
    id_mestre:number,
    tamanho:string|null,
    capacidade_estocagem:number|null,
    velocidade_pesca:number|null,
    velocidade_cruzeiro:number|null,
    modalidade_pesca:string|null,
    area_pesca:string|null,
    imagem:string|null
}

export type body_update_embarcacao = {
    nome: string,
    RGP: string,
    id_mestre: number,
    tamanho: string|null,
    capacidade_estocagem: number|null,
    velocidade_pesca: number|null,
    velocidade_cruzeiro: number|null,
    modalidade_pesca: string|null,
    area_pesca: string|null
}

//types de salvar relatorios
export type body_salvar_relatorio = {
    id_especie: Array<Number>, 
    id_arte: number, 
    id_e: number, 
    id_u: number, 
    nome: string, 
    porto_c: number, 
    porto_s: number, 
    data_chegada: Date, 
    data_saida: Date,  
    dados_pescaria: (DadosPescariaArmadilha | DadosPescariaCerco |DadosPescariaEmalhar| DadosPescariaEspinhel)[]
}

//types das especies
export type body_adicionar_especie = {
    nome: string,
    imagem: string|null,
    ativo: boolean
}


//types de iscas
export type body_adicionar_isca = {
    id: number,
    nome: string,
    ativo: boolean,
}

//types de iscas
export type body_adicionar_fundo = {
    id: number,
    nome: string,
    ativo: boolean,
}