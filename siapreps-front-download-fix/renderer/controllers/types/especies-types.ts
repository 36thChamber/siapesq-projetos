export type type_especie_model = {
    id: number;
    nome: string;
    imagem?: string;
    ativo: boolean;
    criado_em: Date;
    atualizado_em: Date;
    deletado_em: Date | null;
}

export type type_create_especie_body = {
    nome: string;
    nome_cientifico: string;
    id_gruposespecies: string;
    pesquisador: string;
};

export type type_create_especie_response = {
    id_especies: string;
    nome: string;
    nome_cientifico: string;
    id_gruposespecies: string;
    pesquisador: string;
};

export type type_list_especie_query = {
    limit: number;
    offset: number;
};

export type type_list_especie_response = {
    especies: type_especie_model[];
    total: number;
};

export type type_get_id_especie_response = {
    id_especies: string;
    nome: string;
    nome_cientifico: string;
    id_gruposespecies: string;
    pesquisador: string;
    criado_em: Date;
    atualizado_em: Date;
    deletado_em: Date | null;

    informacoes: {
        id_informacaoespecie: string;
        tipo_informacao: string;
        informacao: string;
        descricao: string;
        fonte_referencia: string;
        link_fonte: string;
        referencia_coompleta: string;
        referencia_texto: string;
        criado_em: Date;
        atualizado_em: Date;
        deletado_em: Date | null;
    }[];
};

export type type_update_especie_body = {
    id_especies: string;
    nome: string;
    nome_cientifico: string;
    id_gruposespecies: string;
    pesquisador: string;
    criado_em: Date;
    atualizado_em: Date;
    deletado_em: Date | null;
};

export type type_update_especie_response = type_update_especie_body;