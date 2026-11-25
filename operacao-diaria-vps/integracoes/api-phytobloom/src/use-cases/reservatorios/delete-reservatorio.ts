import Joi from "joi";
import { Op, Sequelize } from "sequelize";
import http_status from "../../consts/http-status-enum";
import Reservatorios from "../../models/Reservatorios";
import { DeleteReservatorioParamsRequest, DeleteReservatorioResponse } from "../../types/reservatorios-types";

const req_params_schema = Joi.object({
  id: Joi.number()
    .required()
    .error(() => new Error("ID do reservatorio invalido")),
});

export default class DeletarReservatorioUseCase {
  static async valida(params: DeleteReservatorioParamsRequest) {
    try {
      await req_params_schema.validateAsync(params);
    } catch (err: any) {
      throw { message: err.message, status: http_status.BAD_REQUEST };
    }
  }

  static async executa(
    params: DeleteReservatorioParamsRequest,
  ): Promise<DeleteReservatorioResponse> {
    const sequelize = Reservatorios.sequelize;
    if (!sequelize) {
      throw {
        message: "Sequelize nao inicializado",
        status: http_status.INTERNAL_ERROR,
      };
    }

    const transaction = await sequelize.transaction();

    try {
      const reservatorio = await Reservatorios.findByPk(params.id, {
        transaction,
      });

      if (!reservatorio) {
        throw {
          message: "Reservatorio nao encontrado.",
          status: http_status.NOT_FOUND,
        };
      }

      const idUsuario = reservatorio.id_usuario;
      const prioridadeRemovida = reservatorio.prioridade;

      await reservatorio.destroy({ transaction });

      await Reservatorios.update(
        { prioridade: Sequelize.literal("prioridade - 1") },
        {
          where: {
            id_usuario: idUsuario,
            prioridade: { [Op.gt]: prioridadeRemovida },
          },
          transaction,
        },
      );

      await transaction.commit();
      return { message: "Reservatorio deletado com sucesso" };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
}
