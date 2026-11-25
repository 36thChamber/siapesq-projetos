import { Op, Sequelize } from 'sequelize';
import Joi from 'joi';
import Reservatorios from '../../../models/phytoBloom/Reservatorios';
import { UpdateReservatorioBody, UpdateReservatorioResponse } from '../../../types/phytobloom-types/reservatorios-types';
import http_status from '../../../consts/http-status-enum';

const update_reservatorio_schema = Joi.object({
  nome: Joi.string().optional().error(new Error("Nome inválido")),
  id_usuario: Joi.number().optional().error(new Error("Id de usuário inválido")),
  prioridade: Joi.number().optional().error(new Error("Prioridade inválida")),
  posicoes: Joi.array().items(
    Joi.object({
      latitude: Joi.string().required().error(new Error('Latitude inválida')),
      longitude: Joi.string().required().error(new Error('Longitude inválida'))
    }).required()
  ).optional()
});

export default class UpdateReservatorioUseCase {
  static async valida(body: UpdateReservatorioBody) {
    try {
      await update_reservatorio_schema.validateAsync(body);
    } catch (err: any) {
      throw { message: err.message, status: http_status.BAD_REQUEST };
    }
  }

  static async executa(body: UpdateReservatorioBody, id_reservatorio: number): Promise<UpdateReservatorioResponse> {
    const reservatorio = await Reservatorios.findByPk(id_reservatorio);
    if (!reservatorio) {
      throw {
        message: `Reservatório (${id_reservatorio}) não encontrado`,
        status: http_status.NOT_FOUND
      };
    }

    const t = await Reservatorios.sequelize!.transaction(); // garante que está numa transação

    try {
      const prioridadeAntiga = reservatorio.prioridade;
      const novaPrioridade = body.prioridade;

      // Atualiza prioridades dos outros reservatórios, se necessário
      if (novaPrioridade && novaPrioridade !== prioridadeAntiga) {
        const total = await Reservatorios.count(); // garante que não extrapola
        if (novaPrioridade < 1 || novaPrioridade > total) {
          throw { status: http_status.BAD_REQUEST, message: "Prioridade fora do intervalo válido" };
        }

        if (novaPrioridade < prioridadeAntiga) {
          // Vai subir — empurra os de cima pra baixo
          await Reservatorios.update(
            { prioridade: Sequelize.literal('prioridade + 1') },
            {
              where: {
                prioridade: {
                  [Op.gte]: novaPrioridade,
                  [Op.lt]: prioridadeAntiga
                }
              },
              transaction: t
            }
          );
        } else {
          // Vai descer — puxa os de baixo pra cima
          await Reservatorios.update(
            { prioridade: Sequelize.literal('prioridade - 1') },
            {
              where: {
                prioridade: {
                  [Op.lte]: novaPrioridade,
                  [Op.gt]: prioridadeAntiga
                }
              },
              transaction: t
            }
          );
        }

        await reservatorio.update({ ...body, prioridade: novaPrioridade }, { transaction: t });
      } else {
        await reservatorio.update(body, { transaction: t });
      }

      await t.commit();

      return {
        id: reservatorio.id,
        id_usuario: reservatorio.id_usuario,
        nome: reservatorio.nome,
        prioridade: reservatorio.prioridade,
        posicoes: reservatorio.posicoes,
        criado_em: reservatorio.criado_em,
        atualizado_em: reservatorio.atualizado_em,
        deletado_em: reservatorio.deletado_em,
      };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }
}
