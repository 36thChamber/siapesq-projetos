import { BASE_API } from './api';

//Função que verifica se a api ta funcionando
export const conexaoDaApi = async () => {
  try {
    const response = await fetch(`${BASE_API}`);
    
    if (response.status === 200) {
      console.log('Conexão com a API bem-sucedida!');
      return true; // Retorna true se a conexão for bem-sucedida
    } else {
      console.error('Erro ao conectar-se à API:', response.statusText);
      return false; // Retorna false se houver um erro de status
    }
  } catch (error) {
    console.error('Erro ao conectar-se à API:', error.message);
    return false; // Retorna false em caso de erro
  }
};
