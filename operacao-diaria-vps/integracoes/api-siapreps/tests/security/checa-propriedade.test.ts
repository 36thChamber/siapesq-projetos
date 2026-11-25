import { describe, expect, it, vi } from 'vitest';

import {
  checaPropriedade,
  mesmoIdentificador,
} from '../../src/middlewares/checa-propriedade';
import checa_admin from '../../src/middlewares/checa-admin';

function criarResposta() {
  const resposta: any = {
    status: vi.fn(),
    json: vi.fn(),
  };
  resposta.status.mockReturnValue(resposta);
  resposta.json.mockReturnValue(resposta);
  return resposta;
}

describe('checaPropriedade', () => {
  it('aceita o mesmo usuário quando o BIGINT chega como string', async () => {
    const middleware = checaPropriedade(async () => ({
      id_usuario_dono: '1',
    }));
    const req: any = {
      params: { id: '23' },
      auth: { id_usuario: 1, administracao: false },
    };
    const res = criarResposta();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('continua ocultando recurso pertencente a outro usuário', async () => {
    const middleware = checaPropriedade(async () => ({
      id_usuario_dono: '2',
    }));
    const req: any = {
      params: { id: '23' },
      auth: { id_usuario: 1, administracao: false },
    };
    const res = criarResposta();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: 'recurso não encontrado',
    });
  });

  it('usa o nome de parâmetro configurado para rotas aninhadas', async () => {
    const resolver = vi.fn().mockResolvedValue({ id_usuario_dono: '1' });
    const middleware = checaPropriedade(resolver, 'missaoId');
    const req: any = {
      params: { missaoId: '23' },
      auth: { id_usuario: 1, administracao: false },
    };
    const res = criarResposta();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(resolver).toHaveBeenCalledWith(23);
    expect(next).toHaveBeenCalledOnce();
  });
});

describe('mesmoIdentificador', () => {
  it('rejeita valores inválidos em vez de aproximá-los', () => {
    expect(mesmoIdentificador(undefined, 1)).toBe(false);
    expect(mesmoIdentificador('abc', 1)).toBe(false);
    expect(mesmoIdentificador('1.5', 1.5)).toBe(false);
  });
});

describe('checa_admin', () => {
  it('permite acesso administrativo', () => {
    const req: any = { auth: { id_usuario: 1, administracao: true } };
    const res = criarResposta();
    const next = vi.fn();

    checa_admin(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('nega acesso para usuario autenticado sem permissao administrativa', () => {
    const req: any = { auth: { id_usuario: 1, administracao: false } };
    const res = criarResposta();
    const next = vi.fn();

    checa_admin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Acesso permitido somente para administradores' });
  });
});
