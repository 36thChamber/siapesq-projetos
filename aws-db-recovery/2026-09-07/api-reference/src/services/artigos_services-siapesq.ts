import criar_artigo_use_case from '../use-cases/siapesq_use-cases/Artigos/post-Artigo';
import get_artigo_use_case from '../use-cases/siapesq_use-cases/Artigos/get_id-Artigo';
import update_artigo_use_case from '../use-cases/siapesq_use-cases/Artigos/update-Artigo';
import { CriarArtigoBody, UpdateArtigoBody } from '../types/siapesq_types/Artigos-types';

export default class ArtigosService {
    
    static async create(body: CriarArtigoBody) {
        try {
            await criar_artigo_use_case.valida(body);
            return await criar_artigo_use_case.executa(body);
        }
        catch (err) {
            throw (err);
        }
    }

    static async get(id_artigo: string | number) {
        try {
            return await get_artigo_use_case.executa(id_artigo);
        }
        catch (err) {
            throw (err);
        }
    }

    static async update(body: UpdateArtigoBody, id_artigo: number) {
        try {
            await update_artigo_use_case.valida(body);
            return await update_artigo_use_case.executa(body, id_artigo);
        }
        catch (err) {
            throw (err);
        }
    }
}