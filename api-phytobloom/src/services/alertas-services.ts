import { ListarAlertasQueryRequest } from '../types/alertas-types';

import ListaAlertaUseCase from '../use-cases/Alertas/get-alerta-by-id';
import GetAlertaUseCase from '../use-cases/Alertas/get-alertas';
import CriarAlertaUseCase from '../use-cases/Alertas/post-alerta';
import AtualizarAlertaUseCase from '../use-cases/Alertas/put-alerta';
import DeletarAlertaUseCase from '../use-cases/Alertas/delete-alerta';

export default class AlertasService {

    static async get(id: number, id_usuario?: number) {
        await GetAlertaUseCase.valida({ id });
        return GetAlertaUseCase.executa({ id }, id_usuario);
    }

    static async list(query: ListarAlertasQueryRequest) {
        await ListaAlertaUseCase.valida(query);
        return ListaAlertaUseCase.executa(query);
    }

    static async create(body: any) {
        await CriarAlertaUseCase.valida(body);
        return CriarAlertaUseCase.executa(body);
    }

    static async createBulk(body: any) {
        const alertas = await CriarAlertaUseCase.validaBuik(body);
        return CriarAlertaUseCase.executaBulk({ alertas });
    }

    static async update(id: number, body: any) {
        await AtualizarAlertaUseCase.valida({ id, ...body });
        return AtualizarAlertaUseCase.executa(id, body);
    }

    static async delete(id: number) {
        await DeletarAlertaUseCase.valida({ id });
        return DeletarAlertaUseCase.executa({ id });
    }
}
