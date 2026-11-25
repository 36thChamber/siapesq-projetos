import { Response } from "express";
import { RequestAutenticado } from "../types/express-types";
import http_status from "../consts/http-status-enum";
import EnviarVerificacaoEmailUseCase from "../use-cases/usuarios/enviar-verificacao-email";
import VerificarEmailUseCase from "../use-cases/usuarios/verificar-email";

export default class VerificacaoEmailController {
  /**
   * POST /verificarEmail/enviar
   * Rota autenticada - usa req.id_usuario do token JWT, ignora qualquer e-mail no body
   */
  async enviar(req: RequestAutenticado, res: Response) {
    try {
      const resultado = await EnviarVerificacaoEmailUseCase.executa(req.id_usuario);
      return res.status(http_status.OK).json(resultado);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }

  /**
   * GET /verificarEmail
   * Rota publica - token recebido via header Authorization: Bearer <token>
   */
  async verificar(req: any, res: Response) {
    try {
      const header = req.headers.authorization as string | undefined;
      if (!header) {
        return res.status(http_status.UNAUTHORIZED).json({
          message: "header authorization e indefinido",
          status: http_status.UNAUTHORIZED,
        });
      }

      const parts = header.trim().split(/\s+/);
      if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer" || !parts[1]) {
        return res.status(http_status.UNAUTHORIZED).json({
          message: "authorization deve usar o formato Bearer <token>",
          status: http_status.UNAUTHORIZED,
        });
      }

      const token = parts[1];
      const resultado = await VerificarEmailUseCase.executa(token);
      return res.status(http_status.OK).json(resultado);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }
}
