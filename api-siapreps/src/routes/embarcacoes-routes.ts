import { Router } from "express";
import EmbarcacoesHttpService from "../services/http/embarcacoes-http-service";
import checa_token from "../middlewares/checa-token";
import checaIdempotencia from "../middlewares/idempotencia";
import { checaPropriedade, resolveDonoEmbarcacao } from "../middlewares/checa-propriedade";

const router = Router();
const httpService = new EmbarcacoesHttpService();
const checaToken = checa_token as any;
const donoEmbarcacao = checaPropriedade(resolveDonoEmbarcacao) as any;
const donoEmbarcacaoPorEmbarcacaoId = checaPropriedade(
  resolveDonoEmbarcacao,
  'embarcacaoId',
) as any;

router.get("/", checaToken, (req: any, res, next) => httpService.list(req, res, next));
// /me deve vir antes de /:id para Express não tratar "me" como um id numérico
router.get("/me", checaToken, (req: any, res, next) => httpService.listByMestre(req, res, next));
router.get("/:id", checaToken, donoEmbarcacao, (req: any, res, next) => httpService.get(req, res, next));
router.post("/", checaToken, (req: any, res, next) => httpService.create(req, res, next));
router.put("/:id", checaToken, donoEmbarcacao, (req: any, res, next) => httpService.update(req, res, next));
router.delete("/:id", checaToken, donoEmbarcacao, (req: any, res, next) => httpService.delete(req, res, next));
router.post('/:embarcacaoId/missoes', checaToken, donoEmbarcacaoPorEmbarcacaoId, checaIdempotencia('criar-missao'), (req: any, res, next) => httpService.criarMissao(req, res, next));

export default router;

