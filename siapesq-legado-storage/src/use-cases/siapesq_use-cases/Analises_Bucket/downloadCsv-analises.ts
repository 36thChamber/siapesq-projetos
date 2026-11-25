import Joi from 'joi'
import http_status from '../../../consts/http-status-enum';
import AWS_S3_REPOSITORY from '../../../repositories/aws-s3-repository';
const req_query_schema=Joi.object({
    bucket_name:Joi.string().required(),
    object_name:Joi.string().required()
})
export default class DownloadAnalises{
    static async valida(bucket_name:string,object_name:string){
        try{
            await req_query_schema.validateAsync({bucket_name,object_name})
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(bucket_name:string,object_name:string,aws_repository:AWS_S3_REPOSITORY){
        try{
            const read_stream=await aws_repository.download_object(bucket_name,object_name)
            return read_stream
        }
        catch(err){
            throw(err)
        }
    }
}