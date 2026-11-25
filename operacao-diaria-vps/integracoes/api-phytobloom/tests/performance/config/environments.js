// tests/performance/config/environments.js
// Configuração de ambiente para os testes de performance k6
// A URL da API é configurável via variável de ambiente

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Credenciais de teste (nunca versionar valores reais)
export const AUTH_EMAIL = __ENV.AUTH_EMAIL || '';
export const AUTH_PASSWORD = __ENV.AUTH_PASSWORD || '';

// IDs de teste para cenários específicos
export const TEST_USER_ID = __ENV.TEST_USER_ID || '';
export const TEST_RESERVOIR_ID = __ENV.TEST_RESERVOIR_ID || '';
export const TEST_AREA_ID = __ENV.TEST_AREA_ID || '';
export const TEST_ALERT_ID = __ENV.TEST_ALERT_ID || '';
