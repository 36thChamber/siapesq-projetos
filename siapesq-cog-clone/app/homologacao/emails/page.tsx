"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { get } from "@/services/api/apiClient";

type Message = { id: string; to: string; subject: string; created_at: string; links: string[] };
export default function LocalMailbox() {
  const { user, loading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    if (user?.tipo_usuario !== "ADMIN") return;
    try { setMessages((await get<{ messages: Message[] }>("/homologacao/emails")).messages); setError(""); }
    catch { setError("Não foi possível abrir a caixa de e-mails local."); }
  }, [user?.tipo_usuario]);
  useEffect(() => {
    let active=true;queueMicrotask(()=>{if(active){void refresh();}});
    return ()=>{active=false;};
  }, [refresh]);
  if (loading) return <main className="p-8">Carregando…</main>;
  if (user?.tipo_usuario !== "ADMIN") return <main className="space-y-4 p-8"><p>Acesso restrito à administração.</p><Link href="/login">Entrar</Link></main>;
  return <main className="mx-auto max-w-4xl space-y-5 p-8">
    <h1 className="text-2xl font-bold">E-mails de homologação</h1>
    <p className="text-slate-600">Mensagens capturadas neste ambiente. Nenhum e-mail foi enviado para destinatários externos.</p>
    <button onClick={refresh} className="rounded bg-sky-700 px-4 py-2 text-white">Atualizar mensagens</button>
    {error && <p role="alert">{error}</p>}
    {!messages.length && <p>Nenhuma mensagem capturada.</p>}
    {messages.map(message => <article key={message.id} className="space-y-2 rounded border p-4">
      <h2 className="font-semibold">{message.subject}</h2>
      <p>Para: {message.to}</p><time dateTime={message.created_at}>{new Date(message.created_at).toLocaleString("pt-BR")}</time>
      {message.links.map((url, index) => <p key={index}><a className="text-sky-800 underline" href={url}>Abrir link da mensagem {index + 1}</a></p>)}
    </article>)}
    <Link href="/home" className="inline-block text-sky-800 underline">Voltar à plataforma</Link>
  </main>;
}
