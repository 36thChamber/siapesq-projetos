import Joi from 'joi'
import { CriarUsuarioAtivoBody, CriarUsuarioAtivoResponse } from '../../types/usuariosAtivos-types';
import http_status from '../../consts/http-status-enum';
import UsuariosAtivos from '../../models/UsuariosAtivos';
import Usuarios from '../../models/Usuarios';

const create_body_schema=Joi.object({
    id_user:Joi.number().required().error(new Error("id invalido")),
    email: Joi.string().required().error(new Error("email invalido")),
    telefone: Joi.string().required().error(new Error("telefone invalido")),
    tipo_assinatura: Joi.string().required().error(new Error("Tipo de assinatura invalida")),
    ativo: Joi.boolean().required().error(new Error("Modo ativo invalido")),
    data_criacao:Joi.date().required().error(new Error("data_criacao invalida")),
    data_fim:Joi.date().required().error(new Error("data_fim invalida"))
})

export default class validarUseCase{
    static async valida(body:CriarUsuarioAtivoBody){
        try{
            await create_body_schema.validateAsync(body)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(body:CriarUsuarioAtivoBody):Promise<CriarUsuarioAtivoResponse>{
        try{
            const {id_user,email, tipo_assinatura, ativo, data_criacao,data_fim} = body
            const checa_user=await Usuarios.findOne({where:{id: id_user}})
            if(!checa_user){
                throw({
                    message:`Usuario ${checa_user} não foi encontrado`,
                    status:http_status.CONFLICT
                })
            }
            const usuario=await UsuariosAtivos.create({
                id_user,
                email:checa_user.email,
                telefone:checa_user.telefone,
                tipo_assinatura,
                ativo,
                data_criacao,
                data_fim
            })
            const segredo=process.env.JWT_SECRET
            if(!segredo){
                throw({
                    message:"JWT_SECRET nao setado",
                    status:http_status.INTERNAL_ERROR
                })
            }
            return {
                id:usuario.id,
                email:usuario.email,
                telefone:usuario.telefone,
                id_user,
                tipo_assinatura,
                ativo,
                data_criacao,
                data_fim
            }
        }
        catch(err){
            throw(err)
        }
    }
}