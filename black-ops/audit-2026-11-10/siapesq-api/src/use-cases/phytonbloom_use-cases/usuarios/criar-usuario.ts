import Joi from 'joi'
import { CriarUsuarioBody, CriarUsuarioResponse } from '../../../types/phytobloom-types/usuarios-types';
import http_status from '../../../consts/http-status-enum';
import Usuarios from '../../../models/phytoBloom/Usuarios';
import AuthServices from '../../../services/auth-services';

const create_body_schema=Joi.object({
    nome:Joi.string().required().error(new Error("Nome invalido")),
    email:Joi.string().email().required().error(new Error("Email invalido")),
    senha:Joi.string().required().error(new Error("Senha invalida")),
    ativo: Joi.boolean().required().error(new Error("Sem assinatura ativa")),
    user_verify:Joi.boolean().required().error(new Error("Usuário não verificado")),
    documento:Joi.string().required().error(new Error("Documento invalido")),
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
            const {nome,email,senha,documento,telefone,ativo,user_verify} = body
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
                ativo,
                user_verify,
                telefone,
                documento
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
                ativo,
                user_verify,
                telefone,               
                documento,
                token,
            }
        }
        catch(err){
            throw(err)
        }
    }
}