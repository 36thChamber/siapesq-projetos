import { describe, it, expect, vi, beforeEach } from 'vitest';
import httpStatus from '../../src/consts/http-status-enum';
import AtualizarIncidenteUseCase from '../../src/use-cases/incidentes/atualizar-incidente';
import Incidentes from '../../src/models/Incidentes';
import { GrupoIncidente } from '../../src/models/Incidentes';

describe('AtualizarIncidenteUseCase', () => {
  beforeEach((): void => {
    vi.clearAllMocks();
  });

  const paramsValidos = {
    id: 1,
    usuarioId: 10,
    versaoEsperada: 1,
    dados: {
      grupo: GrupoIncidente.TARTARUGA,
      quantidade_vivos: 2,
    },
  };

  it('deve atualizar um incidente com sucesso', async () => {
    const incidenteMock = {
      id: 1,
      id_missao: 5,
      versao: 1,
      missao: { id: 5, id_usuario: 10 },
      update: vi.fn().mockResolvedValue([1, [{}]]),
    };
    const findSpy = vi.spyOn(Incidentes, 'findOne').mockResolvedValue(incidenteMock as any);
    const updateSpy = vi.spyOn(Incidentes, 'update').mockResolvedValue([1, [incidenteMock]] as any);

    const params = { ...paramsValidos };
    await expect(AtualizarIncidenteUseCase.valida(params)).resolves.not.toThrow();
    const resultado = await AtualizarIncidenteUseCase.executa(params as any);
    expect(resultado).toBeDefined();
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        grupo: GrupoIncidente.TARTARUGA,
        quantidade_vivos: 2,
        atualizado_em: expect.any(Date),
        versao: 2,
      }),
      expect.objectContaining({ where: { id: 1, versao: 1 } })
    );
    expect(findSpy).toHaveBeenCalled();
  });

  it('deve lançar erro de conflito se a versão informada estiver desatualizada', async () => {
    const incidenteMock = {
      id: 1,
      id_missao: 5,
      versao: 7,
      missao: { id: 5, id_usuario: 10 },
    };
    vi.spyOn(Incidentes, 'findOne').mockResolvedValue(incidenteMock as any);
    vi.spyOn(Incidentes, 'update').mockResolvedValue([0, []] as any);
    vi.spyOn(Incidentes, 'findByPk').mockResolvedValue(incidenteMock as any);

    const params = { ...paramsValidos };
    await expect(AtualizarIncidenteUseCase.valida(params)).resolves.not.toThrow();
    await expect(
      AtualizarIncidenteUseCase.executa(params as any),
    ).rejects.toMatchObject({
      statusCode: httpStatus.CONFLICT,
      code: 'VERSION_MISMATCH',
    });
  });

  it('deve lançar erro se incidente não existir ou não pertencer ao usuário', async () => {
    vi.spyOn(Incidentes, 'findOne').mockResolvedValue(null);
    await expect(AtualizarIncidenteUseCase.valida(paramsValidos)).rejects.toMatchObject({
      statusCode: 404, code: 'NOT_FOUND',
      message: 'Incidente não encontrado ou não pertence ao usuário',
    });
  });

  it('deve lançar erro se corpo estiver vazio', async () => {
    const paramsVazio = { ...paramsValidos, dados: {} };
    await expect(AtualizarIncidenteUseCase.valida(paramsVazio)).rejects.toMatchObject({
      statusCode: 400, code: 'VALIDATION_ERROR',
      message: expect.stringContaining('must have at least 1 key'),
    });
  });

  it('deve rejeitar campo que não pertence ao contrato de atualização', async () => {
    const paramsComCampoInvalido = {
      ...paramsValidos,
      dados: { latitude: 200 },
    };
    await expect(AtualizarIncidenteUseCase.valida(paramsComCampoInvalido as any)).rejects.toMatchObject({
      statusCode: 400, code: 'VALIDATION_ERROR',
      message: expect.stringContaining('latitude'),
    });
  });
});
