import { Router } from "express";
import asyncHandler from "../middlewares/async-handler";
import checa_token from "../middlewares/checa-token";
import PagamentosController from "../controllers/pagamentos-controller";

const router = Router();
const controller = new PagamentosController();

router.get("/", checa_token, asyncHandler((req: any, res) => controller.list(req, res)));
router.post("/", checa_token, asyncHandler((req: any, res) => controller.create(req, res)));

router.get("/usuario/:id_usuario", checa_token, asyncHandler((req: any, res) => controller.getByUsuario(req, res)));
router.get("/assinatura/:id_assinatura", checa_token, asyncHandler((req: any, res) => controller.getByAssinatura(req, res)));

router.get("/:id", checa_token, asyncHandler((req: any, res) => controller.get(req, res)));
router.patch("/:id/confirmar", checa_token, asyncHandler((req: any, res) => controller.confirmar(req, res)));
router.patch("/:id/falhar", checa_token, asyncHandler((req: any, res) => controller.falhar(req, res)));
router.patch("/:id/reembolsar", checa_token, asyncHandler((req: any, res) => controller.reembolsar(req, res)));

export default router;
