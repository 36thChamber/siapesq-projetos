import { Router } from "express";
import asyncHandler from "../middlewares/async-handler";
import checa_token from "../middlewares/checa-token";
import AssinaturasController from "../controllers/assinaturas-controller";

const router = Router();
const controller = new AssinaturasController();

router.get("/", checa_token, asyncHandler((req: any, res) => controller.list(req, res)));
router.post("/", checa_token, asyncHandler((req: any, res) => controller.create(req, res)));

router.get("/ativas", checa_token, asyncHandler((req: any, res) => controller.listAtivas(req, res)));
router.get("/usuario/:id_usuario", checa_token, asyncHandler((req: any, res) => controller.getByUsuario(req, res)));

router.get("/:id", checa_token, asyncHandler((req: any, res) => controller.get(req, res)));
router.put("/:id", checa_token, asyncHandler((req: any, res) => controller.update(req, res)));

router.patch("/:id/ativar", checa_token, asyncHandler((req: any, res) => controller.ativar(req, res)));
router.patch("/:id/cancelar", checa_token, asyncHandler((req: any, res) => controller.cancelar(req, res)));
router.patch("/:id/expirar", checa_token, asyncHandler((req: any, res) => controller.expirar(req, res)));

export default router;
