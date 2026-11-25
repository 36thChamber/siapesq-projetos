import axios from "axios";
import { getUserToken } from './cookies';
import {BASE_API} from '../resources/api'
import { body_adicionar_fundo } from "../components/types/controllers-types";
async function postFundo(fundo: body_adicionar_fundo){
    try{
        const cookies=getUserToken()
        const response = await axios.post(`${BASE_API}/fundos`, {
            id: fundo.id,
            nome: fundo.nome,
            ativo: fundo.ativo
        }, {
            headers: {Authorization: `Bearer ${cookies}`}
        });
        return response.data
    } catch(error){
        console.error('Erro ao cadastrar novo fundo.', error);
    }
   
};

async function getFundos(){
    try{
        const cookies=getUserToken()
        const response = await axios.get(`${BASE_API}/fundos`, {
        headers: {
            Authorization: `Bearer ${cookies}`
        }
        });
        return response.data
    } catch(error){
        console.error('Erro ao buscar fundos na api.', error)
    }
    
};

async function getIdFundo(id: number){
    try{
        const cookies=getUserToken()
        const response = await axios.get(`${BASE_API}/fundos/${id}`, {
        headers: {
            Authorization: `Bearer ${cookies}`
        }
        });
        return response.data
    } catch(error) {
        console.error('Erro a buscar fundo', error)
    }
    
};

export { postFundo, getFundos, getIdFundo };