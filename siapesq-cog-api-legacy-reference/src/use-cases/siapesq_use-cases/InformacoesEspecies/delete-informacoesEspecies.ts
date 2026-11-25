import http_status from '../../../consts/http-status-enum';
import Joi from 'joi';
import informacoesEspecies from '../../../models/siapesq/InformacoesEspecies';
import { DeleteInformacaoEspecie } from '../../../types/siapesq_types/InformaçoesEspecies-type';
const schema = Joi.object({
    id_informacaoespecies: Joi.number().required().error(() => new Error('ID do reservatório inválido')),
});

export default class DeletarInformacaoEspecieUseCase {
    static async valida(params: DeleteInformacaoEspecie) {

        try {
            await schema.validateAsync(params);
        } catch (err: any) {
            throw { message: err.message, status: http_status.BAD_REQUEST };
        }
    }

    static async executa(params: DeleteInformacaoEspecie) {
        try {
            const informacao = await informacoesEspecies.findByPk(params.id_informacaoespecies);
            if (!informacao) {
                throw { message: 'Informação não encontrado.', status: http_status.NOT_FOUND };
            }
            await informacao.destroy();
            return { message: 'Informação deletado com sucesso' }
        } catch (err: any) {
            throw { message: err.message, status: http_status.INTERNAL_ERROR };
        }
    }
}
