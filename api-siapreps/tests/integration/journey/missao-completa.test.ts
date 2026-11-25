// tests/integration/journey/missao-completa.test.ts
import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../src/express-app';
import ORM from '../../../src/orm/sequelize';
import { criarUsuarioEToken, criarDadosBase } from '../helpers/fixtures';

let orm: ORM;

beforeAll(async () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL não definida para testes');
  }
  orm = new ORM(databaseUrl);
  await orm.init(false);
}, 30000);

afterAll(async () => {
  if (orm) {
    await orm['sequelize'].close();
  }
});

describe('Jornada 4: embarcação → missão → lance → ocorrência → recolhimento → finalização', () => {
  it('deve executar todo o fluxo com sucesso', async () => {
    const { usuario, token } = await criarUsuarioEToken();
    const dados = await criarDadosBase(usuario.id);
    const { embarcacao, porto, artePesca, especie, fundo, isca } = dados;

    // 1. Criar missão
    const res1 = await request(app)
      .post(`/embarcacoes/${embarcacao.id}/missoes`)
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', `teste-criar-missao-${Date.now()}`)
      .send({
        id_porto_saida: porto.id,
        id_porto_chegada: porto.id,
        id_arte_pesca: artePesca.id,
        id_especie_alvo: especie.id,
        nome_armador: 'Armador Teste',
      });
    expect(res1.status).toBe(201);
    const missaoId = res1.body.id;

    // 2. Iniciar missão
    const res2 = await request(app)
      .patch(`/missoes/${missaoId}/iniciar`)
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', `teste-iniciar-missao-${missaoId}`)
      .send({ versao: res1.body.versao });
    expect(res2.status).toBe(200);

    // 3. Criar lance
    const res3 = await request(app)
      .post(`/missoes/${missaoId}/lances`)
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', `teste-criar-lance-${missaoId}`)
      .send({
        numero_lance: 1,
        id_fundo: fundo.id,
        id_isca: isca.id,
        latitude_lancamento: '-23.550520',
        longitude_lancamento: '-46.633308',
      });
    expect(res3.status).toBe(201);
    const lanceId = res3.body.id;

    // 4. Registrar ocorrência
    const res4 = await request(app)
      .post(`/lances/${lanceId}/ocorrencias`)
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', `teste-criar-ocorrencia-${lanceId}`)
      .send({
        id_especie: especie.id,
        tipo_ocorrencia: 'captura',
        quantidade: 12,
        quantidade_vivos: 10,
        quantidade_mortos: 2,
        peso: 84.6,
      });
    expect(res4.status).toBe(201);

    // 5. Recolher lance
    const res5 = await request(app)
      .post(`/lances/${lanceId}/recolher`)
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', `teste-recolher-lance-${lanceId}`)
      .send({ versao: res3.body.versao });
    expect(res5.status).toBe(200);
    expect(res5.body.status).toBe('recolhido');

    // 6. Finalizar missão
    const res6 = await request(app)
      .patch(`/missoes/${missaoId}/finalizar`)
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', `teste-finalizar-missao-${missaoId}`)
      .send({ versao: res2.body.versao });
    expect(res6.status).toBe(200);
    expect(res6.body.status).toBe('finalizada');

    // 7. Verificar que não há lances abertos – USANDO A ROTA CORRETA
    const resLances = await request(app)
      .get(`/lances/missoes/${missaoId}/lances`)   // ✅ corrigido
      .set('Authorization', `Bearer ${token}`);
    expect(resLances.status).toBe(200);
    const lances = resLances.body.data || [];
    expect(lances.every((l: any) => l.status !== 'em_andamento')).toBe(true);
  }, 30000);
});
