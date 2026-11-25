import { describe, it, expect, vi, beforeEach } from 'vitest';
import IdempotenciaServices from '../../src/services/idempotencia-services';
import IdempotencyKeys from '../../src/models/IdempotencyKeys';

vi.mock('../../src/models/IdempotencyKeys');

const idempotencyKeysMock = vi.mocked(IdempotencyKeys);

describe('IdempotenciaServices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const paramsBase = {
    chave: 'chave-123',
    escopo: 'criar-missao',
    id_usuario: 10,
    hashCorpo: 'hash-abc',
  };

  describe('verificar', () => {
    it('retorna "novo" quando não há registro para a chave', async () => {
      idempotencyKeysMock.findOne.mockResolvedValue(null);

      const resultado = await IdempotenciaServices.verificar(paramsBase);

      expect(resultado).toEqual({ tipo: 'novo' });
      expect(idempotencyKeysMock.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            chave: 'chave-123',
            escopo: 'criar-missao',
            id_usuario: 10,
          }),
        }),
      );
    });

    it('retorna "replay" com a resposta original quando o hash do corpo é igual', async () => {
      idempotencyKeysMock.findOne.mockResolvedValue({
        hash_corpo: 'hash-abc',
        status_resposta: 201,
        corpo_resposta: { id: 1, nome: 'missao' },
      } as any);

      const resultado = await IdempotenciaServices.verificar(paramsBase);

      expect(resultado).toEqual({
        tipo: 'replay',
        status: 201,
        corpo: { id: 1, nome: 'missao' },
      });
    });

    it('retorna "conflito" quando o hash do corpo é diferente', async () => {
      idempotencyKeysMock.findOne.mockResolvedValue({
        hash_corpo: 'hash-diferente',
        status_resposta: 201,
        corpo_resposta: { id: 1 },
      } as any);

      const resultado = await IdempotenciaServices.verificar(paramsBase);

      expect(resultado).toEqual({ tipo: 'conflito' });
    });

    it('trata chave expirada como "novo" (findOne já filtra expira_em no passado)', async () => {
      // A query real filtra expira_em > now; simula o caso em que a chave expirada
      // não é retornada pelo banco.
      idempotencyKeysMock.findOne.mockResolvedValue(null);

      const resultado = await IdempotenciaServices.verificar(paramsBase);

      expect(resultado).toEqual({ tipo: 'novo' });
    });
  });

  describe('registrar', () => {
    it('persiste a chave com status, corpo e expiração', async () => {
      idempotencyKeysMock.upsert.mockResolvedValue([{} as any, true]);

      await IdempotenciaServices.registrar({
        ...paramsBase,
        status: 201,
        corpo: { id: 1 },
      });

      expect(idempotencyKeysMock.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          chave: 'chave-123',
          escopo: 'criar-missao',
          id_usuario: 10,
          hash_corpo: 'hash-abc',
          status_resposta: 201,
          corpo_resposta: { id: 1 },
          expira_em: expect.any(Date),
        }),
        { transaction: undefined },
      );
    });
  });
});
