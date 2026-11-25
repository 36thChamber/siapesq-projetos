import axios from "axios";
import { BASE_API } from "../../resources/BASE_API"
import { refresh_response, send_verificatin_email, type_get_id_usuario, type_list_usuarios, type_login, type_login_response, type_register, type_register_response, type_update, type_update_response } from "./types/usuario-types";

//Função que realiza conexão com rota de login do usuário
async function login_usuario(body: type_login): Promise<type_login_response> {
    try {
        const { email, senha } = body
        const response = await axios.post(`${BASE_API}/siapesq/usuarios/login`, {
            email: email,
            senha: senha
        })

        console.log('Resposta do login: ', response)

        return response.data

    } catch (error) {
        console.log('Erro ao realizar login: ', error)
        throw error
    }
}

async function register_usuario(body: type_register): Promise<type_register_response> {
  try {
    const { nome, email, senha, contato, cpf, titulo_cientifico, tipo_usuario } = body;

    const response = await axios.post(`${BASE_API}/siapesq/usuarios/`, {
      nome,
      email,
      senha,
      contato,
      cpf,
      titulo_cientifico,
      tipo_usuario,
    });

    // valida o dado antes de usar
    const usuario = response.data;
    if (!usuario || !usuario.id_usuario) {
      throw new Error("Resposta inválida do servidor: usuário sem id_usuario");
    }

    let verificationStatus = 0;

    try {
      const verification = await send_verification_email({
        id_usuario: usuario.id_usuario,
        email: usuario.email,
        nome: usuario.nome,
      });
      verificationStatus = verification ?? 404;
    } catch (err) {
      verificationStatus = 404;
    }

    return {
      ...usuario,
      email_verification_sent: verificationStatus,
    };
  } catch (error) {
    throw error;
  }
}


async function refresh_token(token: string): Promise<refresh_response> {
    try {
        const response = await axios.get(`${BASE_API}/siapesq/usuarios/refresh-token`, {
            headers: {
                Authorization: `Bearer ${token}`

            }
        })

        return response.data
    } catch (error) {
        console.log('Erro ao atualizar token: ', error)
        throw error
    }
}

async function get_usuario_id(id_usuario: string): Promise<type_get_id_usuario> {
    try {
        const response = await axios.get(`${BASE_API}/siapesq/usuarios/${id_usuario}`)


        return response.data

    } catch (error) {
        throw error
    }
}

async function get_list_usuarios(token: string): Promise<type_list_usuarios> {
    try {
        const response = await axios.get(`${BASE_API}/siapesq/usuarios/`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })


        return response.data
    } catch (error) {
        throw error
    }
}

async function update_usuario(body: type_update): Promise<type_update_response> {
    try {
        const { token, ...dataToSend } = body;

        const filteredData = Object.fromEntries(
            Object.entries(dataToSend).filter(([_, v]) => v !== undefined && v !== null)
        );

        const response = await axios.put(
            `${BASE_API}/siapesq/usuarios/`,
            filteredData,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        return response.data;

    } catch (error) {
        throw error;
    }
}


async function forgot_password(email: string) {
    try {
        const response = await axios.post(`${BASE_API}/siapesq/usuarios/forgot-password`, {
            email
        })

        return response
    } catch (error) {
        throw error
    }

}

async function send_verification_email(body: send_verificatin_email){
    try{
        const {id_usuario, email, nome} = body
        const response = await axios.post(`${BASE_API}/siapesq/usuarios/send-verification-email`, {
            id_usuario,
            email,
            nome
        })


        return response.status
    } catch(error){
        throw error
    }
}

async function logout_usuario(){
    return null
}


export { login_usuario, register_usuario, refresh_token, get_usuario_id, get_list_usuarios, update_usuario, forgot_password, logout_usuario, send_verification_email }