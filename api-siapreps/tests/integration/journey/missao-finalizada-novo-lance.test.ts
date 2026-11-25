// tests/integration/journey/missao-finalizada-novo-lance.test.ts
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

describe('Jornada 8: tentar criar lance em missão finalizada', () => {
  it('deve retornar 409 ao tentar criar lance em missão finalizada', async () => {
    const { usuario, token } = await criarUsuarioEToken();
    const dados = await criarDadosBase(usuario.id);
    const { embarcacao, porto, artePesca, especie } = dados;

    const res1 = await request(app)
      .post(`/embarcacoes/${embarcacao.id}/missoes`)
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', `teste-criar-missao-${Date.now()}`)
      .send({
        id_porto_saida: porto.id,
        id_arte_pesca: artePesca.id,
        id_especie_alvo: especie.id,
      });
    expect(res1.status).toBe(201);
    const missaoId = res1.body.id;

    const resIniciar = await request(app)
      .patch(`/missoes/${missaoId}/iniciar`)
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', `teste-iniciar-missao-${missaoId}`)
      .send({ versao: res1.body.versao });

    const resFinalizar = await request(app)
      .patch(`/missoes/${missaoId}/finalizar`)
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', `teste-finalizar-missao-${missaoId}`)
      .send({ versao: resIniciar.body.versao });
    expect(resFinalizar.status).toBe(200);

    const resLance = await request(app)
      .post(`/missoes/${missaoId}/lances`)
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', `teste-lance-finalizada-${missaoId}`)
      .send({
        numero_lance: 1,
        latitude_lancamento: '-23.550520',
        longitude_lancamento: '-46.633308',
      });
    expect(resLance.status).toBe(409);
    expect(resLance.body.error.code).toBe('MISSION_NOT_IN_PROGRESS');
  }, 30000);
});
