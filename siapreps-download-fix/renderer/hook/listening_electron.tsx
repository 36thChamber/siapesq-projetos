import { useEffect } from "react";

export function useElectronLog(onLog: (mensagem: string) => void) {
  useEffect(() => {
    const { ipcRenderer } = window.require('electron');

    let lastMessageTime = 0;
    const minInterval = 300; // em ms

    const handleLog = (_: any, mensagem: string) => {
      const now = Date.now();
      if (mensagem.includes("Download:") && now - lastMessageTime < minInterval) return;

      lastMessageTime = now;
      onLog(mensagem);
    };

    ipcRenderer.on("log", handleLog);

    return () => {
      ipcRenderer.removeListener("log", handleLog);
    };
  }, [onLog]);
}

