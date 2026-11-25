import rateLimit from "express-rate-limit";

const WINDOW_MS = 15 * 60 * 1000;

function createRateLimiter(max: number, message: string) {
  return rateLimit({
    windowMs: WINDOW_MS,
    max,
    message,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        status: "error",
        message,
        code: "TOO_MANY_REQUESTS",
      });
    },
  });
}

/**
 * Rate limiter para as rotas de autenticação e criação de usuário
 * 10 tentativas por IP a cada 15 minutos (900 segundos)
 */
export const authRateLimiter = createRateLimiter(
  10,
  "Muitas tentativas de acesso. Tente novamente em 15 minutos.",
);

// Instancias separadas evitam que uma solicitacao de e-mail consuma a cota
// de login/cadastro ou de outro fluxo sensivel.
export const forgotPasswordRateLimiter = createRateLimiter(
  5,
  "Muitas solicitacoes de redefinicao. Tente novamente em 15 minutos.",
);

export const verificationEmailRateLimiter = createRateLimiter(
  5,
  "Muitas solicitacoes de verificacao. Tente novamente em 15 minutos.",
);

export const passwordResetRateLimiter = createRateLimiter(
  10,
  "Muitas tentativas de redefinicao. Tente novamente em 15 minutos.",
);

export default authRateLimiter;
