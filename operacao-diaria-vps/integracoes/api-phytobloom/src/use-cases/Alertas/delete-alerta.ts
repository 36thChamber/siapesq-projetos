import Joi from 'joi'
import http_status from '../../consts/http-status-enum'
import Alertas from '../../models/Alertas'

const req_params_schema = Joi.object({
    id: Joi.number()
        .required()
        .error(() => new Error('id do alerta inválido'))
})

export default class DeletarAlertaUseCase {

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

    static async executa(params: { id: number }): Promise<void> {
        try {
            const alerta = await Alertas.findByPk(params.id);
            
            if (!alerta) {
                throw {
                    message: `Alerta ${params.id} não encontrado`,
                    status: http_status.NOT_FOUND
                };
            }
            
            await alerta.destroy();
        }
        catch (err) {
            throw err;
        }
    }
}