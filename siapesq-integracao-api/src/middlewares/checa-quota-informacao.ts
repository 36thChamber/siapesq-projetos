// middlewares/checa-quota-informacao.ts
import { Response, NextFunction } from "express";
import httpStatus from "../consts/http-status-enum";
import Assinaturas from "../models/Assinaturas";
import InformacoesEspecies from "../models/InformacoesEspecies";
import { TipoUsuario } from "../models/enums/tipoUsuarioEnum";
import { verificaQuotaEspecie } from "../utils/quota-especie";

export default function checa_quota_informacao() {
  return async function (req: any, res: Response, next: NextFunction) {
    try {
      const id_usuario = req.id_usuario;
      const id_informacao = req.params.id;
      if (!id_informacao) {
        return res.status(httpStatus.BAD_REQUEST).json({
          message: "id da informação ausente",
        });
      }

      if (req.tipo_usuario === TipoUsuario.ADMIN) return next();

      const info = await InformacoesEspecies.findByPk(id_informacao, {
        attributes: ["id_especie"],
      });
      if (!info) {
        return res
          .status(httpStatus.NOT_FOUND)
          .json({ message: "Informação não encontrada" });
      }

      const resultado = await Assinaturas.sequelize!.transaction((t) =>
        verificaQuotaEspecie(id_usuario, info.id_especie, t),
      );

      if (resultado !== "liberado") {
        return res.status(httpStatus.FORBIDDEN).json({
          message: "Acesso ao conteúdo da espécie não autorizado.",
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