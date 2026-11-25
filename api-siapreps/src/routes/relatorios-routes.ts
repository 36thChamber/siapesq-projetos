import { Router } from "express";
import RelatoriosHttpService from "../services/http/relatorios-http-service";
import checa_token from "../middlewares/checa-token";
import {
  checaPropriedade,
  resolveDonoEmbarcacao,
  resolveDonoMissao,
  resolveDonoRelatorio,
} from "../middlewares/checa-propriedade";

const router = Router();
const httpService = new RelatoriosHttpService();
const checaToken = checa_token as any;
const donoRelatorio = checaPropriedade(resolveDonoRelatorio) as any;
const donoEmbarcacao = checaPropriedade(resolveDonoEmbarcacao) as any;
const donoMissao = checaPropriedade(resolveDonoMissao) as any;

router.get("/", checaToken, (req, res, next) => httpService.list(req, res, next));
router.get("/usuario/:id", checaToken, (req, res, next) => httpService.listByUsuario(req, res, next));
router.get("/embarcacao/:id", checaToken, donoEmbarcacao, (req, res, next) => httpService.listByEmbarcacao(req, res, next));
router.get("/missao/:id", checaToken, donoMissao, (req, res, next) => httpService.listByMissao(req, res, next));
router.get("/:id", checaToken, donoRelatorio, (req, res, next) => httpService.get(req, res, next));
router.post("/", checaToken, (req, res, next) => httpService.create(req, res, next));
router.put("/:id", checaToken, donoRelatorio, (req, res, next) => httpService.update(req, res, next));
router.delete("/:id", checaToken, donoRelatorio, (req, res, next) => httpService.delete(req, res, next));

export default router;
