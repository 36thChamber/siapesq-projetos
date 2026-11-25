import Joi from 'joi'
import { CriarUsuarioBody, CriarUsuarioResponse } from '../../types/usuarios-types';
import http_status from '../../consts/http-status-enum';
import Usuarios from '../../models/Usuarios';
import AuthServices from '../../services/auth-services';

const create_body_schema=Joi.object({
    nome:Joi.string().required().error(new Error("Nome invalido")),
    email:Joi.string().email().required().error(new Error("Email invalido")),
    senha:Joi.string().required().error(new Error("Senha invalida")),
   
    //validar campos abaixo
    documento:Joi.string().required().error(new Error("Documento invalido")),
    insc_capt_portos:Joi.string().required().error(new Error("Inscrição na Captania dos Portos Invalida")),
    telefone:Joi.string().required().error(new Error("Telefone Invalido"))
})
export default class LoginUseCase{
    static async valida(body:CriarUsuarioBody){
        try{
            await create_body_schema.validateAsync(body)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(body:CriarUsuarioBody):Promise<CriarUsuarioResponse>{
        try{
            const {nome,email,senha,documento,insc_capt_portos,telefone} = body
            const checa_email=await Usuarios.findOne({where:{email}})
            if(checa_email){
                throw({
                    message:`Usuario ${email} ja foi cadastrado`,
                    status:http_status.CONFLICT
                })
            }
            const usuario=await Usuarios.create({
                nome,
                email,
                senha:await AuthServices.hash_senha(senha),
                documento,
                insc_capt_portos,
                telefone
            })
            const segredo=process.env.JWT_SECRET
            if(!segredo){
                throw({
                    message:"JWT_SECRET nao setado",
                    status:http_status.INTERNAL_ERROR
                })
            }
            const token = AuthServices.gera_jwt_token({id:usuario.id},segredo)
            return {
                id:usuario.id,
                nome,
                email,
                
                documento,
                insc_capt_portos,
                telefone,
                token,
            }
        }
        catch(err){
            throw(err)
        }
    }
}