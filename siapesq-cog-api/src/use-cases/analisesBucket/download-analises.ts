import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";
import AWS_S3_REPOSITORY from "../../repositories/aws-s3-repository";

export type DownloadAnaliseBucketParamsRequest = {
  bucket_name: string;
  object_name: string;
};

export default class DownloadAnaliseUseCase {
  static async valida(
    params: DownloadAnaliseBucketParamsRequest
  ): Promise<void> {
    const schema = Joi.object({
      bucket_name: Joi.string().required(),
      object_name: Joi.string().required(),
    });

    try {
      await schema.validateAsync(params);
    } catch (err: any) {
      throw {
        message: err.message,
        status: httpStatus.BAD_REQUEST,
      };
    }
  }

  static async executa(
    params: DownloadAnaliseBucketParamsRequest,
    awsRepository: AWS_S3_REPOSITORY
  ) {
    await this.valida(params);

    return awsRepository.download_object(
      params.bucket_name,
      params.object_name
    );
  }
}