// tests/performance/flows/alertas.js
import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL } from '../config/environments.js';
import { authHeaders, publicHeaders } from '../helpers/headers.js';
import { 
  checkRespostaOk, 
  checkListaValida, 
  checkRegistroComId, 
  checkNotFound,
  logTamanhoResposta 
} from '../helpers/checks.js';
import { idInexistente } from '../helpers/data.js';

/**
 * Lista todos os alertas utilizando paginação.
 * Rota: GET /alertas?limit=...&offset=... (requer JWT — filtrado por usuário titular)
 *
 * @param {string} token - Token JWT
 * @param {number} limit - Quantidade de registros
 * @param {number} offset - Offset para paginação
 */
export function listarAlertas(token, limit = 20, offset = 0) {
  const res = http.get(`${BASE_URL}/alertas?limit=${limit}&offset=${offset}`, {
    headers: authHeaders(token),
    tags: { endpoint: 'listar_alertas' },
  });

  checkRespostaOk(res, 'listar_alertas');
  checkListaValida(res, 'listar_alertas', 'alertas'); // A API retorna { alertas: [...], total: X }
  logTamanhoResposta(res, 'listar_alertas');
  
  sleep(Math.random() * 2 + 1);
}

/**
 * Busca os detalhes de um alerta específico.
 * Rota: GET /alertas/:id (requer JWT — filtrado por usuário titular)
 *
 * @param {string} token - Token JWT
 * @param {number} alertaId - ID do alerta
 */
export function buscarAlerta(token, alertaId) {
  const res = http.get(`${BASE_URL}/alertas/${alertaId}`, {
    headers: authHeaders(token),
    tags: { endpoint: 'buscar_alerta' },
  });

  checkRespostaOk(res, 'buscar_alerta');
  checkRegistroComId(res, 'buscar_alerta');
  logTamanhoResposta(res, 'buscar_alerta');
  
  sleep(Math.random() * 2 + 1);
}

/**
 * Tenta buscar um alerta que não existe.
 *
 * @param {string} token - Token JWT
 */
export function buscarAlertaInexistente(token) {
  const id = idInexistente();
  const res = http.get(`${BASE_URL}/alertas/${id}`, {
    headers: authHeaders(token),
    tags: { endpoint: 'buscar_alerta' },
  });

  checkNotFound(res, 'buscar_alerta_inexistente');
}

/**
 * Lista as áreas de alerta utilizando paginação.
 * Rota: GET /areas-alertas?limit=...&offset=...
 * 
 * @param {number} limit - Quantidade de registros
 * @param {number} offset - Offset para paginação
 */
export function listarAreasAlertas(limit = 20, offset = 0) {
  const res = http.get(`${BASE_URL}/areas-alertas?limit=${limit}&offset=${offset}`, {
    headers: publicHeaders(),
    tags: { endpoint: 'listar_areas' },
  });

  checkRespostaOk(res, 'listar_areas');
  checkListaValida(res, 'listar_areas', 'data'); // A API retorna { data: [...], ... }
  logTamanhoResposta(res, 'listar_areas');
  
  sleep(Math.random() * 2 + 1);
}

/**
 * Busca os detalhes de uma área de alerta.
 * Rota: GET /areas-alertas/:id
 * 
 * @param {number} areaId - ID da área de alerta
 */
export function buscarAreaAlerta(areaId) {
  const res = http.get(`${BASE_URL}/areas-alertas/${areaId}`, {
    headers: publicHeaders(),
    tags: { endpoint: 'buscar_area' },
  });

  checkRespostaOk(res, 'buscar_area');
  checkRegistroComId(res, 'buscar_area');
  logTamanhoResposta(res, 'buscar_area');
  
  sleep(Math.random() * 2 + 1);
}

/**
 * Atualiza um alerta marcando-o como visualizado.
 * Rota: PUT /alertas/:id
 * 
 * @param {string} token - Token JWT
 * @param {number} alertaId - ID do alerta exclusivo de teste
 */
export function marcarAlertaVisualizado(token, alertaId) {
  const payload = JSON.stringify({
    visualizado: true,
    status: 'visualizado'
  });

  const res = http.put(`${BASE_URL}/alertas/${alertaId}`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    tags: { endpoint: 'marcar_visualizado' },
  });

  checkRespostaOk(res, 'marcar_visualizado');
  
  sleep(1);
}
