import Joi from "joi";
import { Op, Sequelize } from "sequelize";

import http_status from "../../consts/http-status-enum";
import Reservatorios from "../../models/Reservatorios";
import Usuarios from "../../models/Usuarios";
import {
  AtualizarReservatorioBodyRequest,
  AtualizarReservatorioResponse,
  toReservatorioResponse,
} from "../../types/reservatorios-types";

const update_reservatorio_schema = Joi.object({
  nome: Joi.string()
    .optional()
    .error(() => new Error("Nome invalido")),

  id_usuario: Joi.number()
    .optional()
    .error(() => new Error("Id de usuario invalido")),

  prioridade: Joi.number()
    .integer()
    .optional()
    .allow(null)
    .error(() => new Error("Prioridade invalida")),

  favorito: Joi.boolean()
    .optional()
    .error(() => new Error("Favorito invalido")),

  posicoes: Joi.array()
    .items(
      Joi.object({
        latitude: Joi.string()
          .required()
          .error(() => new Error("Latitude invalida")),

        longitude: Joi.string()
          .required()
          .error(() => new Error("Longitude invalida")),
      }).required()
    )
    .optional()
    .allow(null),
}).min(1);

export default class UpdateReservatorioUseCase {
  static async valida(body: AtualizarReservatorioBodyRequest) {
    try {
      await update_reservatorio_schema.validateAsync(body);
    } catch (err: any) {
      throw {
        message: err.message,
        status: http_status.BAD_REQUEST,
      };
    }
  }

  static async executa(
    body: AtualizarReservatorioBodyRequest,
    id_reservatorio: number
  ): Promise<AtualizarReservatorioResponse> {
    const sequelize = Reservatorios.sequelize;

    if (!sequelize) {
      throw {
        message: "Sequelize nao inicializado",
        status: http_status.INTERNAL_ERROR,
      };
    }

    const transaction = await sequelize.transaction();

    try {
      const reservatorio = await Reservatorios.findByPk(id_reservatorio, {
        transaction,
      });

      if (!reservatorio) {
        throw {
          message: `Reservatorio (${id_reservatorio}) nao encontrado`,
          status: http_status.NOT_FOUND,
        };
      }

      const idUsuarioAntigo = reservatorio.id_usuario;
      const idUsuarioDestino = body.id_usuario ?? idUsuarioAntigo;
      const mudouUsuario = idUsuarioDestino !== idUsuarioAntigo;

      if (body.id_usuario) {
        const usuario = await Usuarios.findByPk(body.id_usuario, {
          transaction,
        });

        if (!usuario) {
          throw {
            message: `Usuario (${body.id_usuario}) nao encontrado`,
            status: http_status.NOT_FOUND,
          };
        }
      }

      if (body.nome || mudouUsuario) {
        const nome = body.nome ?? reservatorio.nome;

        const nome_existente = await Reservatorios.findOne({
          where: {
            id_usuario: idUsuarioDestino,
            nome,
            id: {
              [Op.ne]: id_reservatorio,
            },
          },
          transaction,
        });

        if (nome_existente) {
          throw {
            message: `Reservatorio ${nome} ja foi cadastrado para este usuario`,
            status: http_status.CONFLICT,
          };
        }
      }

      const updatePayload: AtualizarReservatorioBodyRequest = { ...body };

      const prioridadeAtual = reservatorio.prioridade ?? 0;

      if (mudouUsuario) {
        if (prioridadeAtual > 0) {
          await Reservatorios.update(
            {
              prioridade: Sequelize.literal("prioridade - 1"),
            },
            {
              where: {
                id_usuario: idUsuarioAntigo,
                prioridade: {
                  [Op.gt]: prioridadeAtual,
                },
              },
              transaction,
            }
          );
        }

        const maxPrioridadeDestino = (await Reservatorios.max("prioridade", {
          where: {
            id_usuario: idUsuarioDestino,
          },
          transaction,
        })) as number | null;

        const prioridadeDestino =
          body.prioridade ?? (maxPrioridadeDestino ?? 0) + 1;

        if (
          prioridadeDestino < 1 ||
          prioridadeDestino > (maxPrioridadeDestino ?? 0) + 1
        ) {
          throw {
            message: "Prioridade fora do intervalo valido",
            status: http_status.BAD_REQUEST,
          };
        }

        if (prioridadeDestino <= (maxPrioridadeDestino ?? 0)) {
          await Reservatorios.update(
            {
              prioridade: Sequelize.literal("prioridade + 1"),
            },
            {
              where: {
                id_usuario: idUsuarioDestino,
                prioridade: {
                  [Op.gte]: prioridadeDestino,
                },
              },
              transaction,
            }
          );
        }

        updatePayload.prioridade = prioridadeDestino;
      } else if (
        body.prioridade !== undefined &&
        body.prioridade !== null &&
        body.prioridade !== prioridadeAtual
      ) {
        const total = await Reservatorios.count({
          where: {
            id_usuario: idUsuarioAntigo,
          },
          transaction,
        });

        if (body.prioridade < 1 || body.prioridade > total) {
          throw {
            message: "Prioridade fora do intervalo valido",
            status: http_status.BAD_REQUEST,
          };
        }

        if (body.prioridade < prioridadeAtual) {
          await Reservatorios.update(
            {
              prioridade: Sequelize.literal("prioridade + 1"),
            },
            {
              where: {
                id_usuario: idUsuarioAntigo,
                id: {
                  [Op.ne]: id_reservatorio,
                },
                prioridade: {
                  [Op.gte]: body.prioridade,
                  [Op.lt]: prioridadeAtual,
                },
              },
              transaction,
            }
          );
        } else {
          await Reservatorios.update(
            {
              prioridade: Sequelize.literal("prioridade - 1"),
            },
            {
              where: {
                id_usuario: idUsuarioAntigo,
                id: {
                  [Op.ne]: id_reservatorio,
                },
                prioridade: {
                  [Op.lte]: body.prioridade,
                  [Op.gt]: prioridadeAtual,
                },
              },
              transaction,
            }
          );
        }
      }

      await reservatorio.update(updatePayload, {
        transaction,
      });

      await transaction.commit();

      return toReservatorioResponse(reservatorio);
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
}
