import { Router } from "express";
import checa_token from "../middlewares/checa-token";
import { verificationEmailRateLimiter } from "../middlewares/rate-limit";
import VerificacaoEmailController from "../controllers/verificacao-email-controller";

const router = Router();
const controller = new VerificacaoEmailController();

/**
 * POST /verificarEmail/enviar
 * Autenticada - dispara e-mail de verificacao para o usuario do token JWT
 * Nao aceita e-mail no body; usa apenas req.id_usuario
 */
router.post(
  "/enviar",
  checa_token,
  verificationEmailRateLimiter,
  (req: any, res) => controller.enviar(req, res),
);

/**
 * GET /verificarEmail
 * Publica - valida o token recebido via Authorization: Bearer <token>
 * O link enviado por e-mail aponta para o frontend; o frontend extrai o token
 * e o envia ao backend via header
 */
router.get("/", (req, res) => controller.verificar(req, res));

export default router;
