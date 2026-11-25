// tests/performance/config/thresholds.js
// Thresholds iniciais para os testes de performance
// Esses valores devem ser ajustados após a primeira execução

export const globalThresholds = {
  // Taxa de erro global abaixo de 1%
  http_req_failed: ['rate<0.01'],

  // Tempo de resposta global
  http_req_duration: [
    'p(95)<1500',
    'p(99)<3000',
  ],
};

export const endpointThresholds = {
  // Listagem de reservatórios do usuário
  'http_req_duration{endpoint:listar_reservatorios}': ['p(95)<1000'],

  // Detalhe de reservatório
  'http_req_duration{endpoint:buscar_reservatorio}': ['p(95)<1000'],

  // Listagem de áreas de alerta
  'http_req_duration{endpoint:listar_areas}': ['p(95)<1000'],

  // Listagem geral de alertas
  'http_req_duration{endpoint:listar_alertas}': ['p(95)<1500'],

  // Detalhe de alerta
  'http_req_duration{endpoint:buscar_alerta}': ['p(95)<1000'],

  // Busca de área de alerta por ID
  'http_req_duration{endpoint:buscar_area}': ['p(95)<1000'],

  // Login
  'http_req_duration{endpoint:login}': ['p(95)<2000'],
};

// Combina thresholds globais e por endpoint
export function buildThresholds(extra = {}) {
  return {
    ...globalThresholds,
    ...endpointThresholds,
    ...extra,
  };
}
