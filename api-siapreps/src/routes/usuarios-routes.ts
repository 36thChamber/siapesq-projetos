import { Router } from "express";
import UsuariosHttpService from "../services/http/usuarios-http-service";
import checaToken from "../middlewares/checa-token";
import checa_admin from "../middlewares/checa-admin";

const router = Router();
const httpService = new UsuariosHttpService();

router.post("/login", (req, res, next) => httpService.login(req, res, next));
router.post("/esqueceu-senha", (req, res, next) => httpService.solicitarRecuperacaoSenha(req, res, next));
router.post("/redefinir-senha", (req, res, next) => httpService.redefinirSenha(req, res, next));
router.post("/", (req, res, next) => httpService.create(req, res, next));
router.get("/refresh-token", checaToken, (req: any, res, next) => httpService.novoToken(req, res, next));
router.get("/:id", checaToken, (req: any, res, next) => httpService.getId(req, res, next));
router.get("/", checaToken, checa_admin, (req: any, res, next) => httpService.get(req, res, next));
router.put("/", checaToken, (req: any, res, next) => httpService.update(req, res, next));
router.put("/:id/ativo", checaToken, checa_admin, (req: any, res, next) => httpService.atualizarStatus(req, res, next));
router.delete("/:id", checaToken, (req: any, res, next) => httpService.delete(req, res, next));

export default router;
