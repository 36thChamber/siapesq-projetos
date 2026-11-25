import { describe, it, expect, vi, beforeEach } from 'vitest';
import ListarUsuariosAtivosUseCase from '../../src/use-cases/usuariosAtivos/buscar-usuarios-ativos';
import UsuariosAtivos from '../../src/models/UsuariosAtivos';

describe('ListarUsuariosAtivosUseCase', () => {
  beforeEach((): void => {
    vi.clearAllMocks();
  });

  it('deve validar query válida', async () => {
    await expect(ListarUsuariosAtivosUseCase.valida({ limit: 10, offset: 0 })).resolves.not.toThrow();
  });

  it('deve rejeitar limit inválido', async () => {
    await expect(ListarUsuariosAtivosUseCase.valida({ limit: 'abc' as any, offset: 0 })).rejects.toMatchObject({
      statusCode: 400, code: 'VALIDATION_ERROR', message: 'limit inválido',
    });
  });

  it('deve listar usuários ativos', async () => {
    vi.spyOn(UsuariosAtivos, 'findAndCountAll').mockResolvedValue({
      rows: [{ id: 1, id_usuario: 10 }],
      count: 1,
    } as any);
    const resultado = await ListarUsuariosAtivosUseCase.executa({ limit: 10, offset: 0 });
    expect(resultado).toHaveProperty('total', 1);
  });
});
