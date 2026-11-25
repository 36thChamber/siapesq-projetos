import axios from "axios";
import {BASE_API} from '../resources/api'

async function enviarEmailDeVerificacao(email: string){
    try{
        const response = axios.post(`${BASE_API}/verificarEmail/enviar`, {
            email:email
        })        

    } catch(error){
        console.error('Erro ao enviar email: ', error)
    }    
};

async function verificarTokenEnviado(token: string){
    try{
        const response = axios.get(`${BASE_API}/verificarEmail`, {
            headers: {
                Authorization: `Bearer ${token}`,
              }
        })

        return response

    } catch(error){
        console.error('Erro de verificação no cadastro: ', error)
    }    
};

export { enviarEmailDeVerificacao, verificarTokenEnviado };