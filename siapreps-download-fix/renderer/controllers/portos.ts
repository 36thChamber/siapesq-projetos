import axios from "axios";
import { getUserToken } from './cookies';
import {BASE_API} from '../resources/api'
async function postPorto(nome: String, ativo: Boolean) {
    try {
        const cookies=getUserToken()
        const response = await axios.post(`${BASE_API}/portos`, {
            nome: nome,
            ativo: ativo
        },{
            headers: {
                Authorization: `Bearer ${cookies}`
            }
        });
        return response.data
    } catch(error) {
        console.error('Erro ao criar novo porto', error)
    }
};

async function getPortos(){
    try {
        const cookies=getUserToken()
        const response = await axios.get(`${BASE_API}/portos`,{
            headers: {
                Authorization: `Bearer ${cookies}`
            }
        });
        return response.data
    } catch(error) {
        console.error('Erro ao buscar dados dos portos', error)
    }
};

async function getIdPorto(id: number){
    try{
        const cookies=getUserToken()
        const response = await axios.get(`${BASE_API}/portos/${id}`,{
            headers: {
                Authorization: `Bearer ${cookies}`
            }
            });
        return response.data
    } catch(error) {
        console.error('Erro ao buscar dados do porto', error)
    }
};

export { postPorto, getPortos, getIdPorto };