"use client";
import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { get, post } from "@/services/api/apiClient";

type Payment = { id: string; nome: string; provider: string; metodo: string; status: string; valor: string; simulation: boolean };
export default function SimulatedPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [payment, setPayment] = useState<Payment>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { setPayment(await get<Payment>(`/homologacao/pagamentos/${encodeURIComponent(id)}`)); setError(""); }
    catch { setError("Não foi possível abrir este pagamento de teste. Entre na plataforma e tente novamente."); }
  }, [id]);
  useEffect(() => {
    let active=true;queueMicrotask(()=>{if(active){void load();}});
    return ()=>{active=false;};
  }, [load]);
  async function resolve(resultado: string) {
    if (busy) return;
    setBusy(true);
    try { setPayment(await post<Payment>(`/homologacao/pagamentos/${encodeURIComponent(id)}`, { resultado })); setError(""); }
    catch { setError("Não foi possível registrar este resultado de teste."); }
    finally { setBusy(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
    <section className="w-full max-w-lg space-y-5 rounded-xl border bg-white p-8 shadow">
      <p className="rounded bg-amber-100 p-3 font-semibold text-amber-950">Simulação · nenhum valor será cobrado</p>
      <h1 className="text-2xl font-bold">Pagamento de teste</h1>
      {error && <p role="alert" className="text-red-800">{error}</p>}
      {payment && <>
        <p className="font-semibold">{payment.nome}</p>
        <p>Provedor simulado: {payment.provider === "stripe" ? "Stripe" : "Mercado Pago"}</p>
        <p>Meio escolhido: {({ cartao: "Cartão", pix: "Pix", boleto: "Boleto" } as Record<string,string>)[payment.metodo]}</p>
        <p>Valor de referência: {Number(payment.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
        <p role="status">Resultado: {payment.status}</p>
        {payment.status === "pendente" && <div className="flex flex-wrap gap-3">
          <button disabled={busy} onClick={() => resolve("aprovado")} className="rounded bg-green-700 p-3 text-white">Simular aprovação</button>
          <button disabled={busy} onClick={() => resolve("recusado")} className="rounded bg-red-700 p-3 text-white">Simular recusa</button>
          <button disabled={busy} onClick={() => resolve("cancelado")} className="rounded border p-3">Cancelar teste</button>
        </div>}
        {payment.status === "aprovado" && <p>A assinatura de teste foi ativada na plataforma.</p>}
      </>}
      <Link href="/home" className="inline-block text-sky-800 underline">Voltar à plataforma</Link>
    </section>
  </main>;
}
