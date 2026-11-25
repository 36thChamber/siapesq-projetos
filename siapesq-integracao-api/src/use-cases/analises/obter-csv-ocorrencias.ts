import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";
import Analises from "../../models/Analises";
import Assinaturas from "../../models/Assinaturas";
import { TipoUsuario } from "../../models/enums/tipoUsuarioEnum";
import AWS_S3_REPOSITORY from "../../repositories/aws-s3-repository";
import {
  AnaliseStorageInvalido,
  resolverPrefixoAnualOcorrencias,
} from "../../utils/analise-tif-storage";
import { verificaQuotaEspecie } from "../../utils/quota-especie";

const CENARIO_ANUAL = "anual_2015_2024";
const EXPIRES_IN = 900;
const PREFIXO_OCORRENCE = "Occurrence_";

export type ObterCsvOcorrenciasParams = {
  id_especie: string;
  id_usuario: string;
  tipo_usuario?: string;
};

function nomeArquivoDaKey(key: string): string {
  return key.slice(key.lastIndexOf("/") + 1);
}

function eCsvDeOcorrencias(key: string, prefixo: string): boolean {
  if (!key.startsWith(prefixo)) return false;
  const keyRelativa = key.slice(prefixo.length);
  const nomeArquivo = nomeArquivoDaKey(keyRelativa);
  return (
    !keyRelativa.includes("/") &&
    nomeArquivo.startsWith(PREFIXO_OCORRENCE) &&
    nomeArquivo.endsWith(".csv") &&
    !nomeArquivo.includes("/") &&
    !nomeArquivo.includes("\\") &&
    !nomeArquivo.includes("..")
  );
}

export default class ObterCsvOcorrenciasUseCase {
  static async executa(params: ObterCsvOcorrenciasParams, awsRepository: AWS_S3_REPOSITORY) {
    const { error } = Joi.string().uuid().required().validate(params.id_especie);
    if (error) {
      throw { status: httpStatus.BAD_REQUEST, message: "ID da espécie inválido." };
    }

    if (params.tipo_usuario !== TipoUsuario.ADMIN) {
      const resultado = await Assinaturas.sequelize!.transaction((transaction) =>
        verificaQuotaEspecie(params.id_usuario, params.id_especie, transaction),
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

    const analise = await Analises.findOne({
      where: { id_especie: params.id_especie, cenario: CENARIO_ANUAL },
    });
    if (!analise) {
      throw { status: httpStatus.NOT_FOUND, message: "Análise anual da espécie não encontrada." };
    }

    let prefixo: string;
    try {
      prefixo = resolverPrefixoAnualOcorrencias(analise);
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

    const bucket = process.env.SCIENTIFIC_MEDIA_BUCKET;
    if (!bucket) {
      throw { status: httpStatus.INTERNAL_ERROR, message: "Storage não configurado." };
    }

    let candidatos: string[];
    try {
      const keys = await awsRepository.listar_objetos_por_prefixo(bucket, prefixo);
      candidatos = keys.filter((key) => eCsvDeOcorrencias(key, prefixo));
    } catch {
      throw { status: 503, message: "Storage temporariamente indisponível." };
    }

    if (candidatos.length === 0) {
      throw {
        status: httpStatus.NOT_FOUND,
        code: "ANALISE_OCORRENCIAS_NOT_FOUND",
        message: "CSV de ocorrências não encontrado.",
      };
    }
    if (candidatos.length > 1) {
      throw {
        status: httpStatus.CONFLICT,
        code: "ANALISE_OCORRENCIAS_AMBIGUOUS",
        message: "Mais de um CSV de ocorrências foi encontrado para a espécie.",
      };
    }

    const key = candidatos[0];
    try {
      await awsRepository.verificar_objeto(bucket, key);
    } catch (err: any) {
      if (err?.name === "NotFound" || err?.name === "NoSuchKey" || err?.$metadata?.httpStatusCode === 404) {
        throw {
          status: httpStatus.NOT_FOUND,
          code: "ANALISE_OCORRENCIAS_NOT_FOUND",
          message: "CSV de ocorrências não encontrado.",
        };
      }
      throw { status: 503, message: "Storage temporariamente indisponível." };
    }

    try {
      const url = await awsRepository.assinar_leitura_objeto(bucket, key, EXPIRES_IN);
      return {
        id_especie: params.id_especie,
        cenario: CENARIO_ANUAL,
        nome_arquivo: nomeArquivoDaKey(key),
        url,
        expiresIn: EXPIRES_IN,
      };
    } catch {
      throw { status: 503, message: "Storage temporariamente indisponível." };
    }
  }
}
