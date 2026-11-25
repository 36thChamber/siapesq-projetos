import { Response } from "express";
import { RequestAutenticado } from "../types/express-types";
import http_status from "../consts/http-status-enum";
import DeletarInformacaoEspecieUseCase from "../use-cases/informacoesEspecies/deletar-informacao-especie";
import GetInformacoesEspeciesUseCase from "../use-cases/informacoesEspecies/buscar-informacao-especie-por-id";
import ListarInformacoesEspeciesUseCase from "../use-cases/informacoesEspecies/buscar-informacoes-especies";
import CriarInformacaoEspecieUseCase from "../use-cases/informacoesEspecies/criar-informacao-especie";
import UpdateInformacoesEspeciesUseCase from "../use-cases/informacoesEspecies/atualizar-informacao-especie";

export default class InformacoesEspeciesControllers {
  async get(req: RequestAutenticado, res: Response) {
    try {
      const { id } = req.params;
      await GetInformacoesEspeciesUseCase.valida({ id_informacaoespecies: id });
      const especie = await GetInformacoesEspeciesUseCase.executa({
        id_informacaoespecies: id,
      });
      return res.status(http_status.OK).json(especie);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }
  async list(req: RequestAutenticado, res: Response) {
    try {
      const { limit, offset } = req.query as {
        limit?: string;
        offset?: string;
      };

      const limitNum = limit ? parseInt(limit) : 10000;
      const offsetNum = offset ? parseInt(offset) : 0;

      if (isNaN(limitNum) || isNaN(offsetNum)) {
        throw {
          status: http_status.BAD_REQUEST,
          message: "Parâmetros inválidos: limit e offset devem ser números",
        };
      }

      const query = { limit: limitNum, offset: offsetNum };
      await ListarInformacoesEspeciesUseCase.valida(query);
      const lista = await ListarInformacoesEspeciesUseCase.executa(query);
      return res.status(http_status.OK).json(lista);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }
  async create(req: RequestAutenticado, res: Response) {
    try {
      await CriarInformacaoEspecieUseCase.valida(req.body);
      const especie = await CriarInformacaoEspecieUseCase.executa(req.body);
      return res.status(http_status.OK).json(especie);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }
  async update(req: RequestAutenticado, res: Response) {
    try {
      const update = await UpdateInformacoesEspeciesUseCase.executa(
        req.body,
        req.body.id
      );
      return res.status(http_status.OK).json(update);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }
  async delete(req: RequestAutenticado, res: Response) {
    try {
      const { id } = req.params;
      await DeletarInformacaoEspecieUseCase.valida({
        id_informacaoespecies: id,
      });
      const informacaoEspecie = await DeletarInformacaoEspecieUseCase.executa({
        id_informacaoespecies: id,
      });
      return res.status(http_status.OK).json(informacaoEspecie);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }
}
