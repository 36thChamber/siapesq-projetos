// tests/performance/scenarios/stress.js
import { login } from '../helpers/auth.js';
import { executarFluxoCompleto } from '../flows/fluxoCompleto.js';
import { buildThresholds } from '../config/thresholds.js';

/**
 * STRESS TEST
 * 
 * Objetivo: Identificar o ponto em que a API começa a degradar.
 * 
 * IMPORTANTE: Executar somente em ambiente controlado.
 */
export const options = {
  stages: [
    { duration: '1m', target: 10 },   // Rampa inicial
    { duration: '2m', target: 25 },   
    { duration: '2m', target: 50 },   
    { duration: '2m', target: 75 },   
    { duration: '2m', target: 100 },  // Pico de estresse
    { duration: '2m', target: 0 },    // Descanso
  ],
  // Thresholds mais flexíveis pois degradação é esperada no estresse
  thresholds: buildThresholds({
    http_req_failed: ['rate<0.05'], // Tolerância a 5% de falhas
    http_req_duration: ['p(95)<3000', 'p(99)<5000'],
  }),
};

export function setup() {
  return login();
}

export default function (data) {
  executarFluxoCompleto(data);
}
