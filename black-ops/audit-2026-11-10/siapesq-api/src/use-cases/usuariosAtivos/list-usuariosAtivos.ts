import Joi from 'joi'
import http_status from '../../consts/http-status-enum';
import UsuariosAtivos from '../../models/UsuariosAtivos';
import { ListarUsuariosAtivos, ListarUsuariosAtivosReponse } from '../../types/usuarios-types';
const req_query_schema=Joi.object({
    limit:Joi.number().default(10).error(()=>new Error("limit inválido")),
    offset:Joi.number().default(0).error(()=>new Error("offset inválido"))
})
export default class ListandoUsuariosAtivos{
    static async valida(query:ListarUsuariosAtivos){
        try{
            await req_query_schema.validateAsync(query)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(query:ListarUsuariosAtivos):Promise<ListarUsuariosAtivosReponse>{
        try{
            const { limit,offset } = query
            const {rows,count} = await UsuariosAtivos.findAndCountAll({limit,offset})
            return {
                usuariosAtivos:rows,
                total:count
            }
        }
        catch(err){
            throw(err)
        }
    }
}