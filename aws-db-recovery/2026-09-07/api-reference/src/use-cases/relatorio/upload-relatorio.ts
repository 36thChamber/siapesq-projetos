import Joi from 'joi'
import http_status from '../../consts/http-status-enum';
import { UploadRelatorioBodyRequest,UploadRelatorioResponse } from '../../types/relatorios-types'
import Usuarios from '../../models/Usuarios';
import Embarcacoes from '../../models/Embarcacoes';
import Relatorios from '../../models/Relatorios';
import AWS_S3_REPOSITORY from '../../repositories/aws-s3-repository';
const create_body_schema=Joi.object({
    id_usuario:Joi.number().required().error(()=>new Error("'id_usuario' não enviado")),
    id_embarcacao:Joi.number().required().error(()=>new Error("'id_embarcacao' não enviado")),
    nome:Joi.string().required().error(()=>new Error("'nome' não enviado"))
})
export default class UploadRelatorioUseCase{
static async valida(body:UploadRelatorioBodyRequest,file:Express.Multer.File){
    try{
        await create_body_schema.validateAsync(body);
        if(file.mimetype!="application/pdf"){
            throw({
                message:"Arquivo não é um pdf",
                status:http_status.BAD_REQUEST
            })
        }
    }
    catch(err:any){
        throw({message:err.message,status:http_status.BAD_REQUEST})
    }
} 
static async executa(body:UploadRelatorioBodyRequest,file:Express.Multer.File):Promise<UploadRelatorioResponse>{
        try{
            const usuario=await Usuarios.findByPk(body.id_usuario);
            if(!usuario){
                throw({
                    message:"Usuario não encontrado",
                    status:http_status.NOT_FOUND
                })
            }
            const embarcacao=await Embarcacoes.findByPk(body.id_embarcacao);
            if(!embarcacao){
                throw({
                    message:"Embarcacao não encontrado",
                    status:http_status.NOT_FOUND
                })
            }
            //refatorar depois
            const fileuploader = new AWS_S3_REPOSITORY(process.env.AWS_BUCKET_REGION);
            const uri=await fileuploader.criar_objeto_no_bucket(process.env.AWS_PDF_BUCKET as string,file.path,'.pdf')
            const relatorio = await Relatorios.create({
                uri,
                id_usuario:body.id_usuario,
                nome:body.nome,
                id_embarcacao:body.id_embarcacao
            })
            return {
                id:relatorio.id,
                id_usuario:relatorio.id_usuario,
                id_embarcacao:relatorio.id_embarcacao,
                uri:relatorio.uri,
                nome:relatorio.nome
            }
        }
        catch(err){
            throw(err)
        }
    }
}