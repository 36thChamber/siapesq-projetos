import axios from 'axios';
import { getUserToken } from './cookies';
import { BASE_API } from '../resources/api'

async function get_pngs(png) {
    try {
        const token = getUserToken()
        
        const response = await axios.get(`${BASE_API}/mapas/download`, {
            params: { object_name: png },
            headers: {
                Authorization: `Bearer ${token}`
            },
            responseType: 'arraybuffer'
        })
        return response.data;

    } catch (error) {
        throw error
    }
}

async function list_pngs(pagination_token?: string) {
    try {
        const token = getUserToken()
        if (pagination_token) {
            pagination_token = encodeURIComponent(pagination_token)
            const nextPage = await axios.get(`${BASE_API}/mapas?pagination_token=${pagination_token}`, {
                headers: {
                    Authorization: `Bearer ${token}`,

                }
            })
            return nextPage.data;
        } else {
            const response = await axios.get(`${BASE_API}/mapas`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
            return response.data;
        }
    }
    catch (error) {
        throw error
    }
}

async function get_principal_pngs_names() {
  try {
    const token = getUserToken();

    const response = await axios.get(`${BASE_API}/especies_analises`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = response.data;

    return data.especies.map((item: any) => ({
      value: item.id,
      label: item.nome_padrao,
      name: item.nome_cientifico,
    }));

  } catch (error) {
    console.error("Erro ao buscar espécies:", error);
    return [];
  }
}


export { get_pngs, list_pngs, get_principal_pngs_names};