import ArtesDePesca from "../models/ArtesDePesca"
import Missoes from "../models/Missoes"

export type GetArtesDePescaParamsRequest = {
    id:number
}

export type GetArtesDePescaResponse = {
    id: Number,
    missoes: Missoes[],
    nome: String,
    ativo: Boolean,
    criado_em: Date,
    atualizado_em: Date,
    deletado_em: Date
}

export type ListaArtesResponse = {
    artesDePesca: ArtesDePesca[],
    total: number
}

export type ListarArtesQueryRequest = {
    limit: number,
    offset: number
}
