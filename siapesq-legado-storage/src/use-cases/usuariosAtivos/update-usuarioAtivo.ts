import Joi from 'joi';
import Usuarios from '../../models/Usuarios';
import { UpdateUsuarioAtivoBody,UpdateUsuarioAtivoResponse } from '../../types/usuariosAtivos-types';
import AuthServices from '../../services/auth-services';
import http_status from '../../consts/http-status-enum';
import UsuariosAtivos from '../../models/UsuariosAtivos';
import { where } from 'sequelize';
const update_usuarioAtivo_schema=Joi.object({
    email: Joi.string().email().error(new Error("'email' não é uma string ou um email válido")),
    telefone: Joi.string().error(new Error("'telefone' não é uma string")),
    ativo: Joi.boolean().required().error(new Error("Valor errado para ativo")),
    data_fim: Joi.date().error(new Error("'data não é valida")),
    data_criacao: Joi.date().error(new Error("'data inicio  não é valida")),    
    id_user: Joi.number().required().error(new Error("ID do usuário é obrigatório")),
    tipo_assinatura: Joi.string().error(new Error("'tipo_assinatura' não é uma string"))
})
export default class UpdateUsuarioAtivoUseCase{
    static async valida(body:UpdateUsuarioAtivoBody){
        try{
            await update_usuarioAtivo_schema.validateAsync(body)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(body:UpdateUsuarioAtivoBody):Promise<UpdateUsuarioAtivoResponse>{
        try{
            const id_usuario=body.id_user
            const usuario=await UsuariosAtivos.findOne(
                {where:{id_user:id_usuario}}
                )
            if(!usuario){
                throw({
                    message:`Usuario(${id_usuario}) não encontrado`,
                    status:404
                })
            }
            await usuario.update(body)
            return {
                id_user:id_usuario,
                email:usuario.email,
                telefone:usuario.telefone,
                ativo:usuario.ativo,
                tipo_assinatura:usuario.tipo_assinatura,
                data_criacao:usuario.data_criacao,
                data_fim:usuario.data_fim,
            }
            
        }
        catch(err){
            throw(err)
        }
    }
}