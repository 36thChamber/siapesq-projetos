import AWS_S3_REPOSITORY from "../repositories/aws-s3-repository";
import DownloadAnaliseUseCase from "../use-cases/analisesBucket/download-analises";
import DownloadCsvAnaliseUseCase from "../use-cases/analisesBucket/downloadCsv-analises";
import ListarAnalisesBucketUseCase from "../use-cases/analisesBucket/listar-analises";

export type DownloadAnaliseBucketParamsRequest = {
  bucket_name: string;
  object_name: string;
};

export type ListarAnalisesBucketQueryRequest = {
  bucket_name: string;
  aws_pagination_token?: string;
};

export default class AnalisesBucketService {
  static async download(
    params: DownloadAnaliseBucketParamsRequest,
    awsRepository: AWS_S3_REPOSITORY
  ) {
    return DownloadAnaliseUseCase.executa(params, awsRepository);
  }

  static async downloadCsv(
    params: DownloadAnaliseBucketParamsRequest,
    awsRepository: AWS_S3_REPOSITORY
  ) {
    return DownloadCsvAnaliseUseCase.executa(params, awsRepository);
  }

  static async listar(
    query: ListarAnalisesBucketQueryRequest,
    awsRepository: AWS_S3_REPOSITORY
  ) {
    return ListarAnalisesBucketUseCase.executa(query, awsRepository);
  }
}