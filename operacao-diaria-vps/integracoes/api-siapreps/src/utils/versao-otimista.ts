import { Response } from "express";
import http_status from "../consts/http-status-enum";
import { RequestAutenticado } from "../types/express-types";

export function parseVersaoEsperada(req: RequestAutenticado): number | undefined {
  const ifMatch = req.headers["if-match"];
  if (typeof ifMatch === "string") {
    const semAspas = ifMatch.replace(/^"(.*)"$/, "$1");
    const numero = Number(semAspas);
    if (!Number.isNaN(numero)) {
      return numero;
    }
  }

  if (req.body?.versao !== undefined && req.body?.versao !== null) {
    const numero = Number(req.body.versao);
    if (!Number.isNaN(numero)) {
      return numero;
    }
  }

  return undefined;
}

export function exigeVersaoEsperada(req: RequestAutenticado): number {
  const versaoEsperada = parseVersaoEsperada(req);
  if (versaoEsperada === undefined) {
    throw {
      status: http_status.BAD_REQUEST,
      message: "If-Match ou campo versao é obrigatório para esta operação",
    };
  }
  return versaoEsperada;
}

export function setEtagHeader(res: Response, versao: number) {
  res.set("ETag", `"${versao}"`);
}
