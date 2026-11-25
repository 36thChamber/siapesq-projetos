import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Op } from 'sequelize';
import BuscarMissoesUseCase from '../../src/use-cases/missoes/buscar-missoes';
import Missoes from '../../src/models/Missoes';

vi.mock('../../src/models/Missoes');

const missoesMock = vi.mocked(Missoes);

describe('BuscarMissoesUseCase (updated_after / tombstones)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sem updated_after, preserva o comportamento atual (paranoid padrão, sem deletados)', async () => {
    missoesMock.findAndCountAll.mockResolvedValue({ rows: [], count: 0 } as any);

    await BuscarMissoesUseCase.executa({ limit: 10, offset: 0 });

    const chamada = missoesMock.findAndCountAll.mock.calls[0][0] as any;
    expect(chamada.paranoid).toBe(true);
    expect(chamada.where).toEqual({ deletado_em: { [Op.is]: null } });
  });

  it('com updated_after, busca com paranoid:false e inclui atualizados ou deletados na janela', async () => {
    const registroDeletado = {
      id: 2,
      atualizado_em: new Date('2026-01-01'),
      deletado_em: new Date('2026-01-05'),
    };
    missoesMock.findAndCountAll.mockResolvedValue({
      rows: [registroDeletado],
      count: 1,
    } as any);

    const resultado = await BuscarMissoesUseCase.executa({
      limit: 10,
      offset: 0,
      updated_after: '2026-01-01T00:00:00.000Z',
    });

    const chamada = missoesMock.findAndCountAll.mock.calls[0][0] as any;
    expect(chamada.paranoid).toBe(false);
    expect(chamada.where[Op.or]).toEqual([
      { atualizado_em: { [Op.gte]: '2026-01-01T00:00:00.000Z' } },
      { deletado_em: { [Op.gte]: '2026-01-01T00:00:00.000Z' } },
    ]);

    // tombstone visível: cliente distingue exclusão checando deletado_em
    expect(resultado.missoes[0].deletado_em).not.toBeNull();
  });
});
