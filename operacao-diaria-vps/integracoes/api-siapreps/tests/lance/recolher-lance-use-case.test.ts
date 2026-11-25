import { describe, it, expect, vi, beforeEach } from 'vitest';
import httpStatus from '../../src/consts/http-status-enum';
import RecolherLanceUseCase from '../../src/use-cases/lances/recolher-lance';
import Lances from '../../src/models/Lances';
import { LanceStatus } from '../../src/models/enums/lance-status.enum';

describe('RecolherLanceUseCase', () => {
  beforeEach((): void => {
    vi.clearAllMocks();
  });

  const paramsValidos = { id: 1, versaoEsperada: 1 };

  it('deve recolher um lance com sucesso', async () => {
    const observedAt = '2025-10-31T06:00:00-03:00';
    const eventInstant = new Date('2025-10-31T09:00:00.000Z');
    const lanceMock = {
      id: 1,
      status: LanceStatus.EM_ANDAMENTO,
      ativo: true,
      versao: 1,
      lancado_em: new Date('2025-10-31T08:00:00.000Z'),
      update: vi.fn().mockResolvedValue([1, [{}]]),
    };
    const findSpy = vi.spyOn(Lances, 'findOne').mockResolvedValue(lanceMock as any);
    const updateSpy = vi.spyOn(Lances, 'update').mockResolvedValue([1, [lanceMock]] as any);

    const params = { ...paramsValidos, recolhido_em_observado: observedAt };
    await expect(RecolherLanceUseCase.valida(params)).resolves.not.toThrow();
    const resultado = await RecolherLanceUseCase.executa(params);
    expect(resultado).toBeDefined();
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        status: LanceStatus.RECOLHIDO,
        recolhido_em: eventInstant,
        recolhido_em_observado: eventInstant,
        versao: 2,
      }),
      expect.objectContaining({ where: { id: 1, versao: 1 } })
    );
    expect(findSpy).toHaveBeenCalled();
  });

  it('deve lançar erro de conflito se a versão informada estiver desatualizada', async () => {
    const lanceMock = {
      id: 1,
      status: LanceStatus.EM_ANDAMENTO,
      ativo: true,
      versao: 4,
    };
    vi.spyOn(Lances, 'findOne').mockResolvedValue(lanceMock as any);
    vi.spyOn(Lances, 'update').mockResolvedValue([0, []] as any);
    vi.spyOn(Lances, 'findByPk').mockResolvedValue(lanceMock as any);

    const params = { ...paramsValidos };
    await expect(RecolherLanceUseCase.valida(params)).resolves.not.toThrow();
    await expect(RecolherLanceUseCase.executa(params)).rejects.toMatchObject({
      statusCode: httpStatus.CONFLICT,
      code: 'VERSION_MISMATCH',
    });
  });

  it('deve lançar erro se lance não existir', async () => {
    vi.spyOn(Lances, 'findOne').mockResolvedValue(null);
    await expect(RecolherLanceUseCase.valida(paramsValidos)).rejects.toMatchObject({
      statusCode: 404, code: 'NOT_FOUND', message: 'Lance 1 não encontrado',
    });
  });

  it('deve lançar erro se lance não estiver em andamento', async () => {
    vi.spyOn(Lances, 'findOne').mockResolvedValue({
      id: 1,
      status: LanceStatus.RECOLHIDO,
      ativo: true,
    } as any);
    await expect(RecolherLanceUseCase.valida(paramsValidos)).rejects.toMatchObject({
      statusCode: 409, code: 'BID_NOT_IN_PROGRESS',
      message: 'Lance não está em andamento para ser recolhido',
    });
  });

  it('deve lançar erro se versaoEsperada não for informada', async () => {
    await expect(RecolherLanceUseCase.valida({ id: 1 } as any)).rejects.toMatchObject({
      statusCode: httpStatus.BAD_REQUEST,
      code: 'VALIDATION_ERROR',
    });
  });

  it('rejeita recolhimento observado anterior ao lançamento', async () => {
    vi.spyOn(Lances, 'findOne').mockResolvedValue({
      id: 1,
      status: LanceStatus.EM_ANDAMENTO,
      ativo: true,
      versao: 1,
      lancado_em: new Date('2025-10-31T08:00:00.000Z'),
    } as any);
    const update = vi.spyOn(Lances, 'update');
    const params = { ...paramsValidos, recolhido_em_observado: '2025-10-31T07:00:00Z' };

    await RecolherLanceUseCase.valida(params);
    await expect(RecolherLanceUseCase.executa(params)).rejects.toMatchObject({
      statusCode: httpStatus.BAD_REQUEST,
      code: 'VALIDATION_ERROR',
    });
    expect(update).not.toHaveBeenCalled();
  });
});
