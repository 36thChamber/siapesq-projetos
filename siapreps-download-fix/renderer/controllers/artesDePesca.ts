import axios from "axios";
import { getUserToken } from './cookies';
import {BASE_API} from '../resources/api'
async function getArtes(){
    try{
    const cookies=getUserToken()
    const response = await axios.get(`${BASE_API}/artesDePesca`,{
            headers: {
                Authorization: `Bearer ${cookies}`
            }
        });
        return response.data
    } catch(error) {
        console.error('Erro ao buscar as Artes de pesca na api.', error)
    }
    
};

async function getIdArtes(id: number) {
    try {
        const cookies=getUserToken()
        const response = await axios.get(`${BASE_API}/artesDePesca/${id}`,{
            headers: {
                Authorization: `Bearer ${cookies}`
            }
        });
        return response.data
    } catch(error){
        console.error('Erro ao buscar Arte de pesca.', error)
    }

};

export { getArtes, getIdArtes };