import { describe, it, expect, vi, beforeEach } from 'vitest';
import httpStatus from '../../src/consts/http-status-enum';
import FinalizarMissaoUseCase from '../../src/use-cases/missoes/finalizar-missao';
import Missoes from '../../src/models/Missoes';
import Lances from '../../src/models/Lances';
import { MissaoStatus } from '../../src/models/enums/missao-status.enum';
import { LanceStatus } from '../../src/models/enums/lance-status.enum';

describe('FinalizarMissaoUseCase', () => {
  beforeEach((): void => {
    vi.clearAllMocks();
  });

  const paramsValidos = { id: 1, usuarioId: 10, versaoEsperada: 1 };

  it('deve finalizar uma missão com sucesso', async () => {
    const observedAt = '2025-10-31T06:00:00-03:00';
    const eventInstant = new Date('2025-10-31T09:00:00.000Z');
    const missaoMock = {
      id: 1,
      id_usuario: 10,
      status: MissaoStatus.EM_ANDAMENTO,
      versao: 1,
      iniciou_em: new Date('2025-10-31T08:00:00.000Z'),
      update: vi.fn().mockResolvedValue([1, [{}]]),
    };
    const findMissaoSpy = vi.spyOn(Missoes, 'findOne').mockResolvedValue(missaoMock as any);
    vi.spyOn(Lances, 'findOne').mockResolvedValue(null);
    const updateSpy = vi.spyOn(Missoes, 'update').mockResolvedValue([1, [missaoMock]] as any);

    const params = { ...paramsValidos, terminou_em_observado: observedAt };
    await expect(FinalizarMissaoUseCase.valida(params)).resolves.not.toThrow();
    const resultado = await FinalizarMissaoUseCase.executa(params);
    expect(resultado).toBeDefined();
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        status: MissaoStatus.FINALIZADA,
        terminou_em: eventInstant,
        terminou_em_observado: eventInstant,
        versao: 2,
      }),
      expect.objectContaining({ where: { id: 1, versao: 1 } })
    );
    expect(findMissaoSpy).toHaveBeenCalled();
  });

  it('deve lançar erro de conflito se a versão informada estiver desatualizada', async () => {
    const missaoMock = {
      id: 1,
      id_usuario: 10,
      status: MissaoStatus.EM_ANDAMENTO,
      versao: 5,
    };
    vi.spyOn(Missoes, 'findOne').mockResolvedValue(missaoMock as any);
    vi.spyOn(Lances, 'findOne').mockResolvedValue(null);
    vi.spyOn(Missoes, 'update').mockResolvedValue([0, []] as any);
    vi.spyOn(Missoes, 'findByPk').mockResolvedValue(missaoMock as any);

    const params = { ...paramsValidos };
    await expect(FinalizarMissaoUseCase.valida(params)).resolves.not.toThrow();
    await expect(FinalizarMissaoUseCase.executa(params)).rejects.toMatchObject({
      statusCode: httpStatus.CONFLICT,
      code: 'VERSION_MISMATCH',
    });
  });

  it('deve lançar erro se missão não existir', async () => {
    vi.spyOn(Missoes, 'findOne').mockResolvedValue(null);
    await expect(FinalizarMissaoUseCase.valida(paramsValidos)).rejects.toMatchObject({
      statusCode: 404, code: 'NOT_FOUND',
      message: 'Missão não encontrada ou não pertence ao usuário',
    });
  });

  it('deve lançar erro se missão não estiver em andamento', async () => {
    vi.spyOn(Missoes, 'findOne').mockResolvedValue({
      id: 1,
      id_usuario: 10,
      status: MissaoStatus.RASCUNHO,
    } as any);
    await expect(FinalizarMissaoUseCase.valida(paramsValidos)).rejects.toMatchObject({
      statusCode: 409, code: 'MISSION_NOT_IN_PROGRESS',
      message: 'Missão não está em andamento para ser finalizada',
    });
  });

  it('deve lançar erro se existirem lances em andamento', async () => {
    vi.spyOn(Missoes, 'findOne').mockResolvedValue({
      id: 1,
      id_usuario: 10,
      status: MissaoStatus.EM_ANDAMENTO,
    } as any);
    vi.spyOn(Lances, 'findOne').mockResolvedValue({ id: 5, status: LanceStatus.EM_ANDAMENTO } as any);
    await expect(FinalizarMissaoUseCase.valida(paramsValidos)).rejects.toMatchObject({
      statusCode: 409, code: 'OPEN_BIDS_EXIST',
      message: 'Existem lances em andamento. Recolha ou cancele todos antes de finalizar',
    });
  });

  it('rejeita término observado anterior ao início sem atualizar a missão', async () => {
    const missaoMock = {
      id: 1,
      id_usuario: 10,
      status: MissaoStatus.EM_ANDAMENTO,
      versao: 1,
      iniciou_em: new Date('2025-10-31T08:00:00.000Z'),
    };
    vi.spyOn(Missoes, 'findOne').mockResolvedValue(missaoMock as any);
    vi.spyOn(Lances, 'findOne').mockResolvedValue(null);
    const update = vi.spyOn(Missoes, 'update');
    const params = { ...paramsValidos, terminou_em_observado: '2025-10-31T07:00:00Z' };

    await FinalizarMissaoUseCase.valida(params);
    await expect(FinalizarMissaoUseCase.executa(params)).rejects.toMatchObject({
      statusCode: httpStatus.BAD_REQUEST,
      code: 'VALIDATION_ERROR',
    });
    expect(update).not.toHaveBeenCalled();
  });
});
