// tests/performance/helpers/data.js
// Helpers para seleção aleatória de dados de teste
import { SharedArray } from 'k6/data';

// Carrega os dados de teste uma única vez e compartilha entre VUs
const usuarios = new SharedArray('usuarios', function () {
  return JSON.parse(open('../data/usuarios.json'));
});

const reservatorios = new SharedArray('reservatorios', function () {
  return JSON.parse(open('../data/reservatorios.json'));
});

const alertas = new SharedArray('alertas', function () {
  return JSON.parse(open('../data/alertas.json'));
});

/**
 * Retorna um elemento aleatório de um array
 * @param {Array} arr
 * @returns {*}
 */
function escolherAleatorio(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/*
 * Retorna um usuário de teste aleatório
 * @returns {{ email: string, senha: string, id: number, perfil: string, reservatorios_ids: number[], areas_ids: number[], alertas_ids: number[] }}
 */
export function escolherUsuario() {
  return escolherAleatorio(usuarios);
}

/**
 * Retorna um usuário de teste pelo perfil desejado
 * @param {'pequeno' | 'medio' | 'grande'} perfil
 * @returns {object}
 */
export function escolherUsuarioPorPerfil(perfil) {
  const filtrados = usuarios.filter((u) => u.perfil === perfil);
  if (filtrados.length === 0) {
    console.warn(`Nenhum usuário com perfil "${perfil}" encontrado, usando aleatório`);
    return escolherAleatorio(usuarios);
  }
  return escolherAleatorio(filtrados);
}

/**
 * Retorna um ID de reservatório aleatório da lista de teste
 * @returns {number}
 */
export function escolherReservatorioId() {
  const r = escolherAleatorio(reservatorios);
  return r.id;
}

/**
 * Retorna um reservatório aleatório por categoria de tamanho
 * @param {'sem_areas' | 'poucas_areas' | 'muitas_areas'} categoria
 * @returns {object}
 */
export function escolherReservatorioPorCategoria(categoria) {
  const filtrados = reservatorios.filter((r) => r.categoria === categoria);
  if (filtrados.length === 0) {
    return escolherAleatorio(reservatorios);
  }
  return escolherAleatorio(filtrados);
}

/**
 * Retorna um ID de alerta aleatório da lista de teste
 * @returns {number}
 */
export function escolherAlertaId() {
  const a = escolherAleatorio(alertas);
  return a.id;
}

/**
 * Retorna um alerta aleatório por categoria
 * @param {'simples' | 'detalhes_extensos' | 'sem_descricao' | 'descricao_longa'} categoria
 * @returns {object}
 */
export function escolherAlertaPorCategoria(categoria) {
  const filtrados = alertas.filter((a) => a.categoria === categoria);
  if (filtrados.length === 0) {
    return escolherAleatorio(alertas);
  }
  return escolherAleatorio(filtrados);
}

/**
 * Gera parâmetros de paginação aleatórios
 * Alterna entre páginas para evitar cache da primeira página
 *
 * @param {number} [limitPadrao=20] - Limite por página
 * @param {number} [maxPaginas=4] - Número máximo de páginas para alternar
 * @returns {{ limit: number, offset: number, pagina: number }}
 */
export function gerarPaginacao(limitPadrao = 20, maxPaginas = 4) {
  const pagina = Math.floor(Math.random() * maxPaginas) + 1;
  return {
    limit: limitPadrao,
    offset: (pagina - 1) * limitPadrao,
    pagina,
  };
}

/**
 * Retorna um ID inexistente para testes de 404
 * @returns {number}
 */
export function idInexistente() {
  return 999999999;
}
