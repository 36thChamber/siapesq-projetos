import { randomUUID } from "node:crypto";
import { QueryTypes } from "sequelize";
import Joi from "joi";
import Planos from "../models/Planos";
import Pagamentos from "../models/Pagamentos";
import Assinaturas from "../models/Assinaturas";
import Usuarios from "../models/Usuarios";
import { StatusAssinatura } from "../models/enums/statusAssinaturasEnum";
import { StatusPagamento } from "../models/enums/statusPagamentosEnum";
import { ProvedorPagamento } from "../models/enums/provedorPagamentoEnum";
import { isIsolatedStaging } from "../utils/staging-isolation";

export const paymentSimulationEnabled = () => isIsolatedStaging() && process.env.STAGING_PAYMENT_MODE === "simulation";
const requireSimulation = () => { if (!paymentSimulationEnabled()) throw { status: 503, message: "Pagamento indisponível neste ambiente." }; };
type Simulation = { id: string; id_usuario: string; id_plano: string; metodo: string; provider: string; status: string; duracao_dias: number; nome?: string; valor?: string; id_assinatura?: string };

export default class PaymentSimulation {
  static async create(body: { id_usuario: string; id_plano: string; metodo: string }) {
    requireSimulation();
    const check = Joi.object({ id_usuario: Joi.string().uuid().required(), id_plano: Joi.string().uuid().required(), metodo: Joi.string().valid("cartao", "pix", "boleto").required() }).validate(body);
    if (check.error) throw { status: 400, message: "Dados de pagamento inválidos." };
    const plan = await Planos.findByPk(body.id_plano);
    if (!plan?.ativo) throw { status: 404, message: "Plano indisponível." };
    const origin = new URL(process.env.STAGING_APP_ORIGIN || "http://localhost:3000");
    if (!["http:", "https:"].includes(origin.protocol) || origin.username || origin.password || origin.pathname !== "/") throw { status: 503, message: "Ambiente de testes indisponível." };
    const id = randomUUID(), provider = body.metodo === "cartao" ? ProvedorPagamento.STRIPE : ProvedorPagamento.MERCADOPAGO;
    await Pagamentos.sequelize!.transaction(async transaction => {
      await Pagamentos.create({ id_pagamento: id, id_usuario: body.id_usuario, provedor_pagamento: provider,
        id_pagamento_provedor: `simulation:${id}`, valor: plan.valor_total, moeda: "BRL", status: StatusPagamento.PENDENTE }, { transaction });
      await Pagamentos.sequelize!.query("INSERT INTO siapesq.simulacoes_pagamento(id,id_usuario,id_plano,metodo,provider,duracao_dias) VALUES(:id,:user,:plan,:method,:provider,:days)", {
        replacements: { id, user: body.id_usuario, plan: body.id_plano, method: body.metodo, provider, days: plan.periodicidade.toLowerCase() === "anual" ? 365 : 30 }, transaction });
    });
    return { tipo: "redirect", redirectUrl: `${origin.origin}/homologacao/pagamento/${id}`, simulation: true, provider };
  }

  static async get(id: string, user: string) {
    requireSimulation();
    if (Joi.string().uuid().validate(id).error) throw { status: 400, message: "Pagamento inválido." };
    const rows = await Pagamentos.sequelize!.query<Simulation>(`SELECT s.*,p.nome,g.valor,g.id_assinatura FROM siapesq.simulacoes_pagamento s JOIN siapesq.planos p ON p.id_plano=s.id_plano JOIN siapesq.pagamentos g ON g.id_pagamento=s.id WHERE s.id=:id`, { replacements: { id }, type: QueryTypes.SELECT });
    if (!rows[0]) throw { status: 404, message: "Pagamento não encontrado." };
    if (rows[0].id_usuario !== user) throw { status: 403, message: "Acesso negado a este pagamento." };
    return { ...rows[0], simulation: true };
  }

  static async resolve(id: string, user: string, outcome: string) {
    requireSimulation();
    if (Joi.string().uuid().validate(id).error || !["aprovado", "recusado", "cancelado"].includes(outcome)) throw { status: 400, message: "Resultado de teste inválido." };
    await Pagamentos.sequelize!.transaction(async transaction => {
      const rows = await Pagamentos.sequelize!.query<Simulation>("SELECT * FROM siapesq.simulacoes_pagamento WHERE id=:id FOR UPDATE", { replacements: { id }, type: QueryTypes.SELECT, transaction });
      const simulation = rows[0];
      if (!simulation) throw { status: 404, message: "Pagamento não encontrado." };
      if (simulation.id_usuario !== user) throw { status: 403, message: "Acesso negado a este pagamento." };
      if (simulation.status !== "pendente") {
        if (simulation.status === outcome) return;
        throw { status: 409, message: "O resultado deste teste já foi registrado." };
      }
      if (outcome === "aprovado") {
        // Serialize all checkouts belonging to the same user, including different intents.
        await Usuarios.findByPk(user, { transaction, lock: transaction.LOCK.UPDATE });
        const plan = await Planos.findByPk(simulation.id_plano, { transaction });
        if (!plan?.ativo) throw { status: 409, message: "Plano indisponível." };
        await Assinaturas.update({ status: StatusAssinatura.CANCELADA }, { where: { id_usuario: user, status: StatusAssinatura.ATIVA }, transaction });
        const subscription = await Assinaturas.create({ id_usuario: user, id_plano: simulation.id_plano, status: StatusAssinatura.ATIVA,
          data_inicio: new Date(), data_fim: new Date(Date.now() + simulation.duracao_dias * 86400000), renovacao_automatica: false,
          provedor_pagamento: simulation.provider, id_assinatura_externa: `simulation:${id}` }, { transaction });
        await Pagamentos.update({ status: StatusPagamento.PAGO, id_assinatura: subscription.id_assinatura, data_pagamento: new Date() }, { where: { id_pagamento: id }, transaction });
      } else await Pagamentos.update({ status: StatusPagamento.FALHOU }, { where: { id_pagamento: id }, transaction });
      await Pagamentos.sequelize!.query("UPDATE siapesq.simulacoes_pagamento SET status=:outcome,atualizado_em=now() WHERE id=:id", { replacements: { id, outcome }, transaction });
    });
    return this.get(id, user);
  }
}
