import { Router } from "express";
import OcorrenciasLanceHttpService from "../services/http/ocorrencias-lance-http-service";
import checa_token from "../middlewares/checa-token";
import {
  checaPropriedade,
  resolveDonoLance,
  resolveDonoOcorrenciaLance,
} from "../middlewares/checa-propriedade";

const router = Router();
const httpService = new OcorrenciasLanceHttpService();
const checaToken = checa_token as any;
const donoLance = checaPropriedade(resolveDonoLance) as any;
const donoOcorrencia = checaPropriedade(resolveDonoOcorrenciaLance) as any;

// Operações diretas por ID da ocorrência
router.get("/:id", checaToken, donoOcorrencia, (req: any, res, next) => httpService.getById(req, res, next));
router.patch("/:id", checaToken, donoOcorrencia, (req: any, res, next) => httpService.update(req, res, next));
router.delete("/:id", checaToken, donoOcorrencia, (req: any, res, next) => httpService.delete(req, res, next));

export default router;