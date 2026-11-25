import { Router } from "express";
import PlanosController from "../controllers/planos-controller";
import asyncHandler from "../middlewares/async-handler";
import checa_admin from "../middlewares/checa-admin";
import checa_token from "../middlewares/checa-token";

const router = Router();
const controller = new PlanosController();

// Listagem geral
router.get("/", asyncHandler((req: any, res) => controller.list(req, res)));

// Criar plano
router.post("/", checa_token, checa_admin, asyncHandler((req: any, res) => controller.create(req, res)));

// Buscar apenas planos ativos
router.get("/ativos", asyncHandler((req: any, res) => controller.listAtivos(req, res)));

// Buscar apenas planos inativos
router.get("/inativos", checa_token, asyncHandler((req: any, res) => controller.listInativos(req, res)));

// Buscar um plano por ID
router.get("/:id", asyncHandler((req: any, res) => controller.get(req, res)));

// Atualizar um plano
router.put("/:id", checa_token, checa_admin, asyncHandler((req: any, res) => controller.update(req, res)));

// Ativar plano
router.patch("/:id/ativar", checa_token, checa_admin, asyncHandler((req: any, res) => controller.ativar(req, res)));

// Desativar plano
router.patch("/:id/desativar", checa_token, checa_admin, asyncHandler((req: any, res) => controller.desativar(req, res)));

// Soft delete
router.delete("/:id", checa_token, checa_admin, asyncHandler((req: any, res) => controller.delete(req, res)));

// Restaurar plano deletado
router.patch("/:id/restaurar", checa_token, checa_admin, asyncHandler((req: any, res) => controller.restaurar(req, res)));

export default router;
