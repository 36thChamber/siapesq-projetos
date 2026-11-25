import { Request, Response } from "express";
import http_status from "../consts/http-status-enum";
import EsqueceuSenhaUseCase from "../use-cases/usuarios/esqueceu-senha";
import RedefinirSenhaUseCase from "../use-cases/usuarios/redefinir-senha";

export default class RecuperacaoSenhaController {
  /**
   * POST /esqueceuSenha
   * Rota publica — aceita { email }, resposta identica independente do e-mail existir.
   */
  async esqueceuSenha(req: Request, res: Response) {
    try {
      const { email } = req.body;
      const resultado = await EsqueceuSenhaUseCase.executa(email);
      return res.status(http_status.OK).json(resultado);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }

  /**
   * POST /usuarios/redefinir-senha
   * Rota publica — aceita { token, novaSenha }. O token chega no body
   * pois o frontend extrai da URL enviada por e-mail e o envia aqui.
   */
  async redefinirSenha(req: Request, res: Response) {
    try {
      const { token, novaSenha } = req.body;
      const resultado = await RedefinirSenhaUseCase.executa(token, novaSenha);
      return res.status(http_status.OK).json(resultado);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }
}
