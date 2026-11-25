import axios from "axios";
import { getUserToken } from './cookies';
import {BASE_API} from '../resources/api'

async function getUsuario(id: number){
    try{
    const cookies=getUserToken()
    const response = await axios.get(`${BASE_API}/usuarios/${id}`,{
            headers: {
                Authorization: `Bearer ${cookies}`
            }
        });
        return response.data;
    } catch(error) {
        console.error('Erro ao buscar este usuário.', error)
    }
    
};

export { getUsuario };