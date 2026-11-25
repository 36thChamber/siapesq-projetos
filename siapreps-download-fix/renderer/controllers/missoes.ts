import axios from "axios";
import { getUserToken } from "./cookies";
import {BASE_API} from '../resources/api'
async function postFundo(id_e: number, id_u: number, iniciou_em: Date, terminou_em: Date){
    try{
        const cookies=getUserToken()
        const response = await axios.post(`${BASE_API}/missoes`, {
            id_embarcacao:id_e,
            id_usuario: id_u,
            iniciou_em: iniciou_em,
            terminou_em: terminou_em, 
        }, {
            headers: {Authorization: `Bearer ${cookies}`}
        });
        return response.data
    } catch(error){
        console.error('Erro ao cadastrar nova missao.', error);
    }
};

async function getMissoes(){
    try{
        const cookies=getUserToken()
        const response = await axios.get(`${BASE_API}/missoes`, {
        headers: {
            Authorization: `Bearer ${cookies}`
        }
        });
        return response.data
    } catch(error){
        console.error('Erro ao buscar missoes na api.', error)
    }
    
};

async function getIdMisssao(id: number){
    try{
        const cookies=getUserToken()
        const response = await axios.get(`${BASE_API}/missoes/${id}`, {
        headers: {
            Authorization: `Bearer ${cookies}`
        }
        });
        return response.data
    } catch(error) {
        console.error('Erro a buscar missão', error)
    }
    
};

export { postFundo, getMissoes, getIdMisssao };