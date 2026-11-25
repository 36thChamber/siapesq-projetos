import { Server } from "node:http";

export type FatalEvent =
  | "bootstrap"
  | "unhandledRejection"
  | "uncaughtException";

type Shutdown = (event: FatalEvent, error: unknown) => Promise<void>;

interface ProcessEventSource {
  once(event: string, listener: (...args: any[]) => void): unknown;
  removeListener(event: string, listener: (...args: any[]) => void): unknown;
}

interface ShutdownResources {
  server?: Pick<Server, "close">;
  orm?: { close(): Promise<void> };
}

interface FatalLogger {
  fatal(payload: Record<string, unknown>, message: string): void;
}

interface ShutdownOptions {
  timeoutMs?: number;
  logger?: FatalLogger;
  exit?: (code: number) => void;
  setExitCode?: (code: number) => void;
}

function serializeError(error: unknown): unknown {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return error;
}

const defaultLogger: FatalLogger = {
  fatal(payload, message) {
    console.error(
      JSON.stringify({
        level: "fatal",
        message,
        ...payload,
        error: serializeError(payload.error),
      }),
    );
  },
};

function closeServer(server: Pick<Server, "close">): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error?: Error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

export function createGracefulShutdown(
  getResources: () => ShutdownResources,
  options: ShutdownOptions = {},
): Shutdown {
  const timeoutMs = options.timeoutMs ?? 10_000;
  const logger = options.logger ?? defaultLogger;
  const exit = options.exit ?? ((code) => process.exit(code));
  const setExitCode =
    options.setExitCode ?? ((code) => { process.exitCode = code; });
  let shutdownPromise: Promise<void> | undefined;

  return (event, error) => {
    if (shutdownPromise) {
      return shutdownPromise;
    }

    shutdownPromise = (async () => {
      logger.fatal({ event, error: serializeError(error) }, "Falha fatal da aplicacao");

      const timeout = setTimeout(() => {
        logger.fatal(
          { event, timeoutMs },
          "Tempo limite excedido durante o encerramento controlado",
        );
        exit(1);
      }, timeoutMs);
      timeout.unref();

      try {
        const { server, orm } = getResources();

        if (server) {
          await closeServer(server);
        }

        if (orm) {
          await orm.close();
        }

        setExitCode(1);
      } catch (shutdownError) {
        logger.fatal(
          { event, error: serializeError(shutdownError) },
          "Falha durante o encerramento controlado",
        );
        exit(1);
      } finally {
        clearTimeout(timeout);
      }
    })();

    return shutdownPromise;
  };
}

export function registerProcessHandlers(
  processEvents: ProcessEventSource,
  shutdown: Shutdown,
): () => void {
  const onUnhandledRejection = (reason: unknown) => {
    void shutdown("unhandledRejection", reason);
  };
  const onUncaughtException = (error: Error) => {
    void shutdown("uncaughtException", error);
  };

  processEvents.once("unhandledRejection", onUnhandledRejection);
  processEvents.once("uncaughtException", onUncaughtException);

  return () => {
    processEvents.removeListener("unhandledRejection", onUnhandledRejection);
    processEvents.removeListener("uncaughtException", onUncaughtException);
  };
}

export async function runBootstrap(
  bootstrap: () => Promise<void>,
  shutdown: Shutdown,
): Promise<void> {
  try {
    await bootstrap();
  } catch (error) {
    await shutdown("bootstrap", error);
  }
}
