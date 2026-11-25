import axios from 'axios';
import { getUserToken } from './cookies';
import Router from 'next/router';
import {BASE_API} from '../resources/api'
async function postArmadilha(id: number, modelo: string, tipo: string, forma: string, ativo: boolean,criado_em: Date, atualizado_em: Date, deletado_em: Date) {
  try{
    const cookies=getUserToken()
    console.log(cookies)
    const response = await axios.post(`${BASE_API}/armadilhas`, {
        id: id,
        modelo: modelo,
        tipo: tipo,
        forma: forma,
        ativo: ativo,
        criado_em: criado_em,
        atualizado_em: atualizado_em,
        deletado_em: deletado_em
      }, {
        headers: {
          Authorization: `Bearer ${cookies}`
        }
      });
    
    console.log(response.data);
    alert("Armadilha cadastrada com sucesso!")
    Router.push("/home")

  } catch(error){
      let erro = ""
      if (error.response && error.response.status === 400) {
        erro = "Erro nos dados de cadastro da armadilha."
      } else {
        erro = "Erro ao realizar cadastro da armadilha."
      }
      return erro
  } 
};

async function getArmadilhas() {
  try{
    const cookies=getUserToken()
    const response =  await axios.get(`${BASE_API}/armadilhas`, {
      headers: {
        Authorization: `Bearer ${cookies}`
      }
    });
    return response.data
  } catch(error){
    console.error('Erro ao buscar dados na api.', error);

  }
};

async function getIdArmadilha(id: number) {
  try{
    const cookies=getUserToken()
    const response = await axios.get(`${BASE_API}/armadilhas/${id}`, {
      headers: {
        Authorization: `Bearer ${cookies}`
      }
    });
    return response.data
  } catch(error){
    console.error('Erro ao buscar dados da armadilhas.', error)
  }
};


export { postArmadilha, getArmadilhas, getIdArmadilha };