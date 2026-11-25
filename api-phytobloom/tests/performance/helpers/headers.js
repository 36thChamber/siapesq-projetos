// tests/performance/helpers/headers.js
// Headers reutilizáveis para requisições autenticadas e públicas

/**
 * Retorna headers com token JWT para rotas protegidas
 * @param {string} token - Token JWT obtido no login
 * @returns {object}
 */
export function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Retorna headers para rotas públicas (sem autenticação)
 * @returns {object}
 */
export function publicHeaders() {
  return {
    'Content-Type': 'application/json',
  };
}
