import { Request, Response } from "express";
import { RequestAutenticado } from "../../types/express-types";
import http_status from "../../consts/http-status-enum";
import CriarGrupoEspecieUseCase from "../../use-cases/siapesq_use-cases/GrupoEspecie/post-grupoEspecie";
import GetGrupoEspecieUseCase from "../../use-cases/siapesq_use-cases/GrupoEspecie/get-grupoEspecie";
import ListarGruposEspeciesUseCase from "../../use-cases/siapesq_use-cases/GrupoEspecie/listar-GrupoEspecie";
import ListarEspeciesPeloGrupoUseCase from "../../use-cases/siapesq_use-cases/GrupoEspecie/listar-especies-pelo-grupo";

export default class GruposEspeciesControllers {
  async get(req: RequestAutenticado, res: Response) {
    try {
      const { id } = req.params;
      await GetGrupoEspecieUseCase.valida({ id });
      const especie = await GetGrupoEspecieUseCase.executa({ id });
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
      await ListarGruposEspeciesUseCase.valida(query);
      const lista = await ListarGruposEspeciesUseCase.executa(query);
      return res.status(http_status.OK).json(lista);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }
  async create(req: RequestAutenticado, res: Response) {
    try {
      await CriarGrupoEspecieUseCase.valida(req.body);
      const especie = await CriarGrupoEspecieUseCase.executa(req.body);
      return res.status(http_status.OK).json(especie);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }

  async listEspecies(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await ListarEspeciesPeloGrupoUseCase.valida({ id });
      const especies = await ListarEspeciesPeloGrupoUseCase.execute({ id });

      return res.status(http_status.OK).json(especies);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      res.status(statusCode).json(err);
    }
  }
}
