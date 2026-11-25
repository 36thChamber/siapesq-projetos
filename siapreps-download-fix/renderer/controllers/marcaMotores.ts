import axios from "axios";
import { getUserToken } from './cookies';
import {BASE_API} from '../resources/api'
async function postMarca(id: number, nome: string, ativo: boolean, criado_em: Date, atualizado_em: Date, deletado_em: Date){
    try{
        const cookies=getUserToken()
        const response = await axios.post(`${BASE_API}/marca-motores`, {
            id:id,
            nome: nome,
            ativo: ativo,
            criado_em: criado_em,
            atualizado_em: atualizado_em,
            deletado_em: deletado_em
        }, {
            headers: {Authorization: `Bearer ${cookies}`}
        });
        return response.data
    } catch(error){
        console.error('Erro ao cadastrar nova marca.', error);
    }
   
};

async function getMarcas(){
    try{
        const cookies=getUserToken()
        const response = await axios.get(`${BASE_API}/marca-motores`, {
        headers: {
            Authorization: `Bearer ${cookies}`
        }
        });
        return response.data
    } catch(error){
        console.error('Erro ao buscar marcas na api.', error)
    }
    
};

async function getIdMarca(id: number){
    try{
        const cookies=getUserToken()
        const response = await axios.get(`${BASE_API}/marca-motores/${id}`, {
        headers: {
            Authorization: `Bearer ${cookies}`
        }
        });
        return response.data
    } catch(error) {
        console.error('Erro a buscar marca', error)
    }
    
};

export { postMarca, getMarcas, getIdMarca };