import { Router } from "express";
import RecuperacaoSenhaController from "../controllers/recuperacao-senha-controller";
import { forgotPasswordRateLimiter } from "../middlewares/rate-limit";

const router = Router();
const controller = new RecuperacaoSenhaController();

/**
 * POST /esqueceuSenha
 * Rota publica - dispara e-mail de redefinicao de senha
 * Resposta identica para e-mail existente e inexistente (PHYTO-SEC-012)
 */
router.post("/esqueceuSenha", forgotPasswordRateLimiter, (req, res) =>
  controller.esqueceuSenha(req, res),
);

export default router;
