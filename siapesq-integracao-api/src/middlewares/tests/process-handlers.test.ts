import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";

import {
  createGracefulShutdown,
  registerProcessHandlers,
  runBootstrap,
} from "../../process-handlers";

describe("process handlers e encerramento controlado", () => {
  it("fecha o servidor e o ORM antes de definir o codigo de saida", async () => {
    const events: string[] = [];
    const server = {
      close: (callback: (error?: Error) => void) => {
        events.push("server");
        callback();
      },
    };
    const orm = {
      close: vi.fn(async () => {
        events.push("orm");
      }),
    };
    const setExitCode = vi.fn((code: number) => events.push(`exitCode:${code}`));
    const exit = vi.fn();
    const logger = { fatal: vi.fn() };
    const shutdown = createGracefulShutdown(
      () => ({ server, orm }),
      { logger, exit, setExitCode },
    );

    await shutdown("uncaughtException", new Error("falha fatal"));

    expect(events).toEqual(["server", "orm", "exitCode:1"]);
    expect(logger.fatal).toHaveBeenCalledWith(
      expect.objectContaining({ event: "uncaughtException" }),
      "Falha fatal da aplicacao",
    );
    expect(exit).not.toHaveBeenCalled();
  });

  it("executa o shutdown apenas uma vez para falhas concorrentes", async () => {
    const close = vi.fn((callback: (error?: Error) => void) => callback());
    const shutdown = createGracefulShutdown(
      () => ({ server: { close } }),
      {
        logger: { fatal: vi.fn() },
        exit: vi.fn(),
        setExitCode: vi.fn(),
      },
    );

    await Promise.all([
      shutdown("unhandledRejection", new Error("primeira")),
      shutdown("uncaughtException", new Error("segunda")),
    ]);

    expect(close).toHaveBeenCalledTimes(1);
  });

  it("registra os handlers reais de rejeicao e excecao", async () => {
    const events = new EventEmitter();
    const shutdown = vi.fn(async () => undefined);
    const unregister = registerProcessHandlers(events, shutdown);
    const rejection = new Error("promise rejeitada");
    const exception = new Error("excecao nao capturada");

    events.emit("unhandledRejection", rejection, Promise.resolve());
    events.emit("uncaughtException", exception);
    await Promise.resolve();

    expect(shutdown).toHaveBeenCalledWith("unhandledRejection", rejection);
    expect(shutdown).toHaveBeenCalledWith("uncaughtException", exception);

    unregister();
  });

  it("encaminha falha real do bootstrap para o shutdown", async () => {
    const error = new Error("falha no ORM");
    const shutdown = vi.fn(async () => undefined);

    await runBootstrap(async () => {
      throw error;
    }, shutdown);

    expect(shutdown).toHaveBeenCalledWith("bootstrap", error);
  });
});
