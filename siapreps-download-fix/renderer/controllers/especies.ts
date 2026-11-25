import axios from "axios";
import { getUserToken } from './cookies';
import {BASE_API} from '../resources/api'
import { body_adicionar_especie } from "../components/types/controllers-types";

async function postEspecie(especie: body_adicionar_especie){
    try{
        //função para criar uma nova especie
        const cookies=getUserToken()
        const response = await axios.post(`${BASE_API}/especies`, {
            nome: especie.nome,
            imagem: especie.imagem,
            ativo: especie.ativo
        }, {
            headers: {Authorization: `Bearer ${cookies}`}
        });
        return response.data
    } catch(error){
        console.error('Erro ao cadastrar nova especie.', error);
    }
   
};

async function getEspecies(){
    try{
        const cookies=getUserToken()
        const response = await axios.get(`${BASE_API}/especies`, {
        headers: {
            Authorization: `Bearer ${cookies}`
        }
        });
        return response.data
    } catch(error){
        console.error('Erro ao buscar especies na api.', error)
    }
    
};

async function getIdEspecie(id: number){
    try{
        const cookies=getUserToken()
        const response = await axios.get(`${BASE_API}/especies/${id}`, {
        headers: {
            Authorization: `Bearer ${cookies}`
        }
        });
        return response.data
    } catch(error) {
        console.error('Erro a buscar especie', error)
    }
    
};

export { postEspecie, getEspecies, getIdEspecie };