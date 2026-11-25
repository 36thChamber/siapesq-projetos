import { Router } from 'express';
import MissoesHttpService from '../services/http/missoes-http-service';
import IncidentesHttpService from '../services/http/incidentes-http-service';
import checa_token from '../middlewares/checa-token';
import checaIdempotencia from '../middlewares/idempotencia';
import {
  checaPropriedade,
  resolveDonoMissao,
} from '../middlewares/checa-propriedade';

const router = Router();
const httpService = new MissoesHttpService();
const incidentesHttpService = new IncidentesHttpService();
const checaToken = checa_token as any;
const donoMissao = checaPropriedade(resolveDonoMissao) as any;
const donoMissaoPorMissaoId = checaPropriedade(
  resolveDonoMissao,
  'missaoId',
) as any;

// Rotas com parâmetros específicos primeiro (para evitar conflito com :id)
router.patch('/:id/iniciar', checaToken, donoMissao, checaIdempotencia('iniciar-missao'), (req: any, res, next) => httpService.iniciar(req, res, next));
router.patch('/:id/finalizar', checaToken, donoMissao, checaIdempotencia('finalizar-missao'), (req: any, res, next) => httpService.finalizar(req, res, next));
router.get('/:missaoId/incidentes', checaToken, donoMissaoPorMissaoId, (req: any, res, next) => incidentesHttpService.listarPorMissao(req, res, next));
router.post('/:missaoId/incidentes', checaToken, donoMissaoPorMissaoId, checaIdempotencia('criar-incidente'), (req: any, res, next) => incidentesHttpService.criar(req, res, next));
router.post('/:missaoId/lances', checaToken, donoMissaoPorMissaoId, checaIdempotencia('criar-lance'), (req: any, res, next) => httpService.criarLance(req, res, next));

// Rotas genéricas (com :id)
router.get('/', checaToken, (req: any, res, next) => httpService.list(req, res, next));
router.post('/', checaToken, checaIdempotencia('criar-missao'), (req: any, res, next) => httpService.create(req, res, next));
router.get('/:id', checaToken, donoMissao, (req: any, res, next) => httpService.get(req, res, next));
router.put('/:id', checaToken, donoMissao, (req: any, res, next) => httpService.update(req, res, next));
router.delete('/:id', checaToken, donoMissao, (req: any, res, next) => httpService.delete(req, res, next));

export default router;
