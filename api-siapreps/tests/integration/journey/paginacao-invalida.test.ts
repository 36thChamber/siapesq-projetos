import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../src/express-app';
import ORM from '../../../src/orm/sequelize';
import { criarUsuarioEToken } from '../helpers/fixtures';

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

describe('Jornada 9: paginação com valores inválidos', () => {
  it('deve retornar 400 para limit negativo', async () => {
    const { token } = await criarUsuarioEToken();
    const res = await request(app)
      .get('/embarcacoes?limit=-10')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_PAGINATION');
  });

  it('deve retornar 400 para limit > 100', async () => {
    const { token } = await criarUsuarioEToken();
    const res = await request(app)
      .get('/embarcacoes?limit=200')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_PAGINATION');
  });

  it('deve retornar 400 para offset negativo', async () => {
    const { token } = await criarUsuarioEToken();
    const res = await request(app)
      .get('/embarcacoes?offset=-5')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_PAGINATION');
  });

  it('deve retornar 400 para limit com letras', async () => {
    const { token } = await criarUsuarioEToken();
    const res = await request(app)
      .get('/embarcacoes?limit=abc')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_PAGINATION');
  });
});