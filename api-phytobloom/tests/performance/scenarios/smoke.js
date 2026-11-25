// tests/performance/scenarios/smoke.js
import { login } from '../helpers/auth.js';
import { executarFluxoCompleto } from '../flows/fluxoCompleto.js';
import { buildThresholds } from '../config/thresholds.js';

/**
 * SMOKE TEST
 * 
 * Objetivo: Validar scripts, autenticação, dados e checks.
 * Verifica se a infraestrutura de teste e a API estão saudáveis
 * antes de rodar testes de carga reais.
 */
export const options = {
  vus: 1, // 1 usuário virtual
  duration: '30s', // Duração curta
  thresholds: buildThresholds(),
};

export function setup() {
  // Autenticação executada uma única vez antes do teste
  return login();
}

export default function (data) {
  executarFluxoCompleto(data);
}
