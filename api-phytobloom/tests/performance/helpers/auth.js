// tests/performance/helpers/auth.js
// Helper de autenticação - login e gestão de token
import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, AUTH_EMAIL, AUTH_PASSWORD } from '../config/environments.js';

/**
 * Realiza o login e retorna o token JWT e o ID do usuário.
 * Deve ser chamado no setup() para reutilizar o token durante o cenário.
 *
 * @param {string} [email] - Email do usuário (usa AUTH_EMAIL se não fornecido)
 * @param {string} [senha] - Senha do usuário (usa AUTH_PASSWORD se não fornecida)
 * @returns {{ token: string, userId: number }}
 */
export function login(email, senha) {
  const payload = JSON.stringify({
    email: email || AUTH_EMAIL,
    senha: senha || AUTH_PASSWORD,
  });

  const response = http.post(`${BASE_URL}/usuarios/login`, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint: 'login' },
  });

  const sucesso = check(response, {
    'login retornou status 200': (res) => res.status === 200,
    'login retornou token': (res) => {
      try {
        return Boolean(res.json('token'));
      } catch (e) {
        return false;
      }
    },
    'login retornou id do usuário': (res) => {
      try {
        return Boolean(res.json('id'));
      } catch (e) {
        return false;
      }
    },
  });

  if (!sucesso) {
    console.error(`Falha no login: status=${response.status} body=${response.body}`);
    throw new Error('Falha na autenticação — verifique AUTH_EMAIL e AUTH_PASSWORD');
  }

  const body = response.json();

  return {
    token: body.token,
    userId: body.id,
  };
}
