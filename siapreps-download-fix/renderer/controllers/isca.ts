import axios from "axios";
import { getUserToken } from './cookies';
import {BASE_API} from '../resources/api'
import { body_adicionar_isca } from "../components/types/controllers-types";
async function postIsca(isca: body_adicionar_isca) {
    try{
        const cookies=getUserToken()
        const response = await axios.post(`${BASE_API}/iscas`, {
            id: isca.id,
            nome: isca.nome,
            ativo: isca.ativo,
          }, {
            headers: {
              Authorization: `Bearer ${cookies}`,
            }
          });
        
        console.log(response.data);
        alert("Isca cadastrada com sucesso!")

    } catch(error){
        let erro = ""
        if (error.response && error.response.status === 400) {
          erro = "Erro nos dados de cadastro da isca."
        } else {
          erro = "Erro ao realizar cadastro da isca."
        }
        return erro
    } 
};

async function getIscas() {
  try{
    const cookies=getUserToken()
    const response = await axios.get(`${BASE_API}/iscas`,{
            headers: {
                Authorization: `Bearer ${cookies}`
            }
        });
        return response.data
    } catch(error) {
        console.error('Erro ao buscar as Iscas na api.', error)
    }
};

async function getIdIsca(id: number) {
  try {
    const cookies=getUserToken()
    const response = await axios.get(`${BASE_API}/iscas/${id}`,{
        headers: {
            Authorization: `Bearer ${cookies}`
        }
    });
    return response.data

    } catch(error){
        console.error('Erro ao buscar Arte de pesca.', error)
    }
};

export { postIsca, getIdIsca, getIscas };