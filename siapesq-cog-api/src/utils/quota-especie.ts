// utils/quota-especie.ts
import { Op, Transaction } from "sequelize";
import Assinaturas from "../models/Assinaturas";
import Planos from "../models/Planos";
import VisualizacoesEspecies from "../models/VisualizacoesEspecies";
import { StatusAssinatura } from "../models/enums/statusAssinaturasEnum";

export type ResultadoQuota = "liberado" | "bloqueado_sem_plano" | "bloqueado_limite";

export async function verificaQuotaEspecie(
  id_usuario: string,
  id_especie: string,
  transaction?: Transaction,
): Promise<ResultadoQuota> {
  const assinatura = await Assinaturas.findOne({
    where: {
      id_usuario,
      status: { [Op.in]: [StatusAssinatura.ATIVA, StatusAssinatura.TRIAL] },
      data_fim: { [Op.gte]: new Date() },
    },
    include: [{ model: Planos, as: "plano" }],
    order: [["criado_em", "DESC"]],
    transaction,
    lock: transaction
      ? { level: transaction.LOCK.UPDATE, of: Assinaturas }
      : undefined,
  });

  const plano = assinatura?.plano;
  if (!plano) return "bloqueado_sem_plano";

  if (plano.especies_ilimitadas) return "liberado";

  const jaVisualizada = await VisualizacoesEspecies.findOne({
    where: { id_usuario, id_especie },
    transaction,
  });
  if (jaVisualizada) return "liberado";

  const total = await VisualizacoesEspecies.count({
    where: { id_usuario },
    transaction,
  });
  if (total >= plano.especies_disponiveis) return "bloqueado_limite";

  await VisualizacoesEspecies.create(
    { id_usuario, id_especie },
    { transaction },
  );
  return "liberado";
}