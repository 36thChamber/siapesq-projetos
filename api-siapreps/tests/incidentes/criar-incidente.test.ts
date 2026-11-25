import { describe, it, expect, vi, beforeEach } from 'vitest';
import CriarIncidenteUseCase from '../../src/use-cases/incidentes/criar-incidente';
import Incidentes from '../../src/models/Incidentes';
import Missoes from '../../src/models/Missoes';
import Lances from '../../src/models/Lances';
import Especies from '../../src/models/Especies';
import { GrupoIncidente } from '../../src/models/Incidentes';

describe('CriarIncidenteUseCase', () => {
  beforeEach((): void => {
    vi.clearAllMocks();
  });

  const dadosValidos = {
    id_lance: 5,
    id_especie: 9,
    grupo: GrupoIncidente.AVE,
    quantidade_vivos: 1,
    quantidade_mortos: 0,
    observacao: 'Ave encontrada no lance',
  };
  const paramsValidos = { missaoId: 1, usuarioId: 10, dados: dadosValidos };

  it('deve criar um incidente com sucesso', async () => {
    vi.spyOn(Missoes, 'findOne').mockResolvedValue({ id: 1, id_usuario: 10 } as any);
    vi.spyOn(Lances, 'findOne').mockResolvedValue({ id: 5, id_missao: 1, ativo: true } as any);
    vi.spyOn(Especies, 'findOne').mockResolvedValue({ id: 9, ativo: true } as any);
    const createSpy = vi.spyOn(Incidentes, 'create').mockResolvedValue({ id: 99, ...dadosValidos } as any);
    vi.spyOn(Missoes, 'findByPk').mockResolvedValue({ id: 1, id_usuario: 10 } as any);

    await expect(CriarIncidenteUseCase.valida(paramsValidos)).resolves.not.toThrow();
    const resultado = await CriarIncidenteUseCase.executa({
      missaoId: paramsValidos.missaoId,
      dados: paramsValidos.dados,
    });
    expect(resultado.response).toBeDefined();
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id_missao: 1,
        id_lance: 5,
        id_especie: 9,
        grupo: GrupoIncidente.AVE,
        quantidade_vivos: 1,
      }),
      { transaction: undefined },
    );
  });

  it('deve lançar erro se missão não existir ou não pertencer ao usuário', async () => {
    vi.spyOn(Missoes, 'findOne').mockResolvedValue(null);
    await expect(CriarIncidenteUseCase.valida(paramsValidos)).rejects.toMatchObject({
      statusCode: 404, code: 'NOT_FOUND',
      message: 'Missão não encontrada ou não pertence ao usuário',
    });
  });

  it('deve lançar erro se o lance informado não pertencer à missão', async () => {
    const paramsComLance = {
      ...paramsValidos,
      dados: { ...dadosValidos, id_lance: 5 },
    };
    vi.spyOn(Missoes, 'findOne').mockResolvedValue({ id: 1, id_usuario: 10 } as any);
    vi.spyOn(Lances, 'findOne').mockResolvedValue(null);
    await expect(CriarIncidenteUseCase.valida(paramsComLance)).rejects.toMatchObject({
      statusCode: 404, code: 'NOT_FOUND',
      message: 'Lance não encontrado ou não pertence à missão',
    });
  });

  it('deve rejeitar quantidade negativa', async () => {
    const dadosInvalidos = { ...dadosValidos, quantidade_vivos: -1 };
    const paramsInvalidos = { ...paramsValidos, dados: dadosInvalidos };
    vi.spyOn(Missoes, 'findOne').mockResolvedValue({ id: 1, id_usuario: 10 } as any);
    await expect(CriarIncidenteUseCase.valida(paramsInvalidos)).rejects.toMatchObject({
      statusCode: 400, code: 'VALIDATION_ERROR',
      message: expect.stringContaining('quantidade_vivos'),
    });
  });

  it('deve rejeitar espécie inexistente', async () => {
    vi.spyOn(Missoes, 'findOne').mockResolvedValue({ id: 1, id_usuario: 10 } as any);
    vi.spyOn(Lances, 'findOne').mockResolvedValue({ id: 5, id_missao: 1, ativo: true } as any);
    vi.spyOn(Especies, 'findOne').mockResolvedValue(null);
    await expect(CriarIncidenteUseCase.valida(paramsValidos)).rejects.toMatchObject({
      statusCode: 404, code: 'NOT_FOUND', message: 'Espécie não encontrada',
    });
  });
});
