import axios from "axios";
import { BASE_API } from "../../resources/BASE_API"
import {
    type_list_informacao_especie_response,
    type_get_id_informacao_especie_response,
    type_create_informacao_especie_body,
    type_create_informacao_especie_response,
    type_list_informacao_especie_query,
    type_update_informacao_especie_body,
    type_update_informacao_especie_response,
    type_delete_informacao_especie_response,
} from "./types/informacoes-especies-types";

const INFO_ESPECIE_ROUTE = `${BASE_API}/siapesq/informacoesEspecies`;

/**
 * Busca a lista de Informações de Espécies (GET /siapesq/informcoesEspecies).
 * @param token
 * @param query
 */
async function get_list_informacoes_especies(token: string, query: type_list_informacao_especie_query): Promise<type_list_informacao_especie_response> {
    try {
        const { limit, offset } = query;
        const response = await axios.get(INFO_ESPECIE_ROUTE, {
            headers: {
                Authorization: `Bearer ${token}`
            },
            params: { limit, offset },
        });

        console.log('Resposta da busca de Informações de Espécies: ', response);
        return response.data;

    } catch (error) {
        console.log('Erro ao buscar Informações de Espécies: ', error);
        throw error;
    }
}

/**
 * Busca uma Informação de Espécie por ID (GET /siapesq/informcoesEspecies/:id).
 * @param id_informacao
 * @param token
 */
async function get_informacao_especie_id(id_informacao: string, token: string): Promise<type_get_id_informacao_especie_response> {
    try {
        const response = await axios.get(`${INFO_ESPECIE_ROUTE}/${id_informacao}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        console.log(`Resposta da busca de Informação ${id_informacao}: `, response);
        return response.data;
    } catch (error) {
        console.log(`Erro ao buscar Informação ${id_informacao}: `, error);
        throw error;
    }
}

/**
 * Cria uma nova Informação de Espécie (POST /siapesq/informcoesEspecies).
 * @param body
 * @param token
 */
async function create_informacao_especie(body: type_create_informacao_especie_body, token: string): Promise<type_create_informacao_especie_response> {
    try {
        const response = await axios.post(INFO_ESPECIE_ROUTE, body, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        console.log('Resposta da criação de Informação de Espécie: ', response);
        return response.data;
    } catch (error) {
        console.log('Erro ao criar Informação de Espécie: ', error);
        throw error;
    }
}

/**
 * Atualiza uma Informação de Espécie (PUT/PATCH /siapesq/informcoesEspecies).
 * @param body
 * @param token
 */
async function update_informacao_especie(body: type_update_informacao_especie_body, token: string): Promise<type_update_informacao_especie_response> {
    try {
        const response = await axios.put(INFO_ESPECIE_ROUTE, body, { 
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        console.log('Resposta da atualização de Informação de Espécie: ', response);
        return response.data;
    } catch (error) {
        console.log('Erro ao atualizar Informação de Espécie: ', error);
        throw error;
    }
}


/**
 * Deleta uma Informação de Espécie (DELETE /siapesq/informcoesEspecies/:id).
 * @param id_informacao
 * @param token
 */
async function delete_informacao_especie(id_informacao: string, token: string): Promise<type_delete_informacao_especie_response> {
    try {
        const response = await axios.delete(`${INFO_ESPECIE_ROUTE}/${id_informacao}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        console.log(`Resposta da deleção de Informação ${id_informacao}: `, response);
        return response.data;
    } catch (error) {
        console.log(`Erro ao deletar Informação ${id_informacao}: `, error);
        throw error;
    }
}


export {
    get_list_informacoes_especies,
    get_informacao_especie_id,
    create_informacao_especie,
    update_informacao_especie,
    delete_informacao_especie,
}