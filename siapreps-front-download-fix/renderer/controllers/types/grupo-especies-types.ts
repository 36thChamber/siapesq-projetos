export type type_grupo_especie_model = {
    id_gruposespecies: string;
    nome: string;
    quantidade: number;
    criado_em: Date;
    atualizado_em: Date;
    deletado_em: Date | null;
}

export type type_create_grupo_especie_body = {
    nome: string;
    quantidade: number;
};

export type type_create_grupo_especie_response = {
    id_gruposespecies: string;
    nome: string;
    quantidade: number;
};

export type type_list_grupo_especie_query = {
    limit: number;
    offset: number;
};

export type type_list_grupo_especie_response = {
    gruposEspecies: type_grupo_especie_model[];
    total: number;
};

export type type_get_id_grupo_especie_response = {
    id_gruposespecies: string;
    nome: string;
    quantidade: number;
    criado_em: Date;
    atualizado_em: Date;
    deletado_em: Date | null;
}

export type type_especie_do_grupo = {
    id_especie: string | number; 
    nome: string; 
    nome_cientifico: string;
}

export type type_list_especies_grupo_response = {
    especies: type_especie_do_grupo[];
};