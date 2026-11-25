import { beforeEach, describe, expect, it, vi } from "vitest";

import MissoesHttpService from "../../src/services/http/missoes-http-service";
import LancesHttpService from "../../src/services/http/lances-http-service";
import UsuariosHttpService from "../../src/services/http/usuarios-http-service";
import MissoesServices from "../../src/services/missoes-services";
import LancesServices from "../../src/services/lances-services";
import UsuariosServices from "../../src/services/usuarios-services";

function criaRes() {
  const res: any = {
    statusCode: 200,
  };
  res.status = vi.fn(function (this: any, status: number) {
    this.statusCode = status;
    return this;
  });
  res.json = vi.fn(function (this: any) {
    return this;
  });
  res.send = vi.fn(function (this: any) {
    return this;
  });
  res.setHeader = vi.fn();
  return res;
}

function criaReq(extra: Record<string, any> = {}) {
  return {
    id_usuario: 10,
    auth: { id_usuario: 10, administracao: false },
    params: {},
    query: {},
    body: {},
    pagination: { limit: 10, offset: 0 },
    ...extra,
  } as any;
}

describe("http services — titularidade do fluxo pesqueiro", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("MissoesHttpService.create", () => {
    it("rejeita id_usuario de outro usuário com 403", async () => {
      const create = vi.spyOn(MissoesServices, "create");
      const res = criaRes();

      await new MissoesHttpService().create(
        criaReq({ body: { id_usuario: 99, id_embarcacao: 3 } }),
        res,
        vi.fn(),
      );

      expect(create).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("usa o usuário do token quando o corpo não traz id_usuario", async () => {
      const create = vi
        .spyOn(MissoesServices, "create")
        .mockResolvedValue({ response: { id: 1 }, replayed: false } as any);
      const res = criaRes();

      await new MissoesHttpService().create(
        criaReq({ body: { id_embarcacao: 3 } }),
        res,
        vi.fn(),
      );

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ id_usuario: 10, id_embarcacao: 3 }),
        undefined,
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe("listagens", () => {
    it("MissoesHttpService.list restringe ao usuário autenticado", async () => {
      const list = vi
        .spyOn(MissoesServices, "list")
        .mockResolvedValue({ missoes: [], total: 0 } as any);

      await new MissoesHttpService().list(criaReq(), criaRes(), vi.fn());

      expect(list).toHaveBeenCalledWith(
        expect.objectContaining({ id_usuario: 10 }),
      );
    });

    it("LancesHttpService.list restringe ao usuário autenticado", async () => {
      const list = vi
        .spyOn(LancesServices, "list")
        .mockResolvedValue({ lances: [], total: 0 } as any);

      await new LancesHttpService().list(criaReq(), criaRes(), vi.fn());

      expect(list).toHaveBeenCalledWith(
        expect.objectContaining({ id_usuario: 10 }),
      );
    });
  });

  describe("UsuariosHttpService.delete", () => {
    it("nega a exclusão da conta de outro usuário com 403", async () => {
      const remover = vi.spyOn(UsuariosServices, "delete");
      const res = criaRes();

      await new UsuariosHttpService().delete(
        criaReq({ params: { id: "99" } }),
        res,
        vi.fn(),
      );

      expect(remover).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("permite excluir a própria conta", async () => {
      const remover = vi
        .spyOn(UsuariosServices, "delete")
        .mockResolvedValue(undefined as any);
      const res = criaRes();

      await new UsuariosHttpService().delete(
        criaReq({ params: { id: "10" } }),
        res,
        vi.fn(),
      );

      expect(remover).toHaveBeenCalledWith(10);
      expect(res.status).toHaveBeenCalledWith(204);
    });
  });
});
