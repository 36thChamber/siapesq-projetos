import { describe, it, expect, vi, beforeEach } from "vitest";
import CriarUsuarioAtivoUseCase from "../../src/use-cases/usuariosAtivos/criar-usuario-ativo";
import Usuarios from "../../src/models/Usuarios";
import UsuariosAtivos from "../../src/models/UsuariosAtivos";

describe("CriarUsuarioAtivoUseCase", () => {
  let bodyValido: any;

  beforeEach(() => {
    vi.clearAllMocks();
    bodyValido = {
      id_usuario: 1,
      tipo_assinatura: "Premium",
      ativo: true,
      data_criacao: new Date(),
      data_fim: new Date("2027-01-01"),
    };
  });

  it("deve validar um body válido", async () => {
    await expect(CriarUsuarioAtivoUseCase.valida(bodyValido)).resolves.not.toThrow();
  });

  it("deve retornar erro quando id_usuario não for informado", async () => {
    const body = { ...bodyValido, id_usuario: undefined };
    await expect(CriarUsuarioAtivoUseCase.valida(body as any)).rejects.toMatchObject({
      statusCode: 400, code: "VALIDATION_ERROR", message: "id_usuario inválido",
    });
  });

  it("deve retornar erro quando usuário não existir", async () => {
    const findSpy = vi.spyOn(Usuarios, "findByPk").mockResolvedValue(null);
    await expect(CriarUsuarioAtivoUseCase.executa(bodyValido)).rejects.toMatchObject({
      statusCode: 404, code: "NOT_FOUND",
      message: `Usuário ${bodyValido.id_usuario} não foi encontrado`,
    });
    expect(findSpy).toHaveBeenCalledWith(bodyValido.id_usuario);
  });

  it("deve retornar erro quando usuário já possuir registro ativo", async () => {
    const findSpy = vi.spyOn(Usuarios, "findByPk").mockResolvedValue({ id: 1 } as any);
    const findOneSpy = vi.spyOn(UsuariosAtivos, "findOne").mockResolvedValue({ id: 10 } as any);
    await expect(CriarUsuarioAtivoUseCase.executa(bodyValido)).rejects.toMatchObject({
      statusCode: 409, code: "DUPLICATE_ENTRY",
      message: `Usuário ${bodyValido.id_usuario} já possui registro ativo`,
    });
    expect(findSpy).toHaveBeenCalled();
    expect(findOneSpy).toHaveBeenCalled();
  });

  it("deve criar um usuário ativo com sucesso", async () => {
    const findSpy = vi.spyOn(Usuarios, "findByPk").mockResolvedValue({ id: 1 } as any);
    const findOneSpy = vi.spyOn(UsuariosAtivos, "findOne").mockResolvedValue(null);
    const createSpy = vi.spyOn(UsuariosAtivos, "create").mockResolvedValue({
      id: 10,
      id_usuario: 1,
      tipo_assinatura: "Premium",
      ativo: true,
      data_criacao: bodyValido.data_criacao,
      data_fim: bodyValido.data_fim,
    } as any);

    const resultado = await CriarUsuarioAtivoUseCase.executa(bodyValido);
    expect(resultado).toEqual({
      id: 10,
      id_usuario: 1,
      tipo_assinatura: "Premium",
      ativo: true,
      data_criacao: bodyValido.data_criacao,
      data_fim: bodyValido.data_fim,
    });
    expect(findSpy).toHaveBeenCalled();
    expect(findOneSpy).toHaveBeenCalled();
    expect(createSpy).toHaveBeenCalledWith({
      id_usuario: 1,
      tipo_assinatura: "Premium",
      ativo: true,
      data_criacao: bodyValido.data_criacao,
      data_fim: bodyValido.data_fim,
    });
  });
});
