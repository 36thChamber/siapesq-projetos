export type LanceEspecie={
    id:number|null,
    quantidade: number|null,
    peso:number|null
}
export type EmalheIncidentes={
    nome:string|null,
    quantidade:number|null,
}
export type EspinhelIncidentes={
    nome:string|null,
    vivos:number|null,
    mortos:number|null
}
export type Descartes={
    id:number|null,
    vivos:number|null,
    mortos:number|null
}
export type Lance={
    data:Date,
    id_isca:number|null,
    id_fundo:number|null,
    light_stick:boolean|null,
    id_armadilha:number|null,
    n_lance_armadilhas:number|null,
    n_recolha_armadilhas:number|null,
    n_anzois: number|null,
    n_samburas: number|null,
    n_anzois_recolha: number|null,
    n_samburas_recolha: number|null,
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
    especies:Array<LanceEspecie>,
    dados_incidentais_emalhe:Array<EmalheIncidentes>,
    dados_incidentais_espinhel:Array<EspinhelIncidentes>,
    dados_descartes:Array<Descartes>
}


export type SalvarDadosRelatorioBodyRequest={
    id_embarcacao: number
    id_usuario: number
    nome_armador:string,
    especie_alvo: Array<[number]>
    porto_chegada:number
    porto_saida:number
    data_chegada:Date
    data_saida:Date
    dados_pescaria:Array<Lance>
    id_arte_de_pesca:number
}
export type SalvarDadosRelatorioResponse={
    id_embarcacao: number
    id_usuario: number
    porto_chegada:number
    porto_saida:number
    data_chegada:Date
    data_saida:Date
    dados_pescaria:Array<Lance>
}
export type UploadRelatorioBodyRequest={
    nome:string
    id_embarcacao: number
    id_usuario: number
    
}
export type UploadRelatorioResponse={
    id: number
    nome:string
    uri:string
    id_embarcacao: number
    id_usuario: number
}
