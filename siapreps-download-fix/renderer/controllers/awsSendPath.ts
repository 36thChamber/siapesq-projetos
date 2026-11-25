import * as fs from 'fs/promises';
import * as path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import { BASE_API } from '../resources/api'
import { getUserToken } from './cookies';


const diretorioLocal = path.join(path.resolve(), 'documents');

const enviarArquivosParaAPI = async () => {

  try {

    const documentos = await fs.readdir(diretorioLocal);
    const cookies = getUserToken();
    const id_embarcacao = global?.window?.JSON.parse(localStorage.getItem('Dados') || '[]').dateEmbarcacaoId.id;
    const id_user = global?.window?.JSON.parse(localStorage.getItem('userData') || '[]').id;

    for (let i = 0; i < documentos.length; i++) {

      const documento = documentos[i];
      const caminhoDocumento = path.join(diretorioLocal, documento);
      const fileContent = await fs.readFile(caminhoDocumento);
      console.log(caminhoDocumento)
      const blob = new Blob([new Uint8Array(fileContent)], { type: 'application/pdf' });
      const form = new FormData();
      
      form.append('id_usuario', id_user);
      form.append('id_embarcacao', id_embarcacao);
      form.append('pdf', blob); // Supondo que o nome do arquivo seja usado como nome do relatório
      form.append('nome', 'documento' + new Date().toISOString());

      const response = await axios.post(`${BASE_API}/relatorios/upload`, form, {
        headers: {
          Authorization: `Bearer ${cookies}`
        }
      });

      console.log(`Documento ${documento} enviado com sucesso. Resposta da API:`, response.data);

    }
  } catch (error) {

    console.error('Erro ao enviar documentos para a API:', error);

  }
};

export default enviarArquivosParaAPI;


