// tests/integration/areas-alertas-ownership.test.ts
import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import App from '../../src/app';
import { criarUsuarioEToken, criarReservatorio, criarAreaAlerta } from '../integration/helpers/fixtures';
import http_status from '../../src/consts/http-status-enum';
import Usuarios from '../../src/models/Usuarios';

let app: App;

beforeAll(async () => {
  console.log('🟢 Iniciando beforeAll...');
  console.log('🟢 Criando App...');
  app = new App();
  
  if (!app.orm) {
    throw new Error('ORM não foi inicializado pelo App');
  }
  
  console.log('🟢 Chamando app.orm.init(false)...');
  await app.orm.init(false);
  console.log('✅ ORM inicializado com sucesso!');
}, 60000); // 2 minutos

afterAll(async () => {
  console.log('🟢 Fechando conexão...');
  if (app?.orm) {
    await app.orm['sequelize'].close();
  }
  console.log('✅ Conexão fechada.');
});

describe('GET /areas-alertas - ownership', () => {
  let usuarioA: { usuario: any; token: string };
  let usuarioB: { usuario: any; token: string };
  let admin: { usuario: any; token: string };
  let reservatorioA: any;
  let areaAlertaA: any;

  beforeAll(async () => {
    console.log('🟢 Criando usuários...');
    usuarioA = await criarUsuarioEToken();
    usuarioB = await criarUsuarioEToken();

    await Usuarios.update(
    { is_admin: false }, 
    { where: { id: [usuarioA.usuario.id, usuarioB.usuario.id] } }
  );

    // Admin
    const adminTemp = await criarUsuarioEToken();
    await Usuarios.update({ is_admin: true }, { where: { id: adminTemp.usuario.id } });
    admin = { usuario: adminTemp.usuario, token: adminTemp.token };

    console.log('🟢 Criando reservatório e área...');
    reservatorioA = await criarReservatorio(usuarioA.usuario.id);
    areaAlertaA = await criarAreaAlerta(reservatorioA.id);
    console.log('✅ Dados de teste prontos.');
  });

  // ========== TESTES ==========
  it('Usuário A consegue buscar sua própria área', async () => {
    const res = await request(app.server)
      .get(`/areas-alertas/${areaAlertaA.id}`)
      .set('Authorization', `Bearer ${usuarioA.token}`);
    expect(res.status).toBe(http_status.OK);
    expect(res.body.data.id).toBe(areaAlertaA.id);
  });

  it('Usuário B recebe 403 ao buscar área de A', async () => {
    const res = await request(app.server)
      .get(`/areas-alertas/${areaAlertaA.id}`)
      .set('Authorization', `Bearer ${usuarioB.token}`);
    expect(res.status).toBe(http_status.FORBIDDEN);
  });

  it('Admin consegue buscar área de A', async () => {
    const res = await request(app.server)
      .get(`/areas-alertas/${areaAlertaA.id}`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(http_status.OK);
  });

  it('Usuário A vê sua área na listagem', async () => {
    const res = await request(app.server)
      .get('/areas-alertas')
      .set('Authorization', `Bearer ${usuarioA.token}`);
    expect(res.status).toBe(http_status.OK);
    const ids = res.body.data.map((a: any) => a.id);
    expect(ids).toContain(areaAlertaA.id);
  });

  it('Usuário B não vê área de A na listagem', async () => {
    const res = await request(app.server)
      .get('/areas-alertas')
      .set('Authorization', `Bearer ${usuarioB.token}`);
    expect(res.status).toBe(http_status.OK);
    const ids = res.body.data.map((a: any) => a.id);
    expect(ids).not.toContain(areaAlertaA.id);
  });

  it('Admin vê todas as áreas na listagem', async () => {
    const res = await request(app.server)
      .get('/areas-alertas')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(http_status.OK);
    const ids = res.body.data.map((a: any) => a.id);
    expect(ids).toContain(areaAlertaA.id);
  });

  // Opcional: se a rota existir
  it('Usuário B recebe 403 ao listar áreas de reservatório de A', async () => {
    const res = await request(app.server)
      .get(`/areas-alertas/reservatorio/${reservatorioA.id}`)
      .set('Authorization', `Bearer ${usuarioB.token}`);
    expect(res.status).toBe(http_status.FORBIDDEN);
  });

  it('Usuário A consegue listar áreas de seu reservatório', async () => {
    const res = await request(app.server)
      .get(`/areas-alertas/reservatorio/${reservatorioA.id}`)
      .set('Authorization', `Bearer ${usuarioA.token}`);
    expect(res.status).toBe(http_status.OK);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});