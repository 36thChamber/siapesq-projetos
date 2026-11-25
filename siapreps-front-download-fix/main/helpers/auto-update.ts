import {
  dialog,
  ipcMain,
  BrowserWindow,
  MessageBoxOptions,
  app,
} from "electron";
import { autoUpdater } from "electron-updater";
import log from "./log-handlers";

let mainWindow: BrowserWindow | null = null;
let updateInProgress = false;
let isQuitting = false;

/* ===========================
   SET MAIN WINDOW
=========================== */
export function setMainWindow(window: BrowserWindow) {
  mainWindow = window;
}

/* ===========================
   SAFE SEND (ANTI-CRASH)
=========================== */
function safeSend(channel: string, payload?: any) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

/* ===========================
   CHECK FOR UPDATES
=========================== */
export async function checkForUpdates() {
  if (!app.isPackaged) {
    log.info("🟡 App não empacotado — auto-update ignorado");
    return;
  }

  if (updateInProgress) {
    log.info("🔁 Verificação de update já em andamento");
    return;
  }

  updateInProgress = true;

  try {
    log.info("🔍 Iniciando verificação de updates...");
    safeSend("update-status", { status: "checking" });
    await autoUpdater.checkForUpdates();
  } catch (error) {
    log.error("❌ Erro ao verificar updates:", error);
    safeSend("update-status", { status: "error", error });
    updateInProgress = false;
  }
}

/* ===========================
   SETUP AUTO UPDATER
=========================== */
export function setupAutoUpdater() {
  autoUpdater.logger = log;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;

  log.transports.file.level = "info";

  app.on("before-quit", () => {
    isQuitting = true;
    mainWindow = null;
  });

  autoUpdater.on("checking-for-update", () => {
    log.info("🔍 Verificando atualização...");
    safeSend("update-status", { status: "checking" });
  });

  autoUpdater.on("update-available", (info) => {
    log.info("⬆️ Atualização disponível:", info.version);
    safeSend("update-status", { status: "available", info });

    if (!mainWindow || mainWindow.isDestroyed()) {
      updateInProgress = false;
      return;
    }

    const dialogOpts: MessageBoxOptions = {
      type: "info",
      buttons: ["Baixar agora", "Depois"],
      defaultId: 0,
      cancelId: 1,
      title: "Atualização disponível",
      message: `Nova versão ${info.version} disponível`,
      detail: "Deseja baixar a atualização agora?",
    };

    dialog.showMessageBox(mainWindow, dialogOpts).then(({ response }) => {
      if (response === 0) {
        log.info("📥 Usuário iniciou download do update");
        autoUpdater.downloadUpdate();
      } else {
        log.info("⏸️ Usuário adiou o update");
        updateInProgress = false;
      }
    });
  });

  autoUpdater.on("update-not-available", () => {
    log.info("✅ Nenhuma atualização disponível");
    safeSend("update-status", { status: "not-available" });
    updateInProgress = false;
  });

  autoUpdater.on("download-progress", (progress) => {
    log.info(
      `📦 Download ${Math.round(progress.percent)}% - ${Math.round(
        progress.bytesPerSecond / 1024
      )} KB/s`
    );

    safeSend("update-status", {
      status: "downloading",
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    log.info("✅ Update baixado com sucesso");
    safeSend("update-status", { status: "downloaded", info });
    updateInProgress = false;

    if (isQuitting || !mainWindow || mainWindow.isDestroyed()) return;

    const dialogOpts: MessageBoxOptions = {
      type: "info",
      buttons: ["Reiniciar agora", "Depois"],
      defaultId: 0,
      cancelId: 1,
      title: "Atualização pronta",
      message: `Versão ${info.version} foi baixada`,
      detail: "É necessário reiniciar o aplicativo para aplicar a atualização.",
    };

    dialog.showMessageBox(mainWindow, dialogOpts).then(({ response }) => {
      if (response === 0) {
        log.info("🔄 Reiniciando para aplicar update");
        isQuitting = true;
        autoUpdater.quitAndInstall();
      }
    });
  });

  autoUpdater.on("error", (err) => {
    log.error("❌ Erro no auto-updater:", err);
    safeSend("update-status", { status: "error", err });
    updateInProgress = false;
  });

  /* ===========================
     IPC - UPDATE MANUAL
  =========================== */
  ipcMain.removeAllListeners("click-update");
  ipcMain.on("click-update", async () => {
    log.info("🖱️ Busca manual de updates solicitada");
    await checkForUpdates();
  });
}
