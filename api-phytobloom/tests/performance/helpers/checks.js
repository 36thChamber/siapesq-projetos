// tests/performance/helpers/checks.js
// Checks reutilizáveis para validações de resposta
import { check } from 'k6';

/**
 * Checks padrão para qualquer requisição GET com sucesso.
 * Valida status 200, presença de corpo e tempo de resposta.
 *
 * @param {object} response - Resposta do k6 http
 * @param {string} nome - Nome descritivo do endpoint (para identificação nos logs)
 * @param {number} [tempoMaxMs=2000] - Tempo máximo de resposta em ms
 * @returns {boolean}
 */
export function checkRespostaOk(response, nome, tempoMaxMs = 2000) {
  return check(response, {
    [`${nome} retornou status 200`]: (res) => res.status === 200,
    [`${nome} possui corpo`]: (res) => Boolean(res.body),
    [`${nome} respondeu em menos de ${tempoMaxMs}ms`]: (res) =>
      res.timings.duration < tempoMaxMs,
  });
}

/**
 * Checks para respostas que retornam uma lista (array)
 * Valida que o corpo é um array ou contém um campo de array
 *
 * @param {object} response - Resposta do k6 http
 * @param {string} nome - Nome descritivo do endpoint
 * @param {string} [campo] - Campo que contém o array (ex: 'data', 'alertas'). Se não fornecido, espera array no root
 * @returns {boolean}
 */
export function checkListaValida(response, nome, campo) {
  return check(response, {
    [`${nome} retornou lista válida`]: (res) => {
      try {
        const body = res.json();
        if (campo) {
          return Array.isArray(body[campo]);
        }
        return Array.isArray(body);
      } catch (e) {
        return false;
      }
    },
  });
}

/**
 * Checks para respostas que retornam um registro com ID
 *
 * @param {object} response - Resposta do k6 http
 * @param {string} nome - Nome descritivo do endpoint
 * @param {string} [campoId='id'] - Nome do campo de ID
 * @returns {boolean}
 */
export function checkRegistroComId(response, nome, campoId = 'id') {
  return check(response, {
    [`${nome} retornou registro com ${campoId}`]: (res) => {
      try {
        const body = res.json();
        // Suporta resposta direta ou com wrapper { data: ... }
        const registro = body.data || body;
        return registro[campoId] !== undefined && registro[campoId] !== null;
      } catch (e) {
        return false;
      }
    },
  });
}

/**
 * Checks para requisições que devem retornar 404
 *
 * @param {object} response - Resposta do k6 http
 * @param {string} nome - Nome descritivo do endpoint
 * @returns {boolean}
 */
export function checkNotFound(response, nome) {
  return check(response, {
    [`${nome} retornou status 404`]: (res) => res.status === 404,
  });
}

/**
 * Registra o tamanho da resposta para análise posterior
 * Útil para detectar payloads excessivamente grandes
 
 * @param {object} response - Resposta do k6 http
 * @param {string} nome - Nome descritivo do endpoint
 */
export function logTamanhoResposta(response, nome) {
  const tamanho = response.body ? response.body.length : 0;
  if (tamanho > 100000) {
    console.warn(`⚠️  ${nome}: resposta grande (${(tamanho / 1024).toFixed(1)} KB)`);
  }
}
