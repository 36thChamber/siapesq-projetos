import Joi from 'joi';
import { Op } from 'sequelize';

import http_status from '../../consts/http-status-enum';
import Alertas from '../../models/Alertas';
import Reservatorios from '../../models/Reservatorios';
import Usuarios from '../../models/Usuarios';
import AreasAlertas from '../../models/AreasAlertas';


const update_schema = Joi.object({
    id: Joi.number()
        .required()
        .error(() => new Error('id é obrigatório')),

    id_usuario: Joi.number()
        .optional()
        .allow(null)
        .error(() => new Error('id_usuario deve ser um número válido')),

    id_reservatorio: Joi.number()
        .optional()
        .error(() => new Error('id_reservatorio deve ser um número válido')),

    id_area_alerta: Joi.number()
        .optional()
        .error(() => new Error('id_area_alerta deve ser um número válido')),

    tipo: Joi.string()
        .optional()
        .valid('NDCI', 'TSI', 'ALGAS', 'MACROFITAS')
        .error(() => new Error('tipo deve ser NDCI, TSI, ALGAS ou MACROFITAS')),

    nivel: Joi.string()
        .optional()
        .allow(null)
        .error(() => new Error('nivel deve ser uma string válida')),

    titulo: Joi.string()
        .optional()
        .allow(null, '')
        .error(() => new Error('titulo deve ser uma string válida')),

    descricao: Joi.string()
        .optional()
        .allow(null, '')
        .error(() => new Error('descricao deve ser uma string válida')),

    data_analise: Joi.date()
        .optional()
        .error(() => new Error('data_analise deve ser uma data válida')),

    data_alerta: Joi.date()
        .optional()
        .allow(null)
        .error(() => new Error('data_alerta deve ser uma data válida')),

    percentual_principal: Joi.number()
        .optional()
        .allow(null)
        .error(() => new Error('percentual_principal deve ser um número válido')),

    total_pixels: Joi.number()
        .integer()
        .optional()
        .allow(null)
        .error(() => new Error('total_pixels deve ser um número inteiro válido')),

    detalhes: Joi.object()
        .optional()
        .allow(null)
        .error(() => new Error('detalhes deve ser um objeto válido')),

    status: Joi.string()
        .optional()
        .valid('novo', 'visualizado', 'resolvido', 'ignorado')
        .error(() => new Error('status deve ser novo, visualizado, resolvido ou ignorado')),

    visualizado: Joi.boolean()
        .optional()
        .error(() => new Error('visualizado deve ser booleano')),
});

export default class AtualizarAlertaUseCase {

    static async valida(body: any) {
        try {
            await update_schema.validateAsync(body);
        }
        catch (err: any) {
            throw {
                message: err.message,
                status: http_status.BAD_REQUEST,
            };
        }
    }

    private static async validarReservatorio(id_reservatorio: number): Promise<void> {
        const reservatorio = await Reservatorios.findByPk(id_reservatorio);

        if (!reservatorio) {
            throw {
                message: 'Reservatório não encontrado',
                status: http_status.NOT_FOUND,
            };
        }
    }

    private static async validarAreaReservatorio(
        id_area_alerta: number,
        id_reservatorio: number
    ): Promise<void> {
        const area = await AreasAlertas.findOne({
            where: {
                id: id_area_alerta,
                id_reservatorio,
            },
        });

        if (!area) {
            throw {
                message: 'Área de alerta não encontrada para este reservatório',
                status: http_status.NOT_FOUND,
            };
        }
    }

    private static async validarUsuario(id_usuario?: number | null): Promise<void> {
        if (!id_usuario) return;

        const usuario = await Usuarios.findByPk(id_usuario);

        if (!usuario) {
            throw {
                message: 'Usuário não encontrado',
                status: http_status.NOT_FOUND,
            };
        }
    }

    private static async validarDuplicidade(
        id: number,
        id_reservatorio: number,
        id_area_alerta: number,
        tipo: string,
        data_analise: Date
    ): Promise<void> {
        const alertaExistente = await Alertas.findOne({
            where: {
                id_reservatorio,
                id_area_alerta,
                tipo,
                data_analise,
                id: {
                    [Op.ne]: id,
                },
            },
        });

        if (alertaExistente) {
            throw {
                message: 'Já existe outro alerta para este reservatório, área, tipo e data de análise',
                status: http_status.BAD_REQUEST,
            };
        }
    }

    static async executa(id: number, body: any) {
        const alerta = await Alertas.findByPk(id);

        if (!alerta) {
            throw {
                message: `Alerta ${id} não encontrado`,
                status: http_status.NOT_FOUND,
            };
        }

        const dadosAtualizacao = { ...body };

        if (dadosAtualizacao.id_usuario !== undefined) {
            await this.validarUsuario(dadosAtualizacao.id_usuario);
        }

        const idReservatorioFinal =
            dadosAtualizacao.id_reservatorio ?? alerta.id_reservatorio;

        const idAreaAlertaFinal =
            dadosAtualizacao.id_area_alerta ?? alerta.id_area_alerta;

        const tipoFinal =
            dadosAtualizacao.tipo ?? alerta.tipo;

        const dataAnaliseFinal =
            dadosAtualizacao.data_analise ?? alerta.data_analise;

        if (dadosAtualizacao.id_reservatorio !== undefined) {
            await this.validarReservatorio(idReservatorioFinal);
        }

        if (
            dadosAtualizacao.id_area_alerta !== undefined ||
            dadosAtualizacao.id_reservatorio !== undefined
        ) {
            await this.validarAreaReservatorio(
                idAreaAlertaFinal,
                idReservatorioFinal
            );
        }

        if (
            dadosAtualizacao.id_reservatorio !== undefined ||
            dadosAtualizacao.id_area_alerta !== undefined ||
            dadosAtualizacao.tipo !== undefined ||
            dadosAtualizacao.data_analise !== undefined
        ) {
            await this.validarDuplicidade(
                id,
                idReservatorioFinal,
                idAreaAlertaFinal,
                tipoFinal,
                dataAnaliseFinal
            );
        }

        await alerta.update(dadosAtualizacao);

        return {
            id: alerta.id,

            id_usuario: alerta.id_usuario,
            id_reservatorio: alerta.id_reservatorio,
            id_area_alerta: alerta.id_area_alerta,

            tipo: alerta.tipo,
            nivel: alerta.nivel,

            titulo: alerta.titulo,
            descricao: alerta.descricao,

            data_analise: alerta.data_analise,
            data_alerta: alerta.data_alerta,

            percentual_principal: alerta.percentual_principal
                ? Number(alerta.percentual_principal)
                : null,

            total_pixels: alerta.total_pixels,

            detalhes: alerta.detalhes,

            status: alerta.status,
            visualizado: alerta.visualizado,

            criado_em: alerta.criado_em,
            atualizado_em: alerta.atualizado_em,
            deletado_em: alerta.deletado_em,
        };
    }
}