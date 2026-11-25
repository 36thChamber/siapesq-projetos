import BuscarGrupoEspeciePorIdUseCase from "../use-cases/gruposEspecies/buscar-grupo-especie-por-id";
import ListarEspeciesPeloGrupoUseCase from "../use-cases/gruposEspecies/buscar-especies-por-grupo";
import ListarGruposEspeciesUseCase from "../use-cases/gruposEspecies/buscar-grupos-especies";
import CriarGrupoEspecieUseCase from "../use-cases/gruposEspecies/criar-grupo-especies";

import {
    BuscarGrupoEspeciePorIdParamsRequest,
    CriarGrupoEspecieBodyRequest,
    ListarGruposEspeciesQueryRequest,
} from "../types/grupo-especies-types";


export default class GruposEspeciesService {


    static async buscarPorId(
        params: BuscarGrupoEspeciePorIdParamsRequest
    ) {

        return BuscarGrupoEspeciePorIdUseCase.executa(
            params
        );

    }


    static async listarEspecies(
        params: BuscarGrupoEspeciePorIdParamsRequest
    ) {

        return ListarEspeciesPeloGrupoUseCase.executa(
            params
        );

    }


    static async listar(
        query: ListarGruposEspeciesQueryRequest
    ) {

        return ListarGruposEspeciesUseCase.executa(
            query
        );

    }


    static async criar(
        body: CriarGrupoEspecieBodyRequest
    ) {

        return CriarGrupoEspecieUseCase.executa(
            body
        );

    }


}