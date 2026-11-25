import log from 'electron-log';
import { BrowserWindow } from 'electron';

let mainWindow: BrowserWindow | null = null;

export function setMainWindow(window: BrowserWindow) {
  mainWindow = window;
}

export function enviarLogParaRenderer(mensagem: string) {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send("log", mensagem);
  }
}

// Intercepta log.info para também enviar ao renderer
export function setupLogger() {
  const originalInfo = log.info;
  log.info = (...args) => {
    const msg = args.join(" ");
    enviarLogParaRenderer(msg);
    originalInfo(...args);
  };

  const originalError = log.error;
  log.error = (...args) => {
    const msg = args.join(" ");
    enviarLogParaRenderer(msg);
    originalError(...args);
  };
}

export default log;
