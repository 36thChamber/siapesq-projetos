import { NextFunction } from "express";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../middlewares/checa-token", () => ({
  default: function checa_token(_req: unknown, _res: unknown, next: NextFunction) {
    next();
  },
}));

vi.mock("../../middlewares/checa-admin", () => ({
  default: function checa_admin(_req: unknown, _res: unknown, next: NextFunction) {
    next();
  },
}));

vi.mock("../../middlewares/checa-quota-especie", () => ({
  default: () =>
    function checa_quota_especie(_req: unknown, _res: unknown, next: NextFunction) {
      next();
    },
}));

vi.mock("../../middlewares/checa-quota-informacao", () => ({
  default: () =>
    function checa_quota_informacao(_req: unknown, _res: unknown, next: NextFunction) {
      next();
    },
}));

vi.mock("../../controllers/admin-controller", () => ({
  default: class AdminController {
    aprovar_usuario = vi.fn();
    buscar_usuario = vi.fn();
    buscar_especie = vi.fn();
    dados_plataforma = vi.fn();
  },
}));

vi.mock("../../controllers/planos-controller", () => ({
  default: class PlanosController {
    get = vi.fn();
    list = vi.fn();
    listAtivos = vi.fn();
    listInativos = vi.fn();
    create = vi.fn();
    update = vi.fn();
    delete = vi.fn();
    ativar = vi.fn();
    desativar = vi.fn();
    restaurar = vi.fn();
  },
}));

vi.mock("../../controllers/especies-controller", () => ({
  default: class EspeciesController {
    list = vi.fn();
    get = vi.fn();
    create = vi.fn();
  },
}));

vi.mock("../../controllers/grupoEspecies-controller", () => ({
  default: class GruposEspeciesController {
    listar = vi.fn();
    listarEspecies = vi.fn();
    buscarPorId = vi.fn();
    criar = vi.fn();
  },
}));

vi.mock("../../controllers/informacoesEspecies-controller", () => ({
  default: class InformacoesEspeciesController {
    list = vi.fn();
    get = vi.fn();
    create = vi.fn();
    delete = vi.fn();
  },
}));

import adminRouter from "../admin-routes";
import especiesRouter from "../especies-routes";
import gruposEspeciesRouter from "../grupo-especies-routes";
import informacoesEspeciesRouter from "../informacoes-especies-routes";
import planosRouter from "../planos-routes";

interface RouterLayer {
  handle: { name: string };
  route?: {
    methods: Record<string, boolean>;
    path: string;
    stack: RouterLayer[];
  };
}

function middlewaresDaRota(router: any, method: string, path: string) {
  const layer = (router.stack as RouterLayer[]).find(
    (item) => item.route?.path === path && item.route.methods[method],
  );

  if (!layer?.route) {
    throw new Error(`Rota ${method.toUpperCase()} ${path} não encontrada`);
  }

  return layer.route.stack.map((item) => item.handle.name);
}

describe("RBAC nas rotas administrativas", () => {
  it("aplica autenticação e autorização administrativa a todo o router /admin", () => {
    const middlewaresGlobais = (adminRouter.stack as RouterLayer[])
      .filter((layer) => !layer.route)
      .map((layer) => layer.handle.name);

    expect(middlewaresGlobais).toEqual(["checa_token", "checa_admin"]);
  });
});

describe("RBAC nas rotas de planos", () => {
  const rotasDeEscrita = [
    ["post", "/"],
    ["put", "/:id"],
    ["patch", "/:id/ativar"],
    ["patch", "/:id/desativar"],
    ["delete", "/:id"],
    ["patch", "/:id/restaurar"],
  ];
  const rotasDeLeitura = [
    ["get", "/", false],
    ["get", "/ativos", false],
    ["get", "/inativos", true],
    ["get", "/:id", false],
  ] as const;

  it("protege a listagem de planos inativos", () => {
    expect(middlewaresDaRota(planosRouter, "get", "/inativos")[0]).toBe("checa_token");
  });

  it.each(rotasDeEscrita)(
    "protege %s %s com autenticação e papel administrativo",
    (method, path) => {
      expect(middlewaresDaRota(planosRouter, method, path).slice(0, 2)).toEqual([
        "checa_token",
        "checa_admin",
      ]);
    },
  );

  it.each(rotasDeLeitura)(
    "aplica autenticação de leitura em %s %s quando exigida",
    (method, path, requerToken) => {
      const middlewares = middlewaresDaRota(planosRouter, method, path);
      expect(middlewares.includes("checa_token")).toBe(requerToken);
      expect(middlewares).not.toContain("checa_admin");
    },
  );
});

describe("RBAC nas rotas de espécies", () => {
  it("GET / só exige autenticação (catálogo)", () => {
    const middlewares = middlewaresDaRota(especiesRouter, "get", "/");

    expect(middlewares[0]).toBe("checa_token");
    expect(middlewares).not.toContain("checa_quota_especie");
  });

  it("POST / exige autenticação e admin", () => {
    expect(middlewaresDaRota(especiesRouter, "post", "/").slice(0, 2)).toEqual([
      "checa_token",
      "checa_admin",
    ]);
  });

  it("GET /:id exige autenticação e quota", () => {
    expect(middlewaresDaRota(especiesRouter, "get", "/:id").slice(0, 2)).toEqual([
      "checa_token",
      "checa_quota_especie",
    ]);
  });
});

describe("RBAC nas rotas de grupos de espécies", () => {
  it("GET / exige autenticação", () => {
    expect(middlewaresDaRota(gruposEspeciesRouter, "get", "/")[0]).toBe("checa_token");
  });

  it("POST / exige autenticação e admin", () => {
    expect(
      middlewaresDaRota(gruposEspeciesRouter, "post", "/").slice(0, 2),
    ).toEqual(["checa_token", "checa_admin"]);
  });

  it("GET /:id_gruposespecies/especies exige autenticação", () => {
    expect(
      middlewaresDaRota(
        gruposEspeciesRouter,
        "get",
        "/:id_gruposespecies/especies",
      )[0],
    ).toBe("checa_token");
  });

  it("GET /:id_gruposespecies exige autenticação", () => {
    expect(
      middlewaresDaRota(gruposEspeciesRouter, "get", "/:id_gruposespecies")[0],
    ).toBe("checa_token");
  });
});

describe("RBAC e quota nas rotas de informações de espécies", () => {
  it("GET / exige autenticação", () => {
    expect(middlewaresDaRota(informacoesEspeciesRouter, "get", "/")[0]).toBe(
      "checa_token",
    );
  });

  it("GET /:id exige autenticação e quota", () => {
    expect(
      middlewaresDaRota(informacoesEspeciesRouter, "get", "/:id").slice(0, 2),
    ).toEqual(["checa_token", "checa_quota_informacao"]);
  });

  it("POST / exige autenticação e admin", () => {
    expect(
      middlewaresDaRota(informacoesEspeciesRouter, "post", "/").slice(0, 2),
    ).toEqual(["checa_token", "checa_admin"]);
  });

  it("DELETE /:id exige autenticação e admin", () => {
    expect(
      middlewaresDaRota(informacoesEspeciesRouter, "delete", "/:id").slice(0, 2),
    ).toEqual(["checa_token", "checa_admin"]);
  });
});
