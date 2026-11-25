import axios from "axios"
import { BASE_API } from "../resources/api"

async function esqueciSenha(email: string){
    try{
        const response = await axios.post(`${BASE_API}/esqueceuSenha/`,{
            email: email
        })
        return response.data
    } catch(error){
        console.error('Erro ao enviar email', error)
    }
}

export {esqueciSenha}