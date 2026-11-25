import Joi from 'joi';
import { Op } from 'sequelize';

import http_status from '../../consts/http-status-enum';
import AreasAlertas from '../../models/AreasAlertas';
import Reservatorios from '../../models/Reservatorios';
import {
    AtualizarAreaAlertaBodyRequest,
    AtualizarAreaAlertaResponse,
    PosicaoData,
    toAreasAlertasResponse,
} from '../../types/areas_alertas-types';

const body_schema = Joi.object({
    id: Joi.number()
        .required()
        .error(() => new Error('id inválido')),

    id_reservatorio: Joi.number()
        .optional()
        .error(() => new Error('id_reservatorio inválido')),

    nome: Joi.string()
        .optional()
        .error(() => new Error('nome deve ser uma string')),

    descricao: Joi.string()
        .optional()
        .allow(null, '')
        .error(() => new Error('descricao deve ser uma string')),

    tipo: Joi.string()
        .optional()
        .valid('geral', 'automatica', 'customizada')
        .allow(null)
        .error(() => new Error('tipo deve ser geral, automatica ou customizada')),

    regiao_alerta: Joi.array()
        .items(
            Joi.object({
                latitude: Joi.string().required(),
                longitude: Joi.string().required(),
            })
        )
        .min(1)
        .optional()
        .error(() => new Error('regiao_alerta deve ser um array não vazio de coordenadas')),

    prioridade: Joi.number()
        .integer()
        .optional()
        .allow(null),

    ativa: Joi.boolean()
        .optional(),

    criada_automaticamente: Joi.boolean()
        .optional(),
});

type AtualizarAreaAlertaRequest = AtualizarAreaAlertaBodyRequest & {
    id: number;
};

export default class AtualizarAreasAlertaUseCase {

    static async valida(body: AtualizarAreaAlertaRequest) {
        try {
            await body_schema.validateAsync(body);
        }
        catch (err: any) {
            throw {
                message: err.message,
                status: http_status.BAD_REQUEST,
            };
        }
    }

    private static async validarDuplicidadeNome(
        id: number,
        id_reservatorio: number,
        nome: string
    ): Promise<void> {
        const areaExistente = await AreasAlertas.findOne({
            where: {
                id_reservatorio,
                nome,
                id: {
                    [Op.ne]: id,
                },
            },
        });

        if (areaExistente) {
            throw {
                message: 'Já existe outra área de alerta com este nome para o reservatório informado',
                status: http_status.BAD_REQUEST,
            };
        }
    }

    private static validarRegiaoAlerta(
        regiao_alerta: PosicaoData[] | Record<string, unknown>
    ): void {
        if (!Array.isArray(regiao_alerta)) return;

        if (regiao_alerta.length === 0) {
            throw {
                message: 'Região de alerta deve ser um array não vazio de coordenadas',
                status: http_status.BAD_REQUEST,
            };
        }

        for (const coordenada of regiao_alerta) {
            if (!coordenada.latitude || !coordenada.longitude) {
                throw {
                    message: 'Cada coordenada deve ter latitude e longitude',
                    status: http_status.BAD_REQUEST,
                };
            }

            const lat = parseFloat(coordenada.latitude);
            const lng = parseFloat(coordenada.longitude);

            if (isNaN(lat) || lat < -90 || lat > 90) {
                throw {
                    message: `Latitude inválida: ${coordenada.latitude}. Deve estar entre -90 e 90`,
                    status: http_status.BAD_REQUEST,
                };
            }

            if (isNaN(lng) || lng < -180 || lng > 180) {
                throw {
                    message: `Longitude inválida: ${coordenada.longitude}. Deve estar entre -180 e 180`,
                    status: http_status.BAD_REQUEST,
                };
            }
        }
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
                message: 'Acesso negado: você não tem permissão para alterar esta área de alerta',
                status: http_status.FORBIDDEN,
            };
        }
    }

    static async executa(
        body: AtualizarAreaAlertaRequest,
        id_usuario: number
    ): Promise<AtualizarAreaAlertaResponse> {
        const { id, ...dadosAtualizacao } = body;

        const area = await AreasAlertas.findByPk(id);

        if (!area) {
            throw {
                message: `Área de alerta ${id} não encontrada`,
                status: http_status.NOT_FOUND,
            };
        }

      
        await this.validarPropriedadeReservatorio(area.id_reservatorio, id_usuario);

        
        if (
            dadosAtualizacao.id_reservatorio &&
            dadosAtualizacao.id_reservatorio !== area.id_reservatorio
        ) {
            await this.validarPropriedadeReservatorio(
                dadosAtualizacao.id_reservatorio,
                id_usuario
            );
        }

        const idReservatorioFinal =
            dadosAtualizacao.id_reservatorio ?? area.id_reservatorio;

        if (dadosAtualizacao.nome) {
            await this.validarDuplicidadeNome(
                id,
                idReservatorioFinal,
                dadosAtualizacao.nome
            );
        }

        if (dadosAtualizacao.regiao_alerta) {
            this.validarRegiaoAlerta(dadosAtualizacao.regiao_alerta);
        }

        await area.update(dadosAtualizacao);

        return toAreasAlertasResponse(area);
    }
}