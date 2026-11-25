import axios from "axios";
import { getUserToken } from './cookies';
import {BASE_API} from '../resources/api'
async function postMotor(id: number, nome: string, id_m: number, pot: number, ativo: boolean, criado_em: Date, atualizado_em: Date, deletado_em: Date){
    try{
        const cookies=getUserToken()
        const response = await axios.post(`${BASE_API}/motores`, {
            id:id,
            nome: nome,
            id_marca: id_m,
            potencia: pot, 
            ativo: ativo,
            criado_em: criado_em,
            atualizado_em: atualizado_em,
            deletado_em: deletado_em
        }, {
            headers: {Authorization: `Bearer ${cookies}`}
        });
        return response.data
    } catch(error){
        console.error('Erro ao cadastrar novo motor.', error);
    }
   
};

async function getMotores(){
    try{
        const cookies=getUserToken()
        const response = await axios.get(`${BASE_API}/motores`, {
        headers: {
            Authorization: `Bearer ${cookies}`
        }
        });
        return response.data
    } catch(error){
        console.error('Erro ao buscar motores na api.', error)
    }
    
};

async function getIdMotor(id: number){
    try{
        const cookies=getUserToken()
        const response = await axios.get(`${BASE_API}/motores/${id}`, {
        headers: {
            Authorization: `Bearer ${cookies}`
        }
        });
        return response.data
    } catch(error) {
        console.error('Erro a buscar motor', error)
    }
    
};

export { postMotor, getMotores, getIdMotor };