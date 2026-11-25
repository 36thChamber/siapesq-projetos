import Embarcacoes from "../models/Embarcacoes";

export type CriarEmbarcacaoBody={
    nome:string,
    RGP:string;
    id_mestre:number;
    tamanho:string|null;
    capacidade_estocagem:number|null;
    velocidade_pesca:number|null;
    velocidade_cruzeiro:number|null;
    modalidade_pesca:string|null;
    area_pesca:string|null;
    imagem:string|null;
}

export type CriarEmbarcacaoResponse={
    id:number
    nome:string,
    RGP:string;
    id_mestre:number;
    tamanho:string|null;
    capacidade_estocagem:number|null;
    velocidade_pesca:number|null;
    velocidade_cruzeiro:number|null;
    modalidade_pesca:string|null;
    area_pesca:string|null;
    imagem:string|null;
}
export type GetEmbarcacaoResponse={
    id:number
    nome:string,
    RGP:string;
    id_mestre:number;
    tamanho:string|null;
    capacidade_estocagem:number|null;
    velocidade_pesca:number|null;
    velocidade_cruzeiro:number|null;
    modalidade_pesca:string|null;
    area_pesca:string|null;
    imagem:string|null;
    ativo:boolean
    criado_em:Date
    atualizado_em:Date
    deletado_em:Date
}
export type UpdateEmbarcacaoBody={
    nome?:string,
    RGP?:string;
    id_mestre?:number;
    tamanho?:string|null;
    capacidade_estocagem?:number|null;
    velocidade_pesca?:number|null;
    velocidade_cruzeiro?:number|null;
    modalidade_pesca?:string|null;
    area_pesca?:string|null;
    imagem?:string|null;
    ativo?:boolean
}
export type UpdateEmbarcacaoResponse={
    id:number
    nome:string,
    RGP:string;
    id_mestre:number;
    tamanho:string|null;
    capacidade_estocagem:number|null;
    velocidade_pesca:number|null;
    velocidade_cruzeiro:number|null;
    modalidade_pesca:string|null;
    area_pesca:string|null;
    imagem:string|null;
    ativo:boolean
    criado_em:Date
    atualizado_em:Date
    deletado_em:Date
}

export type ListarEmbarcacaoQueryRequest = {
    limit:number
    offset:number
}
export type ListarEmbarcacaoResponse = {
    embarcacoes:Embarcacoes[],
    total:number
}