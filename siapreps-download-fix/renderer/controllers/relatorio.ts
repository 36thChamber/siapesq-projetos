import axios from 'axios';
import { getUserToken } from './cookies';
import {BASE_API} from '../resources/api'
import { body_salvar_relatorio } from '../components/types/controllers-types';

async function salvarDadosRelatorio(relatorio: body_salvar_relatorio) {

  try{
    const cookies=getUserToken()
    const response = await axios.post(`${BASE_API}/relatorios`, {
        especie_alvo: relatorio.id_especie,
        id_arte_de_pesca: relatorio.id_arte,
        id_embarcacao: relatorio.id_e,
        id_usuario: relatorio.id_u,
        nome_armador: relatorio.nome,
        porto_chegada: relatorio.porto_c,
        porto_saida: relatorio.porto_s,
        data_chegada: relatorio.data_chegada,
        data_saida: relatorio.data_saida,
        dados_pescaria: relatorio.dados_pescaria
      }, {
        headers: {
          Authorization: `Bearer ${cookies}`,
        }
      });
      console.log('RESULTADO RESPONSE: ',response)
  return true;
  } catch(error){
      let erro = ""
      if (error.response && error.response.status === 400) {
        erro = "Erro nos dados de cadastro do relatório."
      } else {
        erro = "Erro ao realizar cadastro do relatório."
      }
      console.log('ERRO AO SALVAR RELATORIO:', error)
      return false
  } 
};

export { salvarDadosRelatorio }