//Função para chamar a validação do usuário

import axios from 'axios'
import Router from 'next/router'
import NProgress from 'nprogress'
import { BASE_API } from '../resources/api'
import { body_cadastro, body_login } from '../components/types/controllers-types'
import { enviarEmailDeVerificacao } from './verificarEmail'
import { criar_usuario_ativo, getUsuariosAtivos, get_usuario_ativo_id } from './usuariosAtivos'
import { get_principal_pngs_names } from './pngsMapas'

interface UsuariosAttributes {
  embarcacoes: any
  id: number;
  nome: string;
  insc_capt_portos: string;
  documento: string;
  administracao: boolean;
  email: string;
  senha: string;
  telefone: string;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date | null;
  deletado_em: Date | null;
}

async function rota_login(login: body_login) {

  try {
    //Chamada da api
    NProgress.start();

    const response = await axios.post(`${BASE_API}/usuarios/login`, {
      email: login.email,
      senha: login.password
    });

    const token = response.data.token
    const userData =  await getUserData(token);
    let assinatura;
    if(userData){
      assinatura = await get_usuario_ativo_id(userData.id,token)
    }
    
   if(userData && userData.ativo === true && assinatura === "true"){
      const expirationDate = new Date();
      expirationDate.setTime(expirationDate.getTime() + 48 * 60 * 60 * 1000);
      
      //Inserir token no cookie
      global?.window?.localStorage.setItem("token", token);
      const especies = await get_principal_pngs_names()
      global?.window?.localStorage.setItem("especies_analises", JSON.stringify(especies))
      NProgress.done();
      Router.push('/home')
    } else if(userData && userData.ativo === true && assinatura === "false"){
      return 'sem assinatura'
    } else if(userData && userData.ativo === false){
      return 'não autenticado'
    }
  } catch (error) {
    NProgress.done();
    console.error('Erro durante login!', error);
    return error
  }
}

async function rota_register(novo_usuario: body_cadastro) {
  try {
    const formatoTelefone: RegExp =/^(\d{2})(\d{9})$/; // verificação para o tipo de telefone aceito
    const formatoSenha: RegExp = /^[^\s]{8,}$/;
    if(formatoTelefone.test(novo_usuario.telefone) && formatoSenha.test(novo_usuario.senha)){
        NProgress.start();
        const response = await axios.post(`${BASE_API}/usuarios`, {
          nome: novo_usuario.nome,
          email: novo_usuario.email,
          senha: novo_usuario.senha,
          documento: novo_usuario.documento,
          insc_capt_portos: novo_usuario.inscCaptPortos,
          telefone: novo_usuario.telefone
        });
        
        
        NProgress.done();
  
        if (response.status === 200) {
          const { id, email, telefone, token } = response.data;
          await criar_usuario_ativo(id, email,telefone, token);        
          await enviarEmailDeVerificacao(email)

          return true;
        }

    } else {
      if(!formatoSenha.test(novo_usuario.senha)){
        let erro = "Senha deve ter no mínimo 8 digítos!" 
        return erro
      } else if(formatoTelefone){
        let erro = 'Número de telefone inválido!'
        return erro
      }
    }
    
  } catch (error) {
    NProgress.done();
    return error.response.data.message
  }
}

async function rota_refresh(cookie: any) {
  try {
    const response = await axios.get(`${BASE_API}/usuarios/refresh-token`, {
      headers: {
        Authorization: `Bearer ${cookie}`,
      }
    })
    await getUserData(cookie);
    const novo_token = response.data.token;
    const expirationDate = new Date();
    expirationDate.setTime(expirationDate.getTime() + 48 * 60 * 60 * 1000);
    global?.window?.localStorage.setItem("token", novo_token);
    // Verificar se tem dados referentes a tela do mapa, ou seja, selecionados no input
    if (global?.window?.localStorage.getItem("Dados") && response.status == 200) {
      Router.push('/map');

    } else if (!global?.window?.localStorage.getItem("Dados") && response.status == 200) {
      Router.push('/home');

    } else if (response.status !== 200) {
      localStorage.clear()
      Router.push('/login')

    }
  } catch (error) {
    console.error(error)
    localStorage.clear()
    Router.push('/login')
  }
}

const getUserData = async (cookie: string): Promise<UsuariosAttributes | null> => {
  try {
    const response = await axios.get(`${BASE_API}/usuarios/`, {
      headers: {
        Authorization: `Bearer ${cookie}`,
      },
    });
    if (response && response.data) {
      // Armazene os dados do usuário na localStorage
      const userData: UsuariosAttributes = response.data;
      localStorage.setItem('userData', JSON.stringify(userData));
      return userData;
    }

    return null;
  } catch (error) {
    alert('Erro ao buscar dados do usuário');
    return null;
  }
}

export default getUserData;

export { rota_login, rota_register, rota_refresh };

//falta pegar as mensagens de erro que retorna, e transformar para mensagem de erro na div.