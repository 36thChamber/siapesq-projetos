import Joi from 'joi'
import { UsuarioLoginRequestBody, UsuarioLoginResponse } from '../../types/phytobloom-types/usuarios-types';
import http_status from '../../consts/http-status-enum';
import Usuarios from '../../models/phytoBloom/Usuarios';
import AuthServices from '../../services/auth-services';

const login_body_schema=Joi.object({
    email:Joi.string().email().required().error(new Error("email invalido")),
    senha:Joi.string().required().error(new Error("senha invalida"))
})
export default class LoginUseCase{
    static async valida(body:UsuarioLoginRequestBody){
        try{
            await login_body_schema.validateAsync(body)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(body:UsuarioLoginRequestBody):Promise<UsuarioLoginResponse>{
        try{
            const {email,senha}=body
            const usuario=await Usuarios.findOne({where:{email}})
            if(!usuario){
                throw({
                    message:`Usuario ${email} não encontrado`,
                    status:http_status.NOT_FOUND
                })
            }
            const {senha:hash} = usuario
            const senha_valida=await AuthServices.compara_senha_com_hash(senha,hash)
            if(!senha_valida){
                throw({
                    message:"Senha Incorreta",
                    status:http_status.UNAUTHORIZED
                })
            }
            const jwt_secret=process.env.JWT_SECRET
            if(!jwt_secret){
                throw({
                    message:"JWT_SECRET não foi setada",
                    status:http_status.INTERNAL_ERROR
                })
            }
            const token=AuthServices.gera_jwt_token({id:usuario.id},jwt_secret)
                        return {
                id:usuario.id,
                nome:usuario.nome,
                documento:usuario.documento,
                email:usuario.email,
                ativo: usuario.ativo,
                user_verify: usuario.user_verify,
                criado_em:usuario.criado_em,
                atualizado_em:usuario.atualizado_em,
                token
            }
        }
        catch(err){
            throw(err)
        }
    }
}