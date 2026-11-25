import { BASE_API } from "../../resources/BASE_API";
import axios from "axios";
import {
  type_artigo_response,
  type_list_artigos_query,
  type_list_artigos_response,
} from "./types/artigos-types";

export const ARTIGO_ROUTE = `${BASE_API}/siapesq/artigos`;

/**
 * Busca a lista de Artigos (GET /siapesq/artigos).
 * @param token
 * @param query
 */
export async function get_list_artigos(
  token: string,
  query: type_list_artigos_query
): Promise<type_list_artigos_response> {
  try {
    const { limit, offset } = query;

    const response = await axios.get(ARTIGO_ROUTE, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: { limit, offset },
    });

    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Busca artigo por id (GET /siapesq/artigos/:id_artigo).
 * @param token
 * @param id_artigo
 */
export async function get_artigo_by_id(
  token: string,
  id_artigo: number
): Promise<type_artigo_response> {
  try {
    const response = await axios.get(`${ARTIGO_ROUTE}/${id_artigo}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  } catch (error) {
    throw error;
  }
}
