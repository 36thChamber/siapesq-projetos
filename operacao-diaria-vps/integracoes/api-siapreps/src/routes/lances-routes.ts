import { Router } from 'express';
import LancesHttpService from '../services/http/lances-http-service';
import checa_token from '../middlewares/checa-token';
import checaIdempotencia from '../middlewares/idempotencia';
import OcorrenciasLanceHttpService from '../services/http/ocorrencias-lance-http-service';
import {
  checaPropriedade,
  resolveDonoLance,
  resolveDonoMissao,
} from '../middlewares/checa-propriedade';

const lancesRouter = Router();
const httpService = new LancesHttpService();
const ocorrenciasHttpService = new OcorrenciasLanceHttpService();
const checaToken = checa_token as any;
const donoLance = checaPropriedade(resolveDonoLance) as any;
const donoMissao = checaPropriedade(resolveDonoMissao) as any;
const donoLancePorLanceId = checaPropriedade(
  resolveDonoLance,
  'lanceId',
) as any;

lancesRouter.get('/', checaToken, (req: any, res, next) => httpService.list(req, res, next));
lancesRouter.get('/:id', checaToken, donoLance, (req: any, res, next) => httpService.get(req, res, next));
lancesRouter.get('/missoes/:id/lances', checaToken, donoMissao, (req: any, res, next) => httpService.listByMissao(req, res, next));
lancesRouter.post('/', checaToken, checaIdempotencia('criar-lance'), (req: any, res, next) => httpService.create(req, res, next));
lancesRouter.put('/:id', checaToken, donoLance, (req: any, res, next) => httpService.update(req, res, next));
lancesRouter.delete('/:id', checaToken, donoLance, (req: any, res, next) => httpService.delete(req, res, next));
lancesRouter.post('/:id/recolher', checaToken, donoLance, checaIdempotencia('recolher-lance'), (req: any, res, next) => httpService.recolher(req, res, next));
lancesRouter.get('/:lanceId/ocorrencias', checaToken, donoLancePorLanceId, (req: any, res, next) => ocorrenciasHttpService.listByLance(req, res, next));
lancesRouter.post('/:lanceId/ocorrencias', checaToken, donoLancePorLanceId, checaIdempotencia('criar-ocorrencia-lance'), (req: any, res, next) => ocorrenciasHttpService.createForLance(req, res, next));

export default lancesRouter;
