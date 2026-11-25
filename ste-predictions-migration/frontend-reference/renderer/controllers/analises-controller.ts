import axios from "axios";
import { BASE_API } from "../../resources/BASE_API";
import {
  type_register_analise,
  type_register_analise_response,
  type_get_response,
  type_list_analises,
  type_list_analises_response,
  type_update,
  type_update_response,
} from "../../renderer/controllers/types/analises-types";

// GET /siapesq/analises/:id
async function get_analise_id(
  token: string,
  id_analise: string
): Promise<type_get_response> {
  try {
    const response = await axios.get(
      `${BASE_API}/siapesq/analises/${id_analise}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log("Resposta get análise por id:", response.data);
    return response.data;
  } catch (error) {
    console.log("Erro ao buscar análise por id:", error);
    throw error;
  }
}

async function getBy_id_especie(
  token: string,
  id_especie: string
): Promise<type_get_response[]> {
  try {

    const response = await axios.get(
      `${BASE_API}/siapesq/analises/especie/${id_especie}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    
    return response.data;
  } catch (error) {
    throw error;
  }
}

async function get_list_analises(
  token: string,
  query: type_list_analises
): Promise<type_list_analises_response> {
  try {
    const { limit, offset } = query;

    const response = await axios.get(`${BASE_API}/siapesq/analises`, {
      params: { limit, offset },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  } catch (error) {
    throw error;
  }
}

// POST /siapesq/analises
async function create_analise(
  token: string,
  body: type_register_analise
): Promise<type_register_analise_response> {
  try {
    const response = await axios.post(
      `${BASE_API}/siapesq/analises`,
      body,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    throw error;
  }
}

// PUT /siapesq/analises
async function update_analise(
  token: string,
  body: type_update
): Promise<type_update_response> {
  try {
    const response = await axios.put(
      `${BASE_API}/siapesq/analises`,
      body,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    throw error;
  }
}

export {
  get_analise_id,
  getBy_id_especie,
  get_list_analises,
  create_analise,
  update_analise,
};
