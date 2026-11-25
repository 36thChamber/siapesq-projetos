import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

contextBridge.exposeInMainWorld("ipc", {
  //permite apenas canais especificos, mais seguro e moderno
  send(channel: "click-update", value?: unknown) {
    ipcRenderer.send(channel, value);
  },
  on(channel: string, callback: (...args: unknown[]) => void) {
    const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
      callback(...args);
    ipcRenderer.on(channel, subscription);

    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  },
});

contextBridge.exposeInMainWorld("analisesAPI", {
  downloadAll: (token: string) =>
    ipcRenderer.invoke("analises:download-all", token),

  downloadCsv: (token: string, nomeArquivo: string) =>
    ipcRenderer.invoke("analisesdownload-csv", token, nomeArquivo),

  onProgress: (
    callback: (data: { done: number; total: number; percent: number }) => void,
  ) =>
    ipcRenderer.on("analises:download-progress", (_, data) => callback(data)),

  searchTif: async (nome_arquivo: string) => {
    const result = await ipcRenderer.invoke(
      "analises:search-tif",
      nome_arquivo,
    );

    if (!result?.base64) return null;

    return {
      nomeOriginal: result.nomeDescriptografado,
      base64: result.base64,
    };
  },

  searchTifWith30: async (nome_arquivo: string, nome_arquivo_30?: string) => {
    const result = await ipcRenderer.invoke(
      "analises:search-tif-30",
      nome_arquivo,
      nome_arquivo_30,
    );

    // result = { principal, arquivo_30 }

    const principal =
      result?.principal && result.principal.base64
        ? {
            nomeOriginal: result.principal.nomeDescriptografado,
            base64: result.principal.base64,
          }
        : null;

    const arquivo_30 =
      result?.arquivo_30 && result.arquivo_30.base64
        ? {
            nomeOriginal: result.arquivo_30.nomeDescriptografado,
            base64: result.arquivo_30.base64,
          }
        : null;

    return { principal, arquivo_30 };
  },
});

contextBridge.exposeInMainWorld("auth", {
  getToken: () => ipcRenderer.invoke("auth:getToken"),
  setToken: (token: string) => ipcRenderer.invoke("auth:setToken", token),
  clearToken: () => ipcRenderer.invoke("auth:clearToken"),

  getUserData: () => ipcRenderer.invoke("auth:getUserData"),
  setUserData: (data: any) => ipcRenderer.invoke("auth:setUserData", data),
  clearUserData: () => ipcRenderer.invoke("auth:clearUserData"),

  // 👈 ADICIONADO AQUI
  getAtualizacaoData: () => ipcRenderer.invoke("auth:getAtualizacaoData"),
  setAtualizacaoData: (data: string) =>
    ipcRenderer.invoke("auth:setAtualizacaoData", data),
  clearDataAtualizacao: () => ipcRenderer.invoke("auth:clearDataAtualizacao"),

  clearAll: () => ipcRenderer.invoke("auth:clearAll"),
});

contextBridge.exposeInMainWorld("species", {
  getSelected: () => ipcRenderer.invoke("species:getSelected"),
  setSelected: (species: any) =>
    ipcRenderer.invoke("species:setSelected", species),
});

contextBridge.exposeInMainWorld("logger", {
  onLog: (callback: (mensagem: string) => void) => {
    const handler = (_event: any, mensagem: string) => {
      callback(mensagem);
    };

    ipcRenderer.on("log", handler);

    return () => {
      ipcRenderer.removeListener("log", handler);
    };
  },
});
