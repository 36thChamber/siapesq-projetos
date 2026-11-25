//background.ts funcionando detectar COM automaticamente
require('dotenv').config();
import { app, BrowserWindow, dialog, ipcMain, screen } from "electron";
import serve from "electron-serve";
import { createWindow } from "./helpers";
import { SerialPort } from "serialport";
import GPS from "gps";
import Store from 'electron-store';
import { autoUpdater } from "electron-updater";
import log from 'electron-log';
import axios from 'axios';

//função para manter uma unica instancia do aplicativo
const gotTheLock = app.requestSingleInstanceLock();
let mainWindow: BrowserWindow | null = null;
let updateInProgress = false;

function enviarLogParaRenderer(mensagem: string) {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send("log", mensagem);
  }
}

// Função para enviar status de update para o renderer
function enviarStatusUpdate(status: string, info?: any) {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send("update-status", { status, info });
  }
}

// Função para verificar updates com controle de estado
async function checkForUpdates(showNoUpdateDialog = false) {
  if (updateInProgress) {
    log.info('Verificação de update já em andamento...');
    return;
  }
  
  updateInProgress = true;
  
  try {
    log.info('Iniciando verificação de updates...');
    enviarStatusUpdate('checking');
    await autoUpdater.checkForUpdates();
  } catch (error) {
    log.error('Erro ao verificar updates:', error);
    enviarStatusUpdate('error', error);
    updateInProgress = false;
  }
}

if (!gotTheLock) {
  app.quit(); // Outra instância já tá rodando, sai dessa
} else {
  app.on('second-instance', () => {
    // Foca a janela principal se o usuário tentar abrir outra
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

const store = new Store();
const isProd = process.env.NODE_ENV === "production";

if (isProd) {
  serve({ directory: "app" });
} else {
  app.setPath("userData", `${app.getPath("userData")} (development)`);
}

// Intercepta log.info
const originalInfo = log.info;
log.info = (...args) => {
  const msg = args.join(" ");
  enviarLogParaRenderer(msg);
  originalInfo(...args); // ainda escreve no disco
};

// Intercepta log.error
const originalError = log.error;
log.error = (...args) => {
  const msg = args.join(" ");
  enviarLogParaRenderer(msg);
  originalError(...args);
};

// =-=- CONFIGURAÇÃO DO AUTO UPDATE (ANTES DE TUDO) =-=- //
autoUpdater.logger = log;
log.transports.file.level = 'info';
autoUpdater.autoDownload = false; // Não baixa automaticamente - pergunta antes
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('checking-for-update', () => {
  log.info('Verificando atualização...');
  enviarStatusUpdate('checking');
});

autoUpdater.on('update-available', (info) => {
  log.info('Atualização disponível:', info.version);
  enviarStatusUpdate('available', info);
  
  // Pergunta ao usuário se quer baixar
  const dialogOpts = {
    type: 'info',
    buttons: ['Baixar agora', 'Depois'],
    title: 'Atualização Disponível',
    message: `Nova versão ${info.version} disponível`,
    detail: 'Deseja baixar a atualização agora?'
  };

  dialog.showMessageBox(mainWindow!, dialogOpts).then((returnValue) => {
    if (returnValue.response === 0) {
      log.info('Usuário escolheu baixar a atualização');
      autoUpdater.downloadUpdate();
    } else {
      updateInProgress = false;
    }
  });
});

autoUpdater.on('update-not-available', (info) => {
  log.info('Sem atualizações disponíveis');
  enviarStatusUpdate('not-available');
  updateInProgress = false;
});

autoUpdater.on('error', (err) => {
  log.error('Erro no auto-updater:', err);
  enviarStatusUpdate('error', err);
  updateInProgress = false;
  
  // SE QUISER DEIXAR O ERRO AMOSTRA PRO USUARIO SÓ TIRAR
  // // Notifica o usuário sobre o erro
  // if (mainWindow) {
  //   dialog.showErrorBox('Erro de Atualização', 
  //     'Ocorreu um erro ao verificar/baixar atualizações: ' + err.message);
  // }
});

autoUpdater.on('download-progress', (progressObj) => {
  const log_message = `Download: ${Math.round(progressObj.percent)}% - ${Math.round(progressObj.bytesPerSecond / 1024)} KB/s`;
  log.info(log_message);
  
  // Envia progresso para o renderer
  enviarStatusUpdate('downloading', {
    percent: Math.round(progressObj.percent),
    transferred: progressObj.transferred,
    total: progressObj.total,
    bytesPerSecond: progressObj.bytesPerSecond
  });
});

autoUpdater.on('update-downloaded', (info) => {
  log.info('Update baixado com sucesso');
  enviarStatusUpdate('downloaded', info);
  updateInProgress = false;
    
  const dialogOpts = {
    type: 'info',
    buttons: ['Reiniciar agora', 'Reiniciar depois'],
    title: 'Atualização Baixada',
    message: `Versão ${info.version} foi baixada com sucesso`,
    detail: 'A aplicação precisa ser reiniciada para aplicar a atualização.'
  };

  dialog.showMessageBox(mainWindow!, dialogOpts).then((returnValue) => {
    if (returnValue.response === 0) {
      log.info('Usuário escolheu reiniciar agora');
      autoUpdater.quitAndInstall();
    } else {
      log.info('Usuário escolheu reiniciar depois');
    }
  });
});

SerialPort.list().then(async (ports) => {
  console.log("Portas disponíveis:");
  const gpsPorta = { path: null };
  let foundGPS = false;

  //função para pegar localização aproximada, usando IP do computador do usuário
  async function getApproximateLocation() {
    try {
      const response = await axios.get('http://ip-api.com/json/');
      if (response.data && response.data.lat && response.data.lon) {
        return {
          lat: response.data.lat,
          lon: response.data.lon,
          speed: 0,
          time: new Date()
        };
      }
    } catch (error) {
      console.error("Erro ao obter localização aproximada:", error);
    }
    return null;
  }

  //função que busca por GPS conectado
  function findGps() {
    SerialPort.list().then(async (ports) => {
      let gpsFoundThisRound = false;

      return new Promise<void>((resolve, reject) => {
        ports.forEach((port) => {
          const gps = new GPS();
          const porta = new SerialPort({
            path: port.path,
            baudRate: 9600,
          });
          
          if (port) {
            porta.on("data", (data) => {
              gps.updatePartial(data);
              console.log(porta.path);
            });
            
            let dadoAnterior: any;
            gps.on("data", (data) => {
              console.log(gps.state.lat);
              let speed = (gps.state.speed) * (0.539957); // Km/h para Nós
              console.log(speed)
              
              if (gps.state.lat) {
                gpsFoundThisRound = true;
                foundGPS = true;
                gpsPorta.path = port.path;

                if (store.get('sharedData')) {
                  dadoAnterior = store.get('sharedData');
                }
                
                if (dadoAnterior == undefined || !dadoAnterior && data.lat != undefined && data.lon != undefined) {
                  store.set('sharedData', data);
                  if (speed != undefined && speed != null) {
                    store.set('speedData', speed);
                  } else {
                    store.set('speedData', 0);
                  }
                  console.log(data.lat)
                  console.log(data.lon)
                } else if (dadoAnterior.time != data.time && data.lat != undefined && data.lon != undefined) {
                  store.set('sharedData', data);
                  if (speed != undefined && speed != null) {
                    store.set('speedData', speed);
                  } else {
                    store.set('speedData', 0);
                  }
                  console.log(data.lat)
                  console.log(data.lon)
                }
              }
              
              if (!port) {
                gps.off('data')
              }
            });
          }
        });
        
        // setTimeout(() => {
        //   if (!gpsFoundThisRound && !foundGPS) {
        //     getApproximateLocation().then((approxLocation) => {
        //       if (approxLocation) {
        //         store.set('approximateLocationData', approxLocation);
        //         store.set('speedData', 0);
        //         console.log("Usando localização aproximada:", approxLocation);
        //       }
        //     });
        //   }
        //   resolve();
        // }, 1000);
      });
    });
  }

  // setInterval para ficar buscando por gps's conectados
  setInterval(() => {
    if (ports) {
      findGps()
    }
  }, 5000);
  findGps();

  await app.whenReady();
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = createWindow("main", {
    width,
    height,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      webSecurity: false,
      zoomFactor: 1.0
    },
  });
  
  mainWindow.webContents.setVisualZoomLevelLimits(1, 1);
  mainWindow.webContents.setZoomFactor(1);
  mainWindow.setMenuBarVisibility(false);

  if (isProd) {
    await mainWindow.loadURL(`app://./splashScreen.html`);
  } else {
    const port = process.argv[2];
    await mainWindow.loadURL(`http://localhost:${port}/splashScreen`);
  }

  // VERIFICAÇÃO AUTOMÁTICA NA INICIALIZAÇÃO (APENAS UMA VEZ)
  setTimeout(() => {
    log.info('🔄 Verificando updates automaticamente na inicialização...');
    checkForUpdates();
  }, 5000);

  //Impede que os erros sejam exibidos ao usuario
  process.on('uncaughtException', (error) => {
    console.error('Ocorreu um erro não tratado:', error);
  });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if ((input.control || input.meta) && (input.key === '+' || input.key === '-' || input.key === '0')) {
      event.preventDefault();
    }
  });

  function handleWindowClosed() {
    if (BrowserWindow.getAllWindows().length === 0 && process.platform !== "darwin") {
      app.quit();
    }
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
    handleWindowClosed();
  });

  // Intercepta o evento de fechar janela para garantir fechamento completo
  mainWindow.on("close", function (event) {
    app.quit();
  });

  app.on("window-all-closed", function () {
    app.quit();
  });

  // IPC HANDLER PARA O BOTÃO "BUSCAR ATUALIZAÇÕES" (CORRIGIDO)
  ipcMain.on("click-update", async () => {
    log.info('🔍 Busca manual de atualizações solicitada pelo usuário');
    await checkForUpdates();
  });

  log.info('App iniciado - Versão:', app.getVersion());
});