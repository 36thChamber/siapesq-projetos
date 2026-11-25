// create, delete, get, list, getId

import axios from "axios";
import { getUserToken } from "./cookies";
import {BASE_API} from '../resources/api'
async function postPeixe(id_e: number, id_l: number, latitude: number, longitude: number, hex: string, created: Date, deleted: boolean) {

    try{
      const cookies=getUserToken()
      const response = await axios.post(`${BASE_API}/peixeRFID`, {
            id_especie: id_e,
            id_lance: id_l,
            latitude: latitude,
            longitude: longitude,
            hex: hex,
            created: created,
            deleted: deleted
        }, {
          headers: {
            Authorization: `Bearer ${cookies}`,
          }
        });
      
      console.log(response.data);
      alert("Peixe RFID cadastrado com sucesso!")
  
    } catch(error){
        let erro = ""
        if (error.response && error.response.status === 400) {
          erro = "Erro nos dados de cadastro do peixeRFID."
        } else {
          erro = "Erro ao realizar cadastro do peixeRFID."
        }
        return erro
    } 
};


async function getPeixes() {
    try{
      const cookies=getUserToken()
      const response =  await axios.get(`${BASE_API}/peixeRFID`, {
        headers: {
          Authorization: `Bearer ${cookies}`
        }
      });
      return response.data
    } catch(error){
      console.error('Erro ao buscar dados na api.', error);
  
    }
};

async function getIdPeixe(id: number) {
    try{
      const cookies=getUserToken()
      const response = await axios.get(`${BASE_API}/peixeRFID/${id}`, {
        headers: {
          Authorization: `Bearer ${cookies}`
        }
      });
      return response.data
    } catch(error){
      console.error('Erro ao buscar dados de PeixeRFID.', error)
    }
};
  
async function deletePeixe(id: number) {
    try{
        const cookies=getUserToken()
        const response = await axios.post(`${BASE_API}/peixeRFID/${id}`, {
            headers: {
                Authorizarion: `Bearer ${cookies}`
            },
        })
        console.log("Peixe deletado.")
    } catch(error) {
        console.error("Erro ao deletar peixe.", error)
    }
};

export {postPeixe, getPeixes, getIdPeixe, deletePeixe}