import { Router } from "express";
import checa_api_key from "../middlewares/checa-api-key";
import checa_token from "../middlewares/checa-token";
import {
  authRateLimiter,
  passwordResetRateLimiter,
} from "../middlewares/rate-limit";
import requireAdmin from "../middlewares/require-admin";
import requireOwnerOrAdmin from "../middlewares/require-owner-or-admin";
import UsuariosController from "../controllers/usuarios-controller";
import ReservatorioController from "../controllers/reservatorios-controller";
import RecuperacaoSenhaController from "../controllers/recuperacao-senha-controller";

const router = Router();
const controller = new UsuariosController();
const reservatorioController = new ReservatorioController();
const recuperacaoSenhaController = new RecuperacaoSenhaController();

// Rotas públicas
router.post("/login", authRateLimiter, (req, res) => controller.login(req, res));
router.post("/", authRateLimiter, (req, res) => controller.create(req, res));
router.get("/refresh-token", checa_token, (req: any, res) =>
  controller.novoToken(req, res),
);
router.get("/:id/reservatorios", checa_api_key, (req: any, res) =>
  reservatorioController.listByUsuario(req, res),
);

/**
 * POST /usuarios/redefinir-senha
 * Rota publica - recebe { token, novaSenha } e redefine a senha do usuario
 * Declarada antes de /:id para evitar captura pelo parametro dinamico
 */
router.post("/redefinir-senha", passwordResetRateLimiter, (req, res) =>
  recuperacaoSenhaController.redefinirSenha(req, res),
);

// Restrito ao próprio usuário ou admin
router.get("/:id", checa_token, requireOwnerOrAdmin, (req: any, res) =>
  controller.getId(req, res),
);
router.put("/:id", checa_token, requireOwnerOrAdmin, (req: any, res) =>
  controller.update(req, res),
);
router.delete("/:id", checa_token, requireOwnerOrAdmin, (req: any, res) =>
  controller.delete(req, res),
);

// Restrito a admin (declarado após /:id para não interceptar rotas nomeadas)
router.get("/", checa_token, requireAdmin, (req: any, res) =>
  controller.list(req, res),
);

export default router;
