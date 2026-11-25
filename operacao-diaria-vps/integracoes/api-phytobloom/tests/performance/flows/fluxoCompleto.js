// tests/performance/flows/fluxoCompleto.js
import { escolherUsuario, escolherReservatorioId, escolherAlertaId, gerarPaginacao } from '../helpers/data.js';
import { login } from '../helpers/auth.js';
import { listarReservatoriosUsuario, buscarReservatorio } from './reservatorios.js';
import { listarAlertas, buscarAlerta } from './alertas.js';
import { sleep } from 'k6';

/**
 * Simula o fluxo completo de um usuário interagindo com a interface frontend.
 * 
 * 1. Login (no setup)
 * 2. Lista reservatórios do usuário
 * 3. Seleciona um reservatório e busca seus detalhes
 * 4. Lista alertas (paginados)
 * 5. Seleciona e busca os detalhes de um alerta
 * 
 * @param {object} dadosSetup - Dados retornados pela função setup() do k6 (token, userId, etc.)
 */
export function executarFluxoCompleto(dadosSetup) {
  const token = dadosSetup.token;
  const userId = dadosSetup.userId;
  
  // 1. O usuário abre a dashboard e lista seus reservatórios (25% do peso na distribuição teórica)
  listarReservatoriosUsuario(token, userId);
  
  sleep(Math.random() * 2 + 1); // Pensa por 1 a 3 segundos
  
  // 2. O usuário clica em um reservatório para ver os detalhes (10%)
  // Na ausência de rota para listar áreas específicas e alertas por reservatório,
  // fazemos apenas a busca do reservatório, já que os endpoints de filtro não existem na API atual.
  const reservatorioId = escolherReservatorioId();
  buscarReservatorio(token, reservatorioId);
  
  sleep(Math.random() * 2 + 1);

  // 3. O usuário navega para a tela de alertas gerais (20%)
  // Simula o uso da paginação alternando entre as páginas iniciais
  const { limit, offset } = gerarPaginacao(20, 4);
  listarAlertas(token, limit, offset);

  sleep(Math.random() * 2 + 1);

  // 4. O usuário clica para ver os detalhes de um alerta
  const alertaId = escolherAlertaId();
  buscarAlerta(token, alertaId);
  
  sleep(Math.random() * 2 + 1);
}
