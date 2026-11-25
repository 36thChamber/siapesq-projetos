import Especies from '../models/Especies';
import Lances from '../models/Lances';
export type CriarLanceBodyRequest={
    data:Date,
    id_isca:number|null,
    id_fundo:number|null,
    light_stick:boolean|null,
    id_armadilha:number|null,
    n_lance_armadilhas:number|null,
    n_recolha_armadilhas:number|null,
    n_lance_anzois: number|null,
    n_lance_samburas: number|null,
    n_recolha_anzois: number|null,
    n_recolha_samburas: number|null,
    temperatura_superficie: number|null,
    temperatura_superficie_recolha: number|null,
    latitude_inicial:number,
    longitude_inicial: number,
    latitude_final:number,
    longitude_final: number,
    tempo_procura_minutos:number|null,
    comprimento_total_rede:number|null,
    altura_total_rede:number|null,
    tamanho_malha:number|null,
    inicio_arrasto:Date, 
    final_arrasto:Date,
    profundidade:number|null,
    profundidade_recolha:number|null
}
export type CriarLanceResponse={
    id:number;
    data:Date,
    id_isca:number|null,
    id_fundo:number|null,
    id_armadilha:number|null,
    n_lance_armadilhas:number|null,
    n_recolha_armadilhas:number|null,
    n_lance_anzois: number|null,
    n_lance_samburas: number|null,
    n_recolha_anzois: number|null,
    n_recolha_samburas: number|null,
    temperatura_superficie: number|null,
    temperatura_superficie_recolha: number|null,
    latitude_inicial:number ,
    longitude_inicial: number,
    latitude_final:number,
    longitude_final: number,
    tempo_procura_minutos:number|null,
    comprimento_total_rede:number|null,
    altura_total_rede:number|null,
    tamanho_malha:number|null,
    inicio_arrasto:Date, 
    final_arrasto:Date,
    profundidade:number|null,
    profundidade_recolha:number|null,
    light_stick:boolean|null,
    ativo: boolean;
    criado_em:Date;
    atualizado_em:Date;
    deletado_em:Date;
}
export type GetLanceParamsRequest = {
    id:number
}
export type GetLanceResponse = {
    id:number;
    // especie_lances:Especies[]
    id_missao:number;
    id_isca:number;
    id_armadilha:number;
    lancado_em:Date|null;
    recolhido_em:Date|null
    latitude:string|null
    longitude:string|null
    n_lance_armadilhas:number
    n_recolha_armadilhas:number
    profundidade:number
    ativo: boolean;
    criado_em:Date|null;
    atualizado_em:Date|null;
    deletado_em:Date|null;
}

export type ListarLancesQueryRequest = {
    limit:number
    offset:number
}
export type ListarLancesResponse = {
    Lances:Lances[],
    total:number
}