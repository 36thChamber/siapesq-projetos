import { Request, Response } from "express";
import { RequestAutenticado } from "../../types/express-types";
import http_status from "../../consts/http-status-enum";
import services from "../../services/artigos_services-siapesq";
import ListandoArtigos from "../../use-cases/siapesq_use-cases/Artigos/get-Artigos"; 

export default class ArtigosController {
  
  async create(req: Request, res: Response) {
    try {
      const {
        id_artigo,
        artigo,
        referencia_texto,
        referencia_completa,
        link_drive,
        nome_especie,
        nome_artigo
      } = req.body;

      const novoArtigo = await services.create({
        id_artigo,
        artigo,
        referencia_texto,
        referencia_completa,
        link_drive,
        nome_especie,
        nome_artigo
      });

      return res.status(http_status.OK).json(novoArtigo);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }

  async update(req: RequestAutenticado, res: Response) {
    try {
      const artigoAtualizado = await services.update(req.body, req.body.id_artigo);
      return res.status(http_status.OK).json(artigoAtualizado);
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

      const query = { limit: limitNum, offset: offsetNum };
      
      await ListandoArtigos.valida(query);
      const lista = await ListandoArtigos.executa(query);
      
      return res.status(http_status.OK).json(lista);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }

  async getId(req: RequestAutenticado, res: Response) {
    try {
      const { id } = req.params;
      const artigo = await services.get(id);
      return res.status(http_status.OK).json(artigo);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }
}