"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { resetPassword, verificarEmail } from "@/services/api/usuarios.service";

export default function AccountAction({ mode }: { mode: "verify" | "reset" }) {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(mode === "verify");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const value = new URLSearchParams(window.location.hash.slice(1)).get("token") || new URLSearchParams(window.location.search).get("token") || "";
    queueMicrotask(() => {
    setToken(value);
    window.history.replaceState(null, "", window.location.pathname);
    if (!value) { setError("Link ausente ou inválido. Solicite um novo e-mail."); setBusy(false); return; }
    if (mode === "verify") {
      verificarEmail({ token: value }).then(() => setSuccess("E-mail confirmado. Você já pode entrar na plataforma."))
        .catch(() => setError("Este link é inválido ou expirou. Solicite um novo e-mail de confirmação."))
        .finally(() => setBusy(false));
    }
    });
  }, [mode]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !token) return;
    if (password.length < 8 || password !== confirmation) {
      setError(password.length < 8 ? "Use pelo menos 8 caracteres." : "As senhas não coincidem."); return;
    }
    setBusy(true); setError("");
    try {
      await resetPassword({ token, novaSenha: password });
      setSuccess("Senha atualizada. Entre com a nova senha."); setPassword(""); setConfirmation(""); setToken("");
    } catch { setError("Não foi possível atualizar a senha. O link pode ter expirado ou já ter sido utilizado."); }
    finally { setBusy(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
    <section className="w-full max-w-md space-y-5 rounded-xl border bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-800">{mode === "verify" ? "Confirmação de e-mail" : "Definir nova senha"}</h1>
      {busy && <p role="status">Aguarde…</p>}
      {success && <p role="status" className="text-green-800">{success}</p>}
      {error && <p role="alert" className="text-red-800">{error}</p>}
      {mode === "reset" && !success && token && <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-medium" htmlFor="new-password">Nova senha</label>
        <input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password}
          onChange={event => setPassword(event.target.value)} className="w-full rounded border p-2" />
        <label className="block text-sm font-medium" htmlFor="confirm-password">Confirmar nova senha</label>
        <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirmation}
          onChange={event => setConfirmation(event.target.value)} className="w-full rounded border p-2" />
        <button disabled={busy} className="w-full rounded bg-sky-700 p-3 font-semibold text-white disabled:opacity-50">Salvar nova senha</button>
      </form>}
      <Link href="/login" className="inline-block text-sky-800 underline">Voltar para entrar</Link>
    </section>
  </main>;
}
