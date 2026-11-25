import { query } from "express";
import http_status from "../consts/http-status-enum";
import AWS_S3_REPOSITORY from "../repositories/aws-s3-repository";
import BuscarAnalisesUseCase from "../use-cases/analises/buscar-analises";
import { ListarAnalisesQueryRequest } from "../types/analises-types";

export default class AnalisesService {
  private static readonly DAILY_PREFIXES = {
    predictions: "predictions/daily/",
    predictors: "predictors/daily/",
  } as const;
  private awsBucketRepo: AWS_S3_REPOSITORY;
  private bucketName: string;

  constructor() {
    this.awsBucketRepo = new AWS_S3_REPOSITORY(process.env.AWS_BUCKET_REGION);
    this.bucketName = process.env.DAILY_RASTER_BUCKET || "";
  }

  private validarBucket() {
    if (!this.bucketName) {
      throw {
        status: http_status.BAD_REQUEST,
        message: "Bucket AWS não configurado.",
      };
    }
  }

  private validarObjectName(objectName: string) {
    if (!objectName || objectName === "undefined" || objectName === "null") {
      throw {
        status: http_status.BAD_REQUEST,
        message: "O parâmetro object_name é obrigatório.",
      };
    }

    if (!/\.(tif|nc)$/i.test(objectName)) {
      throw {
        status: http_status.BAD_REQUEST,
        message: "O arquivo solicitado precisa ser um arquivo TIF ou NC.",
      };
    }
  }

  private extrairDataDoPrefixo(prefixo: string, dailyPrefix: string) {
    return prefixo.slice(dailyPrefix.length).replace(/\/$/, "");
  }

  private valorData(data: string) {
    const iso = data.match(/(\d{4})[-_.](\d{2})[-_.](\d{2})/);
    if (iso) {
      return Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    }

    const brasileira = data.match(/(\d{2})[-_.](\d{2})[-_.](\d{4})/);
    if (brasileira) {
      return Date.UTC(
        Number(brasileira[3]),
        Number(brasileira[2]) - 1,
        Number(brasileira[1]),
      );
    }

    const compacta = data.match(/(\d{4})(\d{2})(\d{2})/);
    if (compacta) {
      return Date.UTC(
        Number(compacta[1]),
        Number(compacta[2]) - 1,
        Number(compacta[3]),
      );
    }

    return Number.NEGATIVE_INFINITY;
  }

  private dataAnaliseDaDataBucket(dataBucket: string) {
    const timestamp = this.valorData(dataBucket);

    if (!Number.isFinite(timestamp)) {
      return dataBucket;
    }

    const UM_DIA_EM_MS = 24 * 60 * 60 * 1000;
    return new Date(timestamp - UM_DIA_EM_MS).toISOString().slice(0, 10);
  }

  private normalizarIdentificador(valor: string) {
    return valor
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\.(tiff?|nc)$/i, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toLowerCase();
  }

  private nomeVariavelPredictor(valor: string) {
    const identificador = this.normalizarIdentificador(valor);
    const partes = valor
      .split(/[\\/]/)
      .map((parte) => this.normalizarIdentificador(parte));
    const variaveis = [
      {
        nome: "Profundidade",
        aliases: ["profundidade", "depth", "bathymetry", "batimetria"],
      },
      { nome: "Salinidade", aliases: ["salinidade", "salinity", "so"] },
      {
        nome: "Temperatura",
        aliases: ["temperatura", "temperature", "thetao", "sst"],
      },
      {
        nome: "Clorofila",
        aliases: ["clorofila", "chlorophyll", "chlorophylla", "chl"],
      },
    ];
    const variavel = variaveis.find(({ aliases }) =>
      aliases.some((alias) =>
        alias.length <= 3
          ? partes.includes(alias)
          : identificador.includes(alias),
      ),
    );

    return variavel?.nome;
  }

  private nomeAnaliseDoObjeto(
    key: string,
    prefixo: string,
    origem: keyof typeof AnalisesService.DAILY_PREFIXES,
  ) {
    const caminhoRelativo = key.slice(prefixo.length);
    const partes = caminhoRelativo.split("/").filter(Boolean);

    if (origem === "predictions") {
      return partes[0] || "";
    }

    return (
      this.nomeVariavelPredictor(caminhoRelativo) ||
      partes[0] ||
      partes[partes.length - 1]?.replace(/\.(tif|nc)$/i, "") ||
      ""
    );
  }

  private async buscarAnaliseMaisRecente(
    origem: keyof typeof AnalisesService.DAILY_PREFIXES,
  ) {
    const dailyPrefix = AnalisesService.DAILY_PREFIXES[origem];
    const prefixos = await this.awsBucketRepo.listar_prefixos(
      this.bucketName,
      dailyPrefix,
    );

    if (!prefixos.length) {
      return undefined;
    }

    const prefixo = [...prefixos].sort((a, b) => {
      const dataA = this.extrairDataDoPrefixo(a, dailyPrefix);
      const dataB = this.extrairDataDoPrefixo(b, dailyPrefix);
      const diferenca = this.valorData(dataB) - this.valorData(dataA);

      return diferenca || dataB.localeCompare(dataA, "pt-BR", { numeric: true });
    })[0];
    const dataBucket = this.extrairDataDoPrefixo(prefixo, dailyPrefix);
    const dataAnalise = this.dataAnaliseDaDataBucket(dataBucket);
    const objetos = (
      await this.awsBucketRepo.listar_todos_objetos(this.bucketName, prefixo)
    ).filter(
      (objeto) =>
        (origem === "predictions"
          ? objeto.Key?.toLowerCase().endsWith(".tif")
          : objeto.Key?.toLowerCase().endsWith(".nc")) &&
        !(
          origem === "predictions" &&
          this.nomeVariavelPredictor(objeto.Key || "")
        ),
    );

    return { origem, prefixo, dataBucket, dataAnalise, objetos };
  }

  private async buscarAnalisesMaisRecentes() {
    const fontes = (
      await Promise.all([
        this.buscarAnaliseMaisRecente("predictions"),
        this.buscarAnaliseMaisRecente("predictors"),
      ])
    ).filter((fonte): fonte is NonNullable<typeof fonte> => Boolean(fonte));

    if (!fontes.length) {
      throw {
        status: http_status.NOT_FOUND,
        message: "Nenhuma análise diária foi encontrada no bucket.",
      };
    }

    return fontes;
  }

  async listarAnalises(_paginationToken?: string) {
    this.validarBucket();
    const fontes = await this.buscarAnalisesMaisRecentes();
    const fontePrincipal =
      fontes.find(({ origem }) => origem === "predictions") || fontes[0];

    return {
      data_bucket: fontePrincipal.dataBucket,
      data_analise: fontePrincipal.dataAnalise,
      datas_analises: Object.fromEntries(
        fontes.map(({ origem, dataBucket, dataAnalise }) => [
          origem,
          { data_bucket: dataBucket, data_analise: dataAnalise },
        ]),
      ),
      objetos: fontes.flatMap((fonte) =>
        fonte.objetos.map((objeto) => {
          const key = objeto.Key as string;

          return {
            key,
            especie: this.nomeAnaliseDoObjeto(key, fonte.prefixo, fonte.origem),
            origem: fonte.origem,
            data_bucket: fonte.dataBucket,
            data_analise: fonte.dataAnalise,
            lastModified: objeto.LastModified?.toISOString(),
            size: objeto.Size,
          };
        }),
      ),
    };
  }

  async downloadAnalise(objectName: string) {
    this.validarBucket();
    this.validarObjectName(objectName);

    const fontes = await this.buscarAnalisesMaisRecentes();
    const nomeSolicitado = objectName.replace(/\\/g, "/");
    const nomeBase = nomeSolicitado.split("/").pop()?.toLowerCase();
    const especieSolicitada = nomeBase?.replace(/\.(tif|nc)$/i, "");
    const especieNormalizada = this.normalizarIdentificador(
      especieSolicitada || "",
    );
    const candidatos = fontes.flatMap((fonte) =>
      fonte.objetos.map((objeto) => ({ fonte, objeto })),
    );
    const candidato =
      candidatos.find(({ objeto }) => objeto.Key === nomeSolicitado) ||
      candidatos.find(
        ({ fonte, objeto }) =>
          objeto.Key?.toLowerCase() ===
          `${fonte.prefixo}${nomeSolicitado}`.toLowerCase(),
      ) ||
      candidatos.find(
        ({ objeto }) =>
          objeto.Key?.split("/").pop()?.toLowerCase() === nomeBase,
      ) ||
      candidatos.find(({ fonte, objeto }) => {
        const nomeAnalise = this.nomeAnaliseDoObjeto(
          objeto.Key || "",
          fonte.prefixo,
          fonte.origem,
        );
        return this.normalizarIdentificador(nomeAnalise) === especieNormalizada;
      });

    if (!candidato?.objeto.Key) {
      throw {
        status: http_status.NOT_FOUND,
        message: "Arquivo não encontrado na análise mais recente.",
      };
    }

    const readStream = await this.awsBucketRepo.download_object(
      this.bucketName,
      candidato.objeto.Key,
    );

    if (!readStream) {
      throw {
        status: http_status.NOT_FOUND,
        message: "Imagem não encontrada.",
      };
    }

    return {
      readStream,
      dataBucket: candidato.fonte.dataBucket,
      dataAnalise: candidato.fonte.dataAnalise,
      objectName: candidato.objeto.Key,
    };
  }

  async listarNomesAnalises(query: ListarAnalisesQueryRequest) {
    await BuscarAnalisesUseCase.valida(query);
    return BuscarAnalisesUseCase.executa(query);
  }
}
