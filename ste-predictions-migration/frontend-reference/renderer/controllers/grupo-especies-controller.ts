import axios from "axios";
import { BASE_API } from "../../resources/BASE_API"
import {
    type_list_grupo_especie_response,
    type_get_id_grupo_especie_response,
    type_create_grupo_especie_body,
    type_create_grupo_especie_response,
    type_list_grupo_especie_query,
    type_list_especies_grupo_response,
} from "./types/grupo-especies-types";

const GRUPO_ESPECIE_ROUTE = `${BASE_API}/siapesq/gruposEspecies`;

/**
 * Busca a lista de Grupos de Espécies (GET /siapesq/gruposEspecies).
 * @param token
 * @param query
 */
async function get_list_grupos_especies(token: string, query: type_list_grupo_especie_query): Promise<type_list_grupo_especie_response> {
    try {
        const { limit, offset } = query;
        const response = await axios.get(GRUPO_ESPECIE_ROUTE, {
            headers: {
                Authorization: `Bearer ${token}`
            },
            params: { limit, offset },
        });

        return response.data;

    } catch (error) {
        console.log('Erro ao buscar Grupos de Espécies: ', error);
        throw error;
    }
}

/**
 * Busca um Grupo de Espécie por ID (GET /siapesq/gruposEspecies/:id).
 * @param id_grupo
 * @param token
 */
async function get_grupo_especie_id(id_grupo: string, token: string): Promise<type_get_id_grupo_especie_response> {
    try {
        const response = await axios.get(`${GRUPO_ESPECIE_ROUTE}/${id_grupo}`, {
             headers: {
                Authorization: `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        throw error;
    }
}

/**
 * Cria um novo Grupo de Espécie (POST /siapesq/gruposEspecies).
 * @param body
 * @param token
 */
async function create_grupo_especie(body: type_create_grupo_especie_body, token: string): Promise<type_create_grupo_especie_response> {
    try {
        const response = await axios.post(GRUPO_ESPECIE_ROUTE, body, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        throw error;
    }
}

/**
 * Lista as Espécies pertencentes a um Grupo (GET /siapesq/gruposEspecies/:id/especies).
 * @param id_grupo
 */
async function get_list_especies_por_grupo(id_grupo: string): Promise<type_list_especies_grupo_response> {
    try {
        const response = await axios.get(`${GRUPO_ESPECIE_ROUTE}/${id_grupo}/especies`);
        
        return response.data;
    } catch (error) {
        throw error;
    }
}

export {
    get_list_grupos_especies,
    get_grupo_especie_id,
    create_grupo_especie,
    get_list_especies_por_grupo,
}