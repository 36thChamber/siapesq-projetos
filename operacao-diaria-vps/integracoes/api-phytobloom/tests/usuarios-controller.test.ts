import { afterEach, describe, expect, it, vi } from "vitest";

import http_status from "../src/consts/http-status-enum";
import UsuariosController from "../src/controllers/usuarios-controller";
import UsuariosService from "../src/services/usuarios-services";

function responseMock() {
  const res: any = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("UsuariosController.update", () => {
  it("bloqueia usuario comum alterando ativo ou user_verify", async () => {
    const controller = new UsuariosController();
    const updateSpy = vi.spyOn(UsuariosService, "update");
    const req: any = {
      is_admin: false,
      params: { id: "1" },
      body: { ativo: true, user_verify: true },
    };
    const res = responseMock();

    await controller.update(req, res);

    expect(res.status).toHaveBeenCalledWith(http_status.FORBIDDEN);
    expect(res.json).toHaveBeenCalledWith({
      message: "Apenas administradores podem alterar ativo ou user_verify",
      status: http_status.FORBIDDEN,
    });
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("permite admin alterar ativo e user_verify", async () => {
    const controller = new UsuariosController();
    const usuarioAtualizado = {
      id: 1,
      ativo: true,
      user_verify: true,
    };
    const updateSpy = vi
      .spyOn(UsuariosService, "update")
      .mockResolvedValue(usuarioAtualizado as any);
    const req: any = {
      is_admin: true,
      params: { id: "1" },
      body: { ativo: true, user_verify: true },
    };
    const res = responseMock();

    await controller.update(req, res);

    expect(updateSpy).toHaveBeenCalledWith({ ativo: true, user_verify: true }, 1);
    expect(res.status).toHaveBeenCalledWith(http_status.OK);
    expect(res.json).toHaveBeenCalledWith(usuarioAtualizado);
  });
});
