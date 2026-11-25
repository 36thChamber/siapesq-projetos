import { NextFunction, Response } from "express";

import httpStatus from "../consts/http-status-enum";
import { RequestAutenticado } from "../types/express-types";
import Embarcacoes from "../models/Embarcacoes";
import Missoes from "../models/Missoes";
import Lances from "../models/Lances";
import OcorrenciasLance from "../models/OcorrenciasLance";
import Relatorios from "../models/Relatorios";

type DonoResolvido = { id_usuario_dono: number | string } | null;
type Resolver = (id: number) => Promise<DonoResolvido>;

export function mesmoIdentificador(
  primeiro: unknown,
  segundo: unknown,
): boolean {
  const primeiroNormalizado = Number(primeiro);
  const segundoNormalizado = Number(segundo);

  return (
    Number.isInteger(primeiroNormalizado) &&
    primeiroNormalizado > 0 &&
    Number.isInteger(segundoNormalizado) &&
    segundoNormalizado > 0 &&
    primeiroNormalizado === segundoNormalizado
  );
}

export function checaPropriedade(resolveDono: Resolver, paramName = "id") {
  return async (req: RequestAutenticado, res: Response, next: NextFunction) => {
    try {
      if (!req.auth) {
        return res.status(httpStatus.UNAUTHORIZED).json({ message: "não autenticado" });
      }

      const rawId = req.params[paramName];
      const id = Number(rawId);
      if (!rawId || Number.isNaN(id)) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: `${paramName} inválido` });
      }

      const recurso = await resolveDono(id);

      if (!recurso) {
        return res.status(httpStatus.NOT_FOUND).json({ message: "recurso não encontrado" });
      }

      if (
        !req.auth.administracao &&
        !mesmoIdentificador(
          recurso.id_usuario_dono,
          req.auth.id_usuario,
        )
      ) {

        return res.status(httpStatus.NOT_FOUND).json({ message: "recurso não encontrado" });
      }

      next();
    } catch (err: any) {
      return res
        .status(err.status || httpStatus.INTERNAL_ERROR)
        .json({ message: err.message || err });
    }
  };
}



export const resolveDonoEmbarcacao: Resolver = async (id) => {
  const embarcacao = await Embarcacoes.findByPk(id);
  if (!embarcacao) return null;
  return { id_usuario_dono: embarcacao.id_mestre };
};

export const resolveDonoMissao: Resolver = async (id) => {
  const missao = await Missoes.findByPk(id);
  if (!missao) return null;
  return { id_usuario_dono: missao.id_usuario };
};

export const resolveDonoLance: Resolver = async (id) => {
  const lance = await Lances.findByPk(id);
  if (!lance) return null;
  return resolveDonoMissao(lance.id_missao);
};

export const resolveDonoOcorrenciaLance: Resolver = async (id) => {
  const ocorrencia = await OcorrenciasLance.findByPk(id);
  if (!ocorrencia) return null;
  return resolveDonoLance(ocorrencia.id_lance);
};

export const resolveDonoRelatorio: Resolver = async (id) => {
  const relatorio = await Relatorios.findByPk(id);
  if (!relatorio) return null;
  return { id_usuario_dono: relatorio.id_usuario };
};

export const resolveDonoPorEmbarcacaoId: Resolver = resolveDonoEmbarcacao;
export const resolveDonoPorMissaoId: Resolver = resolveDonoMissao;
export const resolveDonoPorLanceId: Resolver = resolveDonoLance;
