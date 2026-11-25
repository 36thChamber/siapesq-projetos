import { describe, it, expect, vi, beforeEach } from 'vitest';
import DeletarUsuarioAtivoUseCase from '../../src/use-cases/usuariosAtivos/deletar-usuario-ativo';
import UsuariosAtivos from '../../src/models/UsuariosAtivos';

describe('DeletarUsuarioAtivoUseCase', () => {
  beforeEach((): void => {
    vi.clearAllMocks();
  });

  it('deve validar body válido', async () => {
    await expect(DeletarUsuarioAtivoUseCase.valida({ id: 1 })).resolves.not.toThrow();
  });

  it('deve rejeitar id inválido', async () => {
    await expect(DeletarUsuarioAtivoUseCase.valida({ id: undefined as any })).rejects.toMatchObject({
      statusCode: 400, code: 'VALIDATION_ERROR', message: 'id inválido',
    });
  });

  it('deve deletar usuário ativo com sucesso', async () => {
    const destroyMock = vi.fn().mockResolvedValue(true);
    const findByPkSpy = vi.spyOn(UsuariosAtivos, 'findByPk').mockResolvedValue({
      id: 1,
      id_usuario: 1,
      ativo: true,
      tipo_assinatura: 'Premium',
      data_criacao: new Date(),
      data_fim: new Date(),
      destroy: destroyMock,
    } as any);
    const resultado = await DeletarUsuarioAtivoUseCase.executa({ id: 1 });
    expect(destroyMock).toHaveBeenCalled();
    expect(resultado).toMatchObject({ id: 1, id_usuario: 1 });
    expect(findByPkSpy).toHaveBeenCalledWith(1);
  });

  it('deve retornar erro quando usuário ativo não existir', async () => {
    vi.spyOn(UsuariosAtivos, 'findByPk').mockResolvedValue(null);
    await expect(DeletarUsuarioAtivoUseCase.executa({ id: 1 })).rejects.toMatchObject({
      statusCode: 404, code: 'NOT_FOUND', message: 'Usuário ativo 1 não encontrado',
    });
  });
});
