// tests/performance/scenarios/load.js
import { login } from '../helpers/auth.js';
import { executarFluxoCompleto } from '../flows/fluxoCompleto.js';
import { buildThresholds } from '../config/thresholds.js';

/**
 * LOAD TEST
 * 
 * Objetivo: Criar a primeira linha de base de desempenho.
 * Simula um fluxo de tráfego que aumenta e diminui progressivamente.
 */
export const options = {
  stages: [
    { duration: '30s', target: 5 },  // Subida para 5 usuários
    { duration: '1m', target: 5 },   // Manutenção em 5
    { duration: '1m', target: 10 },  // Subida para 10
    { duration: '2m', target: 10 },  // Manutenção em 10
    { duration: '1m', target: 25 },  // Subida para 25
    { duration: '3m', target: 25 },  // Manutenção em 25
    { duration: '1m', target: 0 },   // Descida para 0
  ],
  thresholds: buildThresholds(),
};

export function setup() {
  return login();
}

export default function (data) {
  executarFluxoCompleto(data);
}
