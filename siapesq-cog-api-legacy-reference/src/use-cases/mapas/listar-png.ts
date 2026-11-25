import Joi from 'joi'
import http_status from '../../consts/http-status-enum';
import AWS_S3_REPOSITORY from '../../repositories/aws-s3-repository';
const req_query_schema=Joi.object({
    bucket_name:Joi.string().required(),
    aws_pagination_token:Joi.string().optional()
})
export default class ListarPng{
    static async valida(bucket_name:string,aws_pagination_token?:string){
        try{
            await req_query_schema.validateAsync({bucket_name,aws_pagination_token})
        }
        catch(err:any){
            throw({message:err.message,status:http_status.BAD_REQUEST})
        }
    }
    static async executa(bucket_name:string,aws_repository:AWS_S3_REPOSITORY,aws_pagination_token?:string):Promise<any>{
        try{
            const {
                NextContinuationToken:next_aws_pagination_token,
                Contents:objects
            } = await aws_repository.listar_objetos(bucket_name,aws_pagination_token)
            return {
                objects,
                next_aws_pagination_token
            }
        }
        catch(err){
            throw(err)
        }
    }
}