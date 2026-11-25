import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import express, { type Request, type Response } from "express";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("../../services/especies-services", () => ({
  default: {
    listar: vi.fn(async () => ({
      especies: [
        {
          id_especie: "e1",
          nome: "Onça",
          nome_cientifico: "Panthera onca",
          pesquisador: "X",
        },
      ],
      total: 1,
    })),
    buscarPorId: vi.fn(),
    criar: vi.fn(),
  },
}));
vi.mock("../../middlewares/checa-token", () => ({
  default: (_r: Request, _s: Response, n: any) => n(),
}));
vi.mock("../../middlewares/checa-admin", () => ({
  default: (_r: Request, _s: Response, n: any) => n(),
}));
vi.mock("../../middlewares/checa-quota-especie", () => ({
  default: () => (_r: Request, _s: Response, n: any) => n(),
}));

import especiesRouter from "../especies-routes";

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  app.use("/especies", especiesRouter);
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
});

describe("GET /especies", () => {
  it("não devolve descricao, informacoesEspecies nem auditoria", async () => {
    const resposta = await fetch(`${baseUrl}/especies`);
    const corpo = await resposta.json();
    const serializado = JSON.stringify(corpo);

    expect(resposta.status).toBe(200);
    expect(serializado).not.toMatch(
      /descricao|informacoesEspecies|criado_em|atualizado_em|deletado_em/,
    );
  });
});