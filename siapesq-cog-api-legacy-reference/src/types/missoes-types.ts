import Especies from '../models/Especies';
import Lances from '../models/Lances';
import Missoes from '../models/Missoes';
import { GetArtesDePescaResponse } from './artesDePesca-types';
import { GetEmbarcacaoResponse } from './embarcacao-types';
import { GetEspecieResponse } from './especies-types';
import { GetLanceResponse } from './lances-types';
import { GetUsuarioResponse } from './usuarios-types';
export type CriarMissaoBodyRequest = {
    id_embarcacao: number;
    id_usuario: number;
    iniciou_em: Date
    terminou_em: Date
}
export type CriarMissaoResponse = {
    id: number;
    id_embarcacao: number;
    iniciou_em: Date
    terminou_em: Date
}
export type GetMissaoParamsRequest = {
    id: number
}
export type GetMissaoResponse = {
    id: number;
    id_embarcacao: number;
    iniciou_em: Date
    terminou_em: Date
}

export type ListarMissoesQueryRequest = {
    limit: number
    offset: number
}
export type ListarMissoesResponse = {
    missoes: Missoes[],
    total: number
}

export type GetDetalhesMissaoParamsRequest = {
    id: number
}
export type GetDetalhesMissaoResponse = {
    id: number;
    id_embarcacao: number;
    id_arte_de_pesca: number;
    nome_armador: string;
    iniciou_em: Date;
    terminou_em: Date;
    ativo: boolean;
    criado_em: Date;
    atualizado_em: Date | null;
    deletado_em: Date | null;

    embarcacao: Omit<GetEmbarcacaoResponse, 'ativo' | 'criado_em' | 'atualizado_em' | 'deletado_em' | 'embarcacoes'> & {
        usuario?: Omit<GetUsuarioResponse, 'embarcacoes'>;
    };

    arte_de_pesca: Omit<GetArtesDePescaResponse, 'missoes'>;

    especie_missoes_alvo: GetEspecieResponse[];

    lances: GetLanceResponse[];
}
