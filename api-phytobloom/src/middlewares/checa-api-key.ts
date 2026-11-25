import { NextFunction, Response } from "express";
import http_status from "../consts/http-status-enum";
import checa_token from "./checa-token";

export default function checa_api_key(
  req: any,
  res: Response,
  next: NextFunction,
) {
  try {
    const api_key = req.get("x-api-key");
    if (!api_key) {
      checa_token(req, res, next);
      return;
    }

    const key = process.env.API_KEY;
    if (!key) {
      throw {
        message: "API_KEY nao definido",
        status: http_status.INTERNAL_ERROR,
      };
    }

    if (api_key !== key) {
      throw {
        message: "API_KEY invalida",
        status: http_status.UNAUTHORIZED,
      };
    }

    req.autenticado_por_api_key = true;
    next();
  } catch (err: any) {
    const statusCode = err.status || http_status.INTERNAL_ERROR;
    return res.status(statusCode).json({
      message: err.message || "API_KEY invalida",
      status: statusCode,
    });
  }
}

/** Protege integrações de servidor sem aceitar JWT como alternativa. */
export function checa_api_key_externa(
  req: any,
  res: Response,
  next: NextFunction,
) {
  const api_key = req.get("x-api-key");
  const key = process.env.API_KEY;

  if (!key) {
    return res.status(http_status.INTERNAL_ERROR).json({
      message: "API_KEY nao definido",
      status: http_status.INTERNAL_ERROR,
    });
  }

  if (api_key !== key) {
    return res.status(http_status.UNAUTHORIZED).json({
      message: "API_KEY invalida",
      status: http_status.UNAUTHORIZED,
    });
  }

  next();
}
