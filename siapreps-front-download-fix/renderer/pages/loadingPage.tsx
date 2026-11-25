"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/router";

type Progress = {
  phase:
    | "listing"
    | "downloading"
    | "completed"
    | "completed_with_errors"
    | "failed";
  done: number;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  total: number;
  percent: number;
  bytesTransferred: number;
  bytesTotal: number;
  currentFile?: string;
};

export default function SyncAnalisesPage() {
  const router = useRouter();

  const [status, setStatus] = useState<
    "idle" | "downloading" | "done" | "error"
  >("idle");
  const [progress, setProgress] = useState<Progress>({
    phase: "listing",
    done: 0,
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    total: 0,
    percent: 0,
    bytesTransferred: 0,
    bytesTotal: 0,
  });

  // 👉 novo estado
  const [showConfirm, setShowConfirm] = useState(false);

  const startDownload = async () => {
    const token = await window.auth.getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    setStatus("downloading");
    const unsubscribe = window.analisesAPI.onProgress((data) => {
      setProgress(data);
    });

    try {
      const result = await window.analisesAPI.downloadAll(token);
      if (!result.success) {
        setStatus("error");
        return;
      }

      await window.auth.setAtualizacaoData(new Date().toISOString());
      setStatus("done");

      setTimeout(() => {
        router.replace("/home");
      }, 800);
    } catch (err) {
      console.error(err);
      setStatus("error");
    } finally {
      unsubscribe();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-dark_green">
      {/* conteúdo central */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <div className="mb-8">
          <Image
            src="/SIAPESQ3.svg"
            alt="SIAPESQ"
            width={220}
            height={80}
            className="mx-auto w-52 h-auto"
          />
        </div>

        {status === "idle" && (
          <>
            <p className="mb-8 text-lg lg:text-2xl">
              Baixar as análises mais atuais agora?
              <br />
              <span className="text-sm text-gray-600">
                Recomendado no primeiro acesso
              </span>
            </p>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setShowConfirm(true)}
                className="px-8 py-2 rounded-md bg-dark_green text-white hover:opacity-90 transition"
              >
                Atualizar agora
              </button>

              <button
                onClick={() => router.replace("/home")}
                className="px-8 py-2 rounded-md border border-dark_green hover:bg-gray-100 transition"
              >
                Depois
              </button>
            </div>
          </>
        )}

        {status === "downloading" && (
          <>
            <p className="mb-8 text-lg lg:text-2xl">
              Baixando análises
            </p>

            <div className="w-10 h-10 border-4 border-dark_green/20 border-t-dark_green rounded-full animate-spin mb-6" />

            <span className="text-sm text-gray-600 font-medium">
              {progress.processed} de {progress.total || "..."} arquivos processados
            </span>
            {progress.skipped > 0 && (
              <span className="mt-2 text-xs text-gray-500">
                {progress.skipped} arquivos ja estavam atualizados
              </span>
            )}
          </>
        )}

        {status === "done" && (
          <span className="text-lg lg:text-2xl">
            Análises atualizadas com sucesso
          </span>
        )}

        {status === "error" && (
          <>
            <span className="mb-6 text-lg lg:text-2xl">
              Nao foi possivel concluir a atualizacao
            </span>
            <div className="flex gap-4 justify-center">
              <button
                onClick={startDownload}
                className="px-6 py-2 rounded-md bg-dark_green text-white hover:opacity-90 transition"
              >
                Tentar novamente
              </button>
              <button
                onClick={() => router.replace("/home")}
                className="px-6 py-2 rounded-md border border-dark_green hover:bg-gray-100 transition"
              >
                Ir para o inicio
              </button>
            </div>
          </>
        )}
      </div>

      {/* ========================= */}
      {/* MODAL DE CONFIRMAÇÃO */}
      {/* ========================= */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-3">
              Confirmar atualização
            </h2>

            <p className="text-sm text-gray-600 mb-6">
              Essa ação irá baixar todas as análises disponíveis.
              <br />
              O processo pode levar alguns minutos dependendo da conexão.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-md border text-sm hover:bg-gray-100"
              >
                Cancelar
              </button>

              <button
                onClick={() => {
                  setShowConfirm(false);
                  startDownload();
                }}
                className="px-4 py-2 rounded-md bg-dark_green text-white text-sm hover:opacity-90"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* rodapé */}
      <footer className="w-full flex justify-end gap-6 px-8 py-4">
        <Image
          src="/images/logos/hubittat.svg"
          alt="Hubittat"
          width={110}
          height={40}
          className="h-6 w-auto"
        />
        <Image
          src="/images/logos/ste.svg"
          alt="STE"
          width={110}
          height={40}
          className="h-6 w-auto"
        />
      </footer>
    </div>
  );
}
