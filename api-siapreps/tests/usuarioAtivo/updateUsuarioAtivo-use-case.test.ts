import { describe, it, expect, vi, beforeEach } from 'vitest';
import AtualizarUsuarioAtivoUseCase from '../../src/use-cases/usuariosAtivos/atualizar-usuario-ativo';
import UsuariosAtivos from '../../src/models/UsuariosAtivos';

describe('AtualizarUsuarioAtivoUseCase', () => {
  const bodyValido = { id_usuario: 1, ativo: true, tipo_assinatura: 'Premium', data_criacao: new Date(), data_fim: new Date() };

  beforeEach((): void => {
    vi.clearAllMocks();
  });

  it('deve validar body válido', async () => {
    await expect(AtualizarUsuarioAtivoUseCase.valida(bodyValido)).resolves.not.toThrow();
  });

  it('deve rejeitar quando id_usuario não for informado', async () => {
    await expect(AtualizarUsuarioAtivoUseCase.valida({ ...bodyValido, id_usuario: undefined as any })).rejects.toMatchObject({
      statusCode: 400, code: 'VALIDATION_ERROR', message: 'ID do usuário é obrigatório',
    });
  });

  it('deve retornar erro quando usuário ativo não existir', async () => {
    vi.spyOn(UsuariosAtivos, 'findOne').mockResolvedValue(null);
    await expect(AtualizarUsuarioAtivoUseCase.executa(bodyValido)).rejects.toMatchObject({
      statusCode: 404, code: 'NOT_FOUND', message: 'Usuário ativo do usuário 1 não encontrado',
    });
  });

  it('deve atualizar usuário ativo com sucesso', async () => {
    const updateMock = vi.fn().mockResolvedValue(true);
    const findOneSpy = vi.spyOn(UsuariosAtivos, 'findOne').mockResolvedValue({
      id: 10,
      id_usuario: 1,
      ativo: true,
      tipo_assinatura: 'Premium',
      data_criacao: new Date(),
      data_fim: new Date(),
      update: updateMock,
    } as any);
    const resultado = await AtualizarUsuarioAtivoUseCase.executa(bodyValido);
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ tipo_assinatura: 'Premium' }));
    expect(resultado).toMatchObject({ id_usuario: 1 });
    expect(findOneSpy).toHaveBeenCalled();
  });
});
