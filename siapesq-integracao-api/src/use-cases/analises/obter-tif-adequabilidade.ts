import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";
import Analises from "../../models/Analises";
import Assinaturas from "../../models/Assinaturas";
import { TipoUsuario } from "../../models/enums/tipoUsuarioEnum";
import AWS_S3_REPOSITORY from "../../repositories/aws-s3-repository";
import { resolverTifAdequabilidade, AnaliseStorageInvalido } from "../../utils/analise-tif-storage";
import { verificaQuotaEspecie } from "../../utils/quota-especie";

const EXPIRES_IN = 900;

export type ObterTifParams = {
  id_analise: string;
  id_usuario: string;
  tipo_usuario?: string;
};

export default class ObterTifAdequabilidadeUseCase {
  static async executa(params: ObterTifParams, awsRepository: AWS_S3_REPOSITORY): Promise<{ id_analise: string; url: string; expiresIn: number }>;
  static async executa(params: ObterTifParams, awsRepository: AWS_S3_REPOSITORY, metadataOnly: true): Promise<{ id_analise: string; source_bucket: string; source_key: string }>;
  static async executa(params: ObterTifParams, awsRepository: AWS_S3_REPOSITORY, metadataOnly = false) {
    const { error } = Joi.string().uuid().required().validate(params.id_analise);
    if (error) {
      throw { status: httpStatus.BAD_REQUEST, message: "ID da análise inválido." };
    }

    const analise = await Analises.findByPk(params.id_analise);
    if (!analise) {
      throw { status: httpStatus.NOT_FOUND, message: "Análise não encontrada." };
    }

    if (params.tipo_usuario !== TipoUsuario.ADMIN) {
      const resultado = await Assinaturas.sequelize!.transaction((transaction) =>
        verificaQuotaEspecie(params.id_usuario, analise.id_especie, transaction),
      );
      if (resultado === "bloqueado_sem_plano") {
        throw {
          status: httpStatus.FORBIDDEN,
          message: "Usuário sem plano ativo. Assine para acessar o conteúdo.",
        };
      }
      if (resultado === "bloqueado_limite") {
        throw {
          status: httpStatus.FORBIDDEN,
          message: "Limite de visualizações de espécies do seu plano foi atingido.",
        };
      }
    }

    let key: string;
    try {
      key = resolverTifAdequabilidade(analise);
    } catch (err) {
      if (err instanceof AnaliseStorageInvalido) {
        throw {
          status: httpStatus.CONFLICT,
          code: "ANALISE_STORAGE_NOT_MAPPED",
          message: err.message,
        };
      }
      throw err;
    }

    const bucket = process.env.COG_MIRROR_BUCKET;
    if (!bucket) {
      throw { status: httpStatus.INTERNAL_ERROR, message: "Storage não configurado." };
    }

    if (metadataOnly) return { id_analise: analise.id_analise, source_bucket: process.env.COG_SOURCE_BUCKET || "example-bucket", source_key: key };

    try {
      await awsRepository.verificar_objeto(bucket, key);
    } catch (err: any) {
      if (err?.name === "NotFound" || err?.name === "NoSuchKey" || err?.$metadata?.httpStatusCode === 404) {
        throw {
          status: httpStatus.NOT_FOUND,
          code: "ANALISE_TIF_NOT_FOUND",
          message: "Arquivo da análise não encontrado.",
        };
      }
      throw { status: 503, message: "Storage temporariamente indisponível." };
    }

    try {
      const url = await awsRepository.assinar_leitura_objeto(bucket, key, EXPIRES_IN);
      return { id_analise: analise.id_analise, url, expiresIn: EXPIRES_IN };
    } catch {
      throw { status: 503, message: "Storage temporariamente indisponível." };
    }
  }
}
