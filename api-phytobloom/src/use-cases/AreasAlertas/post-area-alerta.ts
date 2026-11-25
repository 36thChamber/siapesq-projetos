import Joi from 'joi';

import http_status from '../../consts/http-status-enum';
import AreasAlertas from '../../models/AreasAlertas';
import Reservatorios from '../../models/Reservatorios';
import {
    CriarAreaAlertaBodyRequest,
    CriarAreaAlertaResponse,
    PosicaoData,
    toAreasAlertasResponse,
} from '../../types/areas_alertas-types';

const create_body_schema = Joi.object({
    id_reservatorio: Joi.number()
        .required()
        .error(() => new Error('id_reservatorio é obrigatório e deve ser um número')),

    nome: Joi.string()
        .required()
        .error(() => new Error('nome é obrigatório')),

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
        .required()
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

export default class CriarAreasAlertaUseCase {

    static async valida(body: CriarAreaAlertaBodyRequest) {
        try {
            await create_body_schema.validateAsync(body);
        }
        catch (err: any) {
            throw {
                message: err.message,
                status: http_status.BAD_REQUEST,
            };
        }
    }

    private static async validarReservatorio(
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
                message: 'Acesso negado: o reservatório informado não pertence ao usuário autenticado',
                status: http_status.FORBIDDEN,
            };
        }
    }

    private static async validarDuplicidadeNome(
        id_reservatorio: number,
        nome: string
    ): Promise<void> {
        const areaExistente = await AreasAlertas.findOne({
            where: {
                id_reservatorio,
                nome,
            },
        });

        if (areaExistente) {
            throw {
                message: 'Já existe uma área de alerta com este nome para o reservatório informado',
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

    static async executa(
        body: CriarAreaAlertaBodyRequest,
        id_usuario: number
    ): Promise<CriarAreaAlertaResponse> {
        const {
            id_reservatorio,
            nome,
            descricao = null,
            tipo = null,
            regiao_alerta,
            prioridade = null,
            ativa = true,
            criada_automaticamente = false,
        } = body;

        await this.validarReservatorio(id_reservatorio, id_usuario);
        await this.validarDuplicidadeNome(id_reservatorio, nome);
        this.validarRegiaoAlerta(regiao_alerta);

        const area = await AreasAlertas.create({
            id_reservatorio,
            nome,
            descricao,
            tipo,
            regiao_alerta,
            prioridade,
            ativa,
            criada_automaticamente,
        });

        return toAreasAlertasResponse(area);
    }
}