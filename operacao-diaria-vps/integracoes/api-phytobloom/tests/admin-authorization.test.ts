import { describe, expect, it, vi } from "vitest";

import http_status from "../src/consts/http-status-enum";
import requireAdmin from "../src/middlewares/require-admin";
import requireOwnerOrAdmin from "../src/middlewares/require-owner-or-admin";

function responseMock() {
  const res: any = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}

// ---------------------------------------------------------------------------
// requireAdmin
// ---------------------------------------------------------------------------

describe("requireAdmin", () => {
  it("bloqueia usuario comum com 403", () => {
    const req: any = { is_admin: false };
    const res = responseMock();
    const next = vi.fn();

    requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(http_status.FORBIDDEN);
    expect(next).not.toHaveBeenCalled();
  });

  it("permite admin prosseguir", () => {
    const req: any = { is_admin: true };
    const res = responseMock();
    const next = vi.fn();

    requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// requireOwnerOrAdmin
// ---------------------------------------------------------------------------

describe("requireOwnerOrAdmin", () => {
  it("bloqueia usuario tentando acessar outro :id com 403", () => {
    const req: any = { is_admin: false, id_usuario: 1, params: { id: "2" } };
    const res = responseMock();
    const next = vi.fn();

    requireOwnerOrAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(http_status.FORBIDDEN);
    expect(next).not.toHaveBeenCalled();
  });

  it("permite usuario acessar o proprio :id", () => {
    const req: any = { is_admin: false, id_usuario: 5, params: { id: "5" } };
    const res = responseMock();
    const next = vi.fn();

    requireOwnerOrAdmin(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("permite admin acessar qualquer :id", () => {
    const req: any = { is_admin: true, id_usuario: 1, params: { id: "99" } };
    const res = responseMock();
    const next = vi.fn();

    requireOwnerOrAdmin(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("bloqueia usuario comum tentando listar todos (sem :id no params)", () => {
    // Sem params.id: targetId vira NaN, portanto !== id_usuario
    const req: any = { is_admin: false, id_usuario: 1, params: {} };
    const res = responseMock();
    const next = vi.fn();

    requireOwnerOrAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(http_status.FORBIDDEN);
    expect(next).not.toHaveBeenCalled();
  });
});
