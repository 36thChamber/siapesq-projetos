import axios from 'axios';
import { getUserToken } from './cookies';
import {BASE_API} from '../resources/api'
import { body_cadastrar_embarcacao, body_update_embarcacao } from '../components/types/controllers-types';
async function postEmbarcacao(embarcacao: body_cadastrar_embarcacao) {

  try{
    const formatoNum: RegExp = /^[0-9]+$/;
    if(formatoNum.test(String(embarcacao.capacidade_estocagem)) && formatoNum.test(String(embarcacao.velocidade_pesca)) && formatoNum.test(String(embarcacao.velocidade_cruzeiro))){
      const cookies=getUserToken()
      const usuario = await axios.get(`${BASE_API}/usuarios`,{
        headers : {
            Authorization: `Bearer ${cookies}`,
        }
      })
      const id = usuario.data.id

      const response = await axios.post(`${BASE_API}/embarcacoes`, {
          nome: embarcacao.nome,
          RGP: embarcacao.RGP,
          id_mestre: id,
          tamanho: embarcacao.tamanho,
          capacidade_estocagem: embarcacao.capacidade_estocagem,
          velocidade_pesca: embarcacao.velocidade_pesca,
          velocidade_cruzeiro: embarcacao.velocidade_cruzeiro,
          modalidade_pesca: embarcacao.modalidade_pesca,
          area_pesca: embarcacao.area_pesca,
        }, {
          headers: {
            Authorization: `Bearer ${cookies}`,
          }
        });
      
      return true
    } else {
      let erro = "Preencha com números as velocidades e capacidade da embarcação!"
      return erro
    }
  } catch(error){
      let erro = ""
      if (error.response && error.response.status === 400) {
        erro = "Erro nos dados de cadastro da embarcação."
      } else {
        erro = "Erro ao realizar cadastro da embarcação."
      }
      return erro
  } 
};

async function getEmbarcacoes() {
  try{
    const cookies=getUserToken()
    const response =  await axios.get(`${BASE_API}/embarcacoes`, {
      headers: {
        Authorization: `Bearer ${cookies}`
      }
    });
    return response.data
  } catch(error){
    console.error('Erro ao buscar dados na api.', error);

  }
};

async function getIdEmbarcacoes(id: number) {
  try{
    const cookies=getUserToken()
    const response = await axios.get(`${BASE_API}/embarcacoes/${id}`, {
      headers: {
        Authorization: `Bearer ${cookies}`
      }
    });
    return response.data
  } catch(error){
    console.error('Erro ao buscar dados da embarcação.', error)
  }
};

async function  udpdateEmbarcacao(embarcacao: body_update_embarcacao) {
  try{
    const cookies=getUserToken()
    const usuario = await axios.get(`${BASE_API}/usuarios`,{
        headers : {
            Authorization: `Bearer ${cookies}`,
        }
    })
    const id = usuario.data.id
    
    const response = await axios.put(`${BASE_API}/embarcacoes`, {
      nome: embarcacao.nome,
      RGP: embarcacao.RGP,
      id_mestre: id,
      tamanho: embarcacao.tamanho,
      capacidade_estocagem: embarcacao.capacidade_estocagem,
      velocidade_pesca: embarcacao.velocidade_pesca,
      velocidade_cruzeiro: embarcacao.velocidade_cruzeiro,
      modalidade_pesca: embarcacao.modalidade_pesca,
      area_pesca: embarcacao.area_pesca,
      }, {
        headers: {
          Authorization: `Bearer ${cookies}`,
        }
      });
      return response.data
  } catch(error){
    console.error('Erro ao atualizar embarcação.', error)
  }
};

export { postEmbarcacao, getEmbarcacoes, getIdEmbarcacoes, udpdateEmbarcacao };