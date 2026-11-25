import Joi from 'joi'
import http_status from '../../consts/http-status-enum'
import Alertas from '../../models/Alertas'
import AreasAlertas from '../../models/AreasAlertas'
import Reservatorios from '../../models/Reservatorios'

const req_params_schema = Joi.object({
    id: Joi.number()
        .required()
        .error(() => new Error('id da área de alerta inválido'))
})

export default class DeletarAreas_AlertaUseCase {

    static async valida(params: { id: number }) {
        try {
            await req_params_schema.validateAsync(params)
        }
        catch (err: any) {
            throw {
                message: err.message,
                status: http_status.BAD_REQUEST
            }
        }
    }

    private static async possuiAlertasAssociados(id: number): Promise<boolean> {
        const count = await Alertas.count({
            where: { id_area_alerta: id }
        });
        
        return count > 0;
    }

    private static async validarPropriedadeReservatorio(
        id_reservatorio: number,
        id_usuario: number
    ): Promise<void> {
        const reservatorio = await Reservatorios.findByPk(id_reservatorio);

        if (!reservatorio) {
            throw {
                message: 'Reservatório não encontrado',
                status: http_status.NOT_FOUND,
            };
        }

        if (Number(reservatorio.id_usuario) !== Number(id_usuario)) {
            throw {
                message: 'Acesso negado: você não tem permissão para excluir esta área de alerta',
                status: http_status.FORBIDDEN,
            };
        }
    }

    static async executa(params: { id: number }, id_usuario: number): Promise<void> {
        try {
            const area = await AreasAlertas.findByPk(params.id);
            
            if (!area) {
                throw {
                    message: `Área de alerta ${params.id} não encontrada`,
                    status: http_status.NOT_FOUND
                };
            }

  
            await this.validarPropriedadeReservatorio(area.id_reservatorio, id_usuario);
            
   
            const possuiAlertas = await this.possuiAlertasAssociados(params.id);
            
            if (possuiAlertas) {
                throw {
                    message: 'Não é possível remover a área de alerta pois existem alertas associados. Remova os alertas primeiro.',
                    status: http_status.BAD_REQUEST
                };
            }
            
            await area.destroy();
        }
        catch (err) {
            throw err;
        }
    }
}