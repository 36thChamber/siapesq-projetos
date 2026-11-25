import axios from "axios";
import { BASE_API } from "../../resources/BASE_API";

type TipoObjetoBucket = {
  key: string;
  lastModified?: string;
  size?: number;
};

type type_list_analises_bucket_response = {
  objetos: TipoObjetoBucket[];
  paginationtoken?: string | null;
};

type type_register_analise_response = {
  id_analise: string;
  id_especie: string;
  nome_pasta: string;
  nome_arquivo: string;
  nome_arquivo_30?: string;
};

type type_list_analises_response = {
  analises: type_register_analise_response[];
  total: number;
};

type type_list_analises = {
  limit: number;
  offset: number;
};

// -=-=-=-= Função de conexão com a api externa =-=-=-=-=-=-
export async function list_analises_bucket(token: string, paginationtoken?: string): Promise<type_list_analises_bucket_response> {
  try {
    const response = await axios.get(`${BASE_API}/siapesq/analisesBucket`, {
      params: { paginationtoken },
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Resposta da listagem de análises bucket: ', response);
    return response.data;
  } catch (error) {
    console.log('Erro ao listar análises bucket: ', error);
    throw error;
  }
}

export async function download_analise_tiff_buffer(token: string, objectname: string): Promise<Buffer> {
  try {
    console.log("Iniciando download do TIFF: ", objectname);
    const response = await axios.get(`${BASE_API}/siapesq/analisesBucket/download?object_name=${objectname}`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'arraybuffer'
    });
    console.log('TIFF baixado com sucesso: ', objectname);
    return Buffer.from(response.data);
  } catch (error) {
    console.log(`Erro ao baixar TIFF ${objectname}: `, error);
    throw error;
  }
}

export async function download_analise_csv(token: string, objectname: string): Promise<Buffer> {
  try {
    console.log("Iniciando download do csv: ", objectname);
    const response = await axios.get(`${BASE_API}/siapesq/analisesBucket/downloadCsv?object_name=${objectname}`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'arraybuffer'
    });
    console.log('CSV baixado com sucesso: ', objectname);
    return Buffer.from(response.data);
  } catch (error) {
    console.log(`Erro ao baixar CSV ${objectname}: `, error);
    throw error;
  }
}

// -=-=-=-= Função para listar os tipos de analises =-=-=-=-=-=-

export async function get_list_analises(
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

    console.log("Resposta listar análises:", response.data);
    return response.data;
  } catch (error) {
    console.log("Erro ao listar análises:", error);
    throw error;
  }
}