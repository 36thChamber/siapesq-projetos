import axios from "axios";
import { BASE_API } from "../../resources/BASE_API"
import {
    type_list_especie_response,
    type_get_id_especie_response,
    type_create_especie_body,
    type_create_especie_response,
    type_list_especie_query,
} from "./types/especies-types";


const ESPECIE_ROUTE = `${BASE_API}/siapesq/especies`;

/**
 * Busca a lista de Espécies (GET /siapesq/especies).
 * @param token
 * @param query
 */
async function get_list_especies(token: string, query: type_list_especie_query): Promise<type_list_especie_response> {
    try {
        const { limit, offset } = query;
        const response = await axios.get(ESPECIE_ROUTE, {
            headers: {
                Authorization: `Bearer ${token}`
            },
            params: { limit, offset },
        });

        return response.data;

    } catch (error) {
        console.log('Erro ao buscar Espécies: ', error);
        throw error;
    }
}

/**
 * Busca uma Espécie por ID (GET /siapesq/especies/:id).
 * @param id_especie
 */
async function get_especie_id(id_especie: string): Promise<(type_get_id_especie_response)> {
    
    const token = await window.auth.getToken()
    try {
        const response = await axios.get(`${ESPECIE_ROUTE}/${id_especie}`, {
             headers: {
                Authorization: `Bearer ${token}`
            },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
}

/**
 * Cria uma nova Espécie (POST /siapesq/especies)
 * @param body
 * @param token
 */
async function create_especie(body: type_create_especie_body, token: string): Promise<type_create_especie_response> {
    try {
        const response = await axios.post(ESPECIE_ROUTE, body, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        throw error;
    }
}

export {
    get_list_especies,
    get_especie_id,
    create_especie,
}