import { Response, NextFunction } from "express";

import httpStatus from "../consts/http-status-enum";
import Assinaturas from "../models/Assinaturas";
import { TipoUsuario } from "../models/enums/tipoUsuarioEnum";
import { verificaQuotaEspecie } from "../utils/quota-especie";

export default function checa_quota_especie(paramName: string = "id") {
  return async function (req: any, res: Response, next: NextFunction) {
    try {
      const id_usuario = req.id_usuario;
      const id_especie = (req.params as Record<string, string>)[paramName];

      // Antes era `return next()` — bypass silencioso quando o nome do
      // param não batia com a rota. Falhar alto é mais seguro.
      if (!id_especie) {
        return res.status(httpStatus.INTERNAL_ERROR).json({
          message: `checa_quota_especie: param "${paramName}" ausente na rota`,
        });
      }

      // Isenção administrativa por papel explícito (depende de
      // checa_token popular req.tipo_usuario).
      if (req.tipo_usuario === TipoUsuario.ADMIN) {
        return next();
      }

      const resultado = await Assinaturas.sequelize!.transaction((t) =>
        verificaQuotaEspecie(id_usuario, id_especie, t),
      );

      if (resultado === "bloqueado_sem_plano") {
        return res.status(httpStatus.FORBIDDEN).json({
          message: "Usuário sem plano ativo. Assine para acessar o conteúdo.",
        });
      }
      if (resultado === "bloqueado_limite") {
        return res.status(httpStatus.FORBIDDEN).json({
          message:
            "Limite de visualizações de espécies do seu plano foi atingido.",
        });
      }

      return next();
    } catch (err: any) {
      return res
        .status(err.status ?? httpStatus.INTERNAL_ERROR)
        .json(err);
    }
  };
}