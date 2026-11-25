import path from "path";
import { app, BrowserWindow, ipcMain, screen } from "electron";
import serve from "electron-serve";
import { createWindow } from "./helpers";

import {
  setMainWindow as setLogMainWindow,
  setupLogger,
} from "./helpers/log-handlers";

import {
  setMainWindow as setUpdateMainWindow,
  setupAutoUpdater,
  checkForUpdates,
} from "./helpers/auto-update";

import {
  downloadAnaliseSelecionada,
  downloadAnalisesCsv,
  getAllAnalises,
} from "./controllers/download-tifs";
import type { DownloadAnaliseSelecionadaInput } from "./controllers/download-tifs";

import { search_tif, search_tif_with_30 } from "./controllers/search-tifs";
import Store from "electron-store";

const isProd = process.env.NODE_ENV === "production";

let mainWindow: BrowserWindow | null = null;

/* ===========================
   SINGLE INSTANCE LOCK
=========================== */
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
}

/* ===========================
   APP EVENTS
=========================== */
app.on("second-instance", () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on("before-quit", () => {
  mainWindow = null;
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

const loadURLProd = isProd ? serve({ directory: "app" }) : null;

/* ===========================
   APP READY
=========================== */
app.on("ready", async () => {
  if (!isProd) {
    app.setPath("userData", `${app.getPath("userData")} (development)`);
  }

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = createWindow("main", {
    width,
    height,
    minWidth: 800,
    minHeight: 600,
    show: false,
    backgroundColor: "#ffffff",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true, // importante para estabilidade -=-=- se precisar acessar buffer ou usar apis nativa no preload por quebrar silenciosamente (funcionando no momento)
    },
  });

  setLogMainWindow(mainWindow);
  setUpdateMainWindow(mainWindow);

  setupLogger();
  setupAutoUpdater();

  // Load app
  if (isProd && loadURLProd) {
    await loadURLProd(mainWindow);
  } else {
    const port = process.argv[2] ?? 3000;
    await mainWindow.loadURL(`http://localhost:${port}/`);
  }

  // CHECK UPDATE SOMENTE APÓS O FRONT CARREGAR
  mainWindow.webContents.once("did-finish-load", () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    checkForUpdates().catch((err) => {
      console.error("Erro ao verificar atualizações:", err);
    });
  });

  mainWindow.maximize();
  mainWindow.show();

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
});

/* ===========================
   IPC - ANALISES
=========================== */
ipcMain.handle("analises:download-all", async (event, token) => {
  return await getAllAnalises(
    token,
    { limit: 100, offset: 0 },
    (progress) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send("analises:download-progress", progress);
      }
    },
  );
});

ipcMain.handle("analises:search-tif", async (_event, nome_arquivo: string) => {
  return await search_tif(nome_arquivo);
});

ipcMain.handle(
  "analises:search-tif-30",
  async (
    _event,
    nome_arquivo: string,
    nome_arquivo_30?: string | null,
    nome_arquivo_nacional?: string | null,
    nome_arquivo_rs?: string | null,
  ) => {
    return await search_tif_with_30(
      nome_arquivo,
      nome_arquivo_30,
      nome_arquivo_nacional,
      nome_arquivo_rs,
    );
  },
);

ipcMain.handle("analisesdownload-csv", async (_event, token, nomearquivo) => {
  const downloadsPath = app.getPath("downloads");
  return await downloadAnalisesCsv(token, nomearquivo, downloadsPath);
});

ipcMain.handle(
  "analises:download-selected",
  async (_event, token: string, analise: DownloadAnaliseSelecionadaInput) => {
    const downloadsPath = app.getPath("downloads");
    return await downloadAnaliseSelecionada(token, analise, downloadsPath);
  }
);

/* ===========================
   AUTH / STORE
=========================== */
enum TipoUsuario {
  ADMIN = "ADMIN",
  PESQUISADOR = "PESQUISADOR",
  PADRAO = "PADRAO",
}

type UserData = {
  id_usuario: string;
  nome: string;
  email: string;
  senha: string;
  contato: string;
  cpf: string;
  titulo_cientifico: boolean;
  tipo_usuario: TipoUsuario;
  email_verificado: boolean;
  ultimo_acesso: string;
  criado_em: string;
  atualizado_em: string;
  token: string;
};

type StoredSpecies = {
  id: string;
  nome: string;
  grupo?: string;
};

const store = new Store<{
  authToken?: string;
  userData?: UserData;
  ultimaAtualizacao?: string;
  selectedSpecies?: StoredSpecies;
}>({ name: "app-store" });

ipcMain.handle("auth:getToken", () => store.get("authToken") ?? null);
ipcMain.handle("auth:setToken", (_e, token: string) =>
  store.set("authToken", token),
);
ipcMain.handle("auth:clearToken", () => store.delete("authToken"));

ipcMain.handle("auth:getUserData", () => store.get("userData") ?? null);
ipcMain.handle("auth:setUserData", (_e, data: UserData) =>
  store.set("userData", data),
);
ipcMain.handle("auth:clearUserData", () => store.delete("userData"));

ipcMain.handle("auth:setAtualizacaoData", (_e, data: string) =>
  store.set("ultimaAtualizacao", data),
);

ipcMain.handle(
  "auth:getAtualizacaoData",
  () => store.get("ultimaAtualizacao") ?? null,
);

ipcMain.handle("auth:clearDataAtualizacao", () =>
  store.delete("ultimaAtualizacao"),
);

ipcMain.handle("auth:clearAll", () => {
  store.delete("authToken");
  store.delete("userData");
  store.delete("ultimaAtualizacao");
});

ipcMain.handle(
  "species:getSelected",
  () => store.get("selectedSpecies") ?? null,
);

ipcMain.handle("species:setSelected", (_e, species: StoredSpecies | null) => {
  if (species) store.set("selectedSpecies", species);
  else store.delete("selectedSpecies");
});
