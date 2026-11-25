import http_status from '../../../consts/http-status-enum';
import { DeleteReservatorio } from '../../../types/phytobloom-types/reservatorios-types';
import Joi from 'joi';
import Reservatorios from '../../../models/phytoBloom/Reservatorios';

export default class DeletarReservatorioUseCase {
    static async valida(params: DeleteReservatorio) {
        const schema = Joi.object({
            id: Joi.number().required().error(() => new Error('ID do reservatório inválido')),
        });

        try {
            await schema.validateAsync(params);
        } catch (err: any) {
            throw { message: err.message, status: http_status.BAD_REQUEST };
        }
    }

   static async executa(params: DeleteReservatorio) {
    try {
        const reservatorio = await Reservatorios.findByPk(params.id);

        if (!reservatorio) {
            throw { message: 'Reservatório não encontrado.', status: http_status.NOT_FOUND };
        }

         const idUsuario = reservatorio.id_usuario;
        const prioridadeRemovida = reservatorio.prioridade;

        // Deleta o reservatório
        await reservatorio.destroy();

        // uma query para alterar a prioridade dos reservatorios depois do que foi deletado
        // usado uma query porque ela não vai ser reutilizada, vai ser usada momente aqui
        await Reservatorios.sequelize?.query(`
            UPDATE phytobloom."Reservatorios"
            SET prioridade = prioridade - 1
            WHERE "id_usuario" = :idUsuario
              AND prioridade > :prioridadeRemovida
        `, {
            replacements: {
                idUsuario,
                prioridadeRemovida
            }
        });

        return { message: 'Reservatório deletado com sucesso' };

    } catch (err: any) {
        throw { message: err.message, status: http_status.INTERNAL_ERROR };
    }
}

}
