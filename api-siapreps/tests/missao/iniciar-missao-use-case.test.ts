import { describe, it, expect, vi, beforeEach } from 'vitest';
import httpStatus from '../../src/consts/http-status-enum';
import IniciarMissaoUseCase from '../../src/use-cases/missoes/iniciar-missao';
import Missoes from '../../src/models/Missoes';
import Embarcacoes from '../../src/models/Embarcacoes';
import { MissaoStatus } from '../../src/models/enums/missao-status.enum';

describe('IniciarMissaoUseCase', () => {
  beforeEach((): void => {
    vi.clearAllMocks();
  });

  const paramsValidos = { id: 1, usuarioId: 10, versaoEsperada: 1 };

  it('deve iniciar uma missão com sucesso', async () => {
    const observedAt = '2025-10-31T06:00:00-03:00';
    const eventInstant = new Date('2025-10-31T09:00:00.000Z');
    const missaoMock = {
      id: 1,
      id_usuario: 10,
      id_embarcacao: 5,
      status: MissaoStatus.RASCUNHO,
      versao: 1,
      embarcacao: { id: 5, ativo: true },
      update: vi.fn().mockResolvedValue([1, [{}]]),
    };
    const findSpy = vi
      .spyOn(Missoes, 'findOne')
      .mockResolvedValueOnce(missaoMock as any)
      .mockResolvedValueOnce(null);
    const updateSpy = vi.spyOn(Missoes, 'update').mockResolvedValue([1, [missaoMock]] as any);

    const params = { ...paramsValidos, iniciou_em_observado: observedAt };
    await expect(IniciarMissaoUseCase.valida(params)).resolves.not.toThrow();
    const resultado = await IniciarMissaoUseCase.executa(params);
    expect(resultado).toBeDefined();
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        status: MissaoStatus.EM_ANDAMENTO,
        iniciou_em: eventInstant,
        iniciou_em_observado: eventInstant,
        versao: 2,
      }),
      expect.objectContaining({ where: { id: 1, versao: 1 } })
    );
    expect(findSpy).toHaveBeenCalled();
  });

  it('deve lançar erro de conflito se a versão informada estiver desatualizada', async () => {
    const missaoMock = {
      id: 1,
      id_usuario: 10,
      id_embarcacao: 5,
      status: MissaoStatus.RASCUNHO,
      versao: 3,
      embarcacao: { id: 5, ativo: true },
    };
    vi.spyOn(Missoes, 'findOne')
      .mockResolvedValueOnce(missaoMock as any)
      .mockResolvedValueOnce(null);
    vi.spyOn(Missoes, 'update').mockResolvedValue([0, []] as any);
    vi.spyOn(Missoes, 'findByPk').mockResolvedValue(missaoMock as any);

    const params = { ...paramsValidos };
    await expect(IniciarMissaoUseCase.valida(params)).resolves.not.toThrow();
    await expect(IniciarMissaoUseCase.executa(params)).rejects.toMatchObject({
      statusCode: httpStatus.CONFLICT,
      code: 'VERSION_MISMATCH',
    });
  });

  it('deve lançar erro se versaoEsperada não for informada', async () => {
    const { versaoEsperada, ...semVersao } = paramsValidos;
    await expect(IniciarMissaoUseCase.valida(semVersao as any)).rejects.toMatchObject({
      statusCode: httpStatus.BAD_REQUEST,
    });
  });

  it('deve lançar erro se missão não existir ou não pertencer ao usuário', async () => {
    vi.spyOn(Missoes, 'findOne').mockResolvedValue(null);
    await expect(IniciarMissaoUseCase.valida(paramsValidos)).rejects.toMatchObject({
      statusCode: 404, code: 'NOT_FOUND',
      message: 'Missão não encontrada ou não pertence ao usuário',
    });
  });

  it('deve lançar erro se missão não estiver em rascunho', async () => {
    vi.spyOn(Missoes, 'findOne').mockResolvedValue({
      id: 1,
      id_usuario: 10,
      status: MissaoStatus.EM_ANDAMENTO,
      embarcacao: { ativo: true },
    } as any);
    await expect(IniciarMissaoUseCase.valida(paramsValidos)).rejects.toMatchObject({
      statusCode: 409,
      code: 'MISSION_NOT_IN_DRAFT',
      message: 'Missão não está em rascunho para ser iniciada',
    });
  });

  it('deve lançar erro se embarcação estiver inativa', async () => {
    vi.spyOn(Missoes, 'findOne').mockResolvedValue({
      id: 1,
      id_usuario: 10,
      status: MissaoStatus.RASCUNHO,
      embarcacao: { ativo: false },
    } as any);
    await expect(IniciarMissaoUseCase.valida(paramsValidos)).rejects.toMatchObject({
      statusCode: 409, code: 'VESSEL_NOT_ACTIVE',
      message: 'Embarcação inativa ou não encontrada',
    });
  });

  it('deve lançar erro se já houver missão em andamento para a mesma embarcação', async () => {
    const missaoMock = {
      id: 1,
      id_usuario: 10,
      id_embarcacao: 5,
      status: MissaoStatus.RASCUNHO,
      embarcacao: { ativo: true },
    };
    vi.spyOn(Missoes, 'findOne')
      .mockResolvedValueOnce(missaoMock as any)
      .mockResolvedValueOnce({ id: 2, status: MissaoStatus.EM_ANDAMENTO } as any);
    await expect(IniciarMissaoUseCase.valida(paramsValidos)).rejects.toMatchObject({
      statusCode: 409, code: 'CONCURRENT_MISSION_ACTIVE',
      message: 'Já existe uma missão em andamento para esta embarcação',
    });
  });
});
