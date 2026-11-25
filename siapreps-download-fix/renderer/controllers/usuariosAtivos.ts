import axios from "axios";
import { getUserToken } from './cookies';
import {BASE_API} from '../resources/api'

// async function criar_usuario_ativo(id_user: number, tipo_assinatura: string, ativo: boolean, data_criacao: Date, data_fim: Date) {
// criar usuário ativo

async function criar_usuario_ativo(id_user: number,email:string, telefone: string, token: string) {
    try {
        const response = await axios.post(`${BASE_API}/usuariosAtivos`, {
          id_user: id_user,
          email:email, 
          telefone: telefone,
          tipo_assinatura: 'Sem assinatura',
          ativo: false,
          data_criacao: (new Date()).toISOString(),
          data_fim: (new Date()).toISOString()
        },{
          headers: {Authorization: `Bearer ${token}`}
        });
        return response.data
        
    } catch (error) {
      console.error(error);
    } 
  }

async function get_usuario_ativo_id(id_user: number, token: string){
    try{
        const response = await axios.get(`${BASE_API}/usuariosAtivos/${id_user}`, 
            {
                headers: {Authorization: `Bearer ${token}`}
            }
        )

        return response.data.ativo
    } catch(error){
        console.error("Erro ao buscar usuário ativo.", error)
    }
}

async function getUsuariosAtivos(){
    try{
    const cookies=getUserToken()
    const response = await axios.get(`${BASE_API}/usuariosAtivos`,{
            headers: {
                Authorization: `Bearer ${cookies}`
            }
        });
        return response.data.usuariosAtivos;
    } catch(error) {
        console.error('Erro ao buscar os usuários ativos.', error)
    }
    
};

interface UpdateUsuarioAtivoParams {
    email?: string;
    ativo?: boolean;
    data_fim?: Date;
    data_criacao?: Date;
    telefone?: string;
    id_user: number;
    tipo_assinatura?: string;
}

async function updateUsuariosAtivos(params: UpdateUsuarioAtivoParams) {
    try {
        const { email, ativo, data_fim,data_criacao, telefone, id_user,tipo_assinatura } = params;
        const cookies = getUserToken();
        const response = await axios.put(
            `${BASE_API}/usuariosAtivos`,
            { email, ativo, data_fim, data_criacao, telefone, id_user,tipo_assinatura },
            {
                headers: {
                    Authorization: `Bearer ${cookies}`
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error('Erro ao atualizar usuário ativo:', error);
        throw error;
    }
}
 async function deleteUsuarioAtivo(emailUserAtivo: string) {
    try {
        const cookies = getUserToken(); 
        const response = await axios.delete(`${BASE_API}/usuariosAtivos`, {
            data: {
                email: emailUserAtivo
            },
            headers: {
                Authorization: `Bearer ${cookies}`
            }
        });
        return response.data; 
    } catch (error) {
        console.error('Erro ao excluir usuário ativo:', error);
        throw error;
    }
}
export { criar_usuario_ativo,get_usuario_ativo_id, getUsuariosAtivos,updateUsuariosAtivos,deleteUsuarioAtivo };