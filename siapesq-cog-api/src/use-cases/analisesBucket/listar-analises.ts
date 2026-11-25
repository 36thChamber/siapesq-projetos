import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";
import AWS_S3_REPOSITORY from "../../repositories/aws-s3-repository";

export type ListarAnalisesBucketQueryRequest = {
  bucket_name: string;
  aws_pagination_token?: string;
};

export default class ListarAnalisesBucketUseCase {
  static async valida(
    query: ListarAnalisesBucketQueryRequest
  ): Promise<void> {
    const schema = Joi.object({
      bucket_name: Joi.string().required(),
      aws_pagination_token: Joi.string().optional(),
    });

    try {
      await schema.validateAsync(query);
    } catch (err: any) {
      throw {
        message: err.message,
        status: httpStatus.BAD_REQUEST,
      };
    }
  }

  static async executa(
    query: ListarAnalisesBucketQueryRequest,
    awsRepository: AWS_S3_REPOSITORY
  ) {
    await this.valida(query);

    const {
      NextContinuationToken: next_aws_pagination_token,
      Contents: objects,
    } = await awsRepository.listar_objetos(
      query.bucket_name,
      query.aws_pagination_token
    );

    return {
      objects,
      next_aws_pagination_token,
    };
  }
}