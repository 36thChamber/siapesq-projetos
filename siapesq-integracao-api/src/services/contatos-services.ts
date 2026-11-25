import CriarContatoUseCase from '../use-cases/contato/criar-contato';

export default class ContatosService {
    static async create(body: any) {
        try {
            await CriarContatoUseCase.valida(body);
            return await CriarContatoUseCase.executa(body);
        } catch (err) {
            throw (err);
        }
    }
}