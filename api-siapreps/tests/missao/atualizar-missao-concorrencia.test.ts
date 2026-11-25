import { describe, it, expect, vi, beforeEach } from 'vitest';
import httpStatus from '../../src/consts/http-status-enum';
import AtualizarMissaoUseCase from '../../src/use-cases/missoes/atualizar-missao';
import Missoes from '../../src/models/Missoes';

vi.mock('../../src/models/Missoes');

const missoesMock = vi.mocked(Missoes);

describe('AtualizarMissaoUseCase (concorrência otimista)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('atualiza com sucesso quando a versão informada bate com a atual, e incrementa a versão', async () => {
    const missaoAtual = {
      id: 1,
      versao: 3,
      iniciou_em: new Date('2026-01-01'),
      terminou_em: null,
      deletado_em: null,
    };
    missoesMock.findByPk.mockResolvedValue(missaoAtual as any);
    missoesMock.update = vi.fn().mockResolvedValue([1, [{ ...missaoAtual, versao: 4, nome_armador: 'Novo' }]]);

    const params = { id: 1, versaoEsperada: 3 };
    const body = { nome_armador: 'Novo' };

    await expect(AtualizarMissaoUseCase.valida(params, body)).resolves.not.toThrow();
    const resultado = await AtualizarMissaoUseCase.executa(params, body);

    expect(resultado.versao).toBe(4);
    expect(missoesMock.update).toHaveBeenCalledWith(
      expect.objectContaining({ nome_armador: 'Novo', versao: 4 }),
      { where: { id: 1, versao: 3 }, returning: true },
    );
  });

  it('retorna 409 VERSION_MISMATCH e não sobrescreve quando a versão informada está desatualizada', async () => {
    const missaoAtual = {
      id: 1,
      versao: 5,
      iniciou_em: new Date('2026-01-01'),
      terminou_em: null,
      deletado_em: null,
    };
    // primeira leitura (executa) e leitura pós-conflito devolvem a versão mais nova do banco
    missoesMock.findByPk.mockResolvedValue(missaoAtual as any);
    missoesMock.update = vi.fn().mockResolvedValue([0, []]);

    const params = { id: 1, versaoEsperada: 3 }; // cliente ainda está na versão 3, banco já está na 5
    const body = { nome_armador: 'Tentativa antiga' };

    await expect(AtualizarMissaoUseCase.executa(params, body)).rejects.toMatchObject({
      status: httpStatus.CONFLICT,
      code: 'VERSION_MISMATCH',
    });

    // garante que o update foi tentado condicionado à versão esperada do cliente,
    // e não à versão atual do banco (prova de que não houve sobrescrita silenciosa)
    expect(missoesMock.update).toHaveBeenCalledWith(
      expect.anything(),
      { where: { id: 1, versao: 3 }, returning: true },
    );
  });

  it('retorna 404 quando a missão não existe', async () => {
    missoesMock.findByPk.mockResolvedValue(null);

    await expect(
      AtualizarMissaoUseCase.executa({ id: 999, versaoEsperada: 1 }, { nome_armador: 'X' }),
    ).rejects.toMatchObject({ statusCode: httpStatus.NOT_FOUND, code: 'NOT_FOUND' });
  });

  it('rejeita quando versaoEsperada não é informada', async () => {
    await expect(
      AtualizarMissaoUseCase.valida({ id: 1 } as any, { nome_armador: 'X' }),
    ).rejects.toMatchObject({ statusCode: httpStatus.BAD_REQUEST, code: 'VALIDATION_ERROR' });
  });
});
