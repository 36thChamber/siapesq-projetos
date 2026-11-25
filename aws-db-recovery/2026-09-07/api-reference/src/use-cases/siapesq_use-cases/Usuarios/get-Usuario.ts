import Joi from 'joi';
import { ListarUsuarios, ListarUsuariosResponse } from '../../../types/siapesq_types/Usuarios-types';
import http_status from '../../../consts/http-status-enum';
import usuarios from '../../../models/siapesq/Usuarios';

const req_query_schema=Joi.object({
    limit:Joi.number().default(10).error(()=>new Error("limit inválido")),
    offset:Joi.number().default(0).error(()=>new Error("offset inválido"))
})
export default class ListandoUsuarios{
    static async valida(query:ListarUsuarios){
        try{
            await req_query_schema.validateAsync(query)
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(query:ListarUsuarios):Promise<ListarUsuariosResponse>{
        try{
            const { limit,offset } = query
            const {rows,count} = await usuarios.findAndCountAll({limit,offset})
            return {
                usuarios:rows,
                total:count
            }
        }
        catch(err){
            throw(err)
        }
    }
}