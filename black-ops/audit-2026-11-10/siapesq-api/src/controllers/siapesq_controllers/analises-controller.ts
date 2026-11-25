import { Response } from "express";
import { RequestAutenticado } from "../../types/express-types";
import http_status from "../../consts/http-status-enum";
import GetAnaliseUseCase from "../../use-cases/siapesq_use-cases/Analises/get-analise";
import ListarAnalisesUseCase from "../../use-cases/siapesq_use-cases/Analises/list-analises";
import CriarAnaliseUseCase from "../../use-cases/siapesq_use-cases/Analises/post-analises";
import UpdateAnaliseUseCase from "../../use-cases/siapesq_use-cases/Analises/update-analise";
import GetAnalisesPorEspecieUseCase from "../../use-cases/siapesq_use-cases/Analises/getByEspecie-analises";

export default class AnalisesControllers {
  async get(req: RequestAutenticado, res: Response) {
    try {
      const { id } = req.params;

      const analise = await GetAnaliseUseCase.executa({
        id_analise: id,
      });

      return res.status(http_status.OK).json(analise);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }
  
  async getIdEspecie(req: RequestAutenticado, res: Response) {
    try {
      const { id_especie } = req.params;

      await GetAnalisesPorEspecieUseCase.valida({ id_especie });

      const analises = await GetAnalisesPorEspecieUseCase.executa({
        id_especie,
      });

      return res.status(http_status.OK).json(analises);
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

      const limitNum = limit ? parseInt(limit, 10) : 10000;
      const offsetNum = offset ? parseInt(offset, 10) : 0;

      if (isNaN(limitNum) || isNaN(offsetNum)) {
        throw {
          status: http_status.BAD_REQUEST,
          message: "Parâmetros inválidos: limit e offset devem ser números",
        };
      }

      const query = { limit: limitNum, offset: offsetNum };

      const lista = await ListarAnalisesUseCase.executa(query);

      return res.status(http_status.OK).json(lista);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }

  async create(req: RequestAutenticado, res: Response) {
    try {
      await CriarAnaliseUseCase.valida(req.body);

      const analise = await CriarAnaliseUseCase.executa(req.body);

      return res.status(http_status.OK).json(analise);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }

  async update(req: RequestAutenticado, res: Response) {
    try {
      await UpdateAnaliseUseCase.valida(req.body);

      const analiseAtualizada = await UpdateAnaliseUseCase.executa(req.body);

      return res.status(http_status.OK).json(analiseAtualizada);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }
}
