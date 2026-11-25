"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { Certificate, getCertificate, saveCertificate, validateCertificateFile } from "@/services/api/certificates.service";
export default function ScientificCertificate({ userId, readOnly = false }: { userId: string; readOnly?: boolean }) {
  const [certificate, setCertificate] = useState<Certificate>();const [file, setFile] = useState<File>();
  const [loaded, setLoaded] = useState(false);const [busy, setBusy] = useState(false);const [error, setError] = useState("");const [message, setMessage] = useState("");
  useEffect(() => {
    let active=true;
    getCertificate(userId).then(value=>{if(active)setCertificate(value);}).catch(reason=>{
      if(active && !(axios.isAxiosError(reason) && reason.response?.status===404))setError("Não foi possível consultar o comprovante.");
    }).finally(()=>{if(active)setLoaded(true);});
    return ()=>{active=false;};
  },[userId]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();if(!file || busy)return;setBusy(true);setError("");setMessage("");
    try{setCertificate(await saveCertificate(userId,file));setFile(undefined);setMessage("Comprovante enviado e armazenado com sucesso.");}
    catch(reason){setError(axios.isAxiosError(reason)?reason.response?.data?.message || "Não foi possível enviar o comprovante.":reason instanceof Error?reason.message:"Falha ao enviar.");}
    finally{setBusy(false);}
  }
  return <section aria-label="Comprovante científico" className="my-4 space-y-3 rounded-lg border border-slate-200 bg-white p-4 text-sm">
    <h3 className="font-semibold text-slate-800">Comprovante de título científico</h3>
    {!loaded && <p role="status">Consultando comprovante…</p>}
    {loaded && !certificate && <p>Nenhum comprovante enviado.</p>}
    {certificate && <p><a href={`/api/usuarios/${encodeURIComponent(userId)}/comprovante/download`} className="text-sky-800 underline">Baixar {certificate.nome}</a> · {Math.ceil(certificate.tamanho/1024)} KB</p>}
    {!readOnly && <form onSubmit={submit} className="space-y-2">
      <p>PDF, PNG ou JPEG de até 5 MB. Acesso restrito a você e à administração.</p>
      <input key={certificate?.sha256 || 'new'} aria-label="Selecionar comprovante científico" type="file" accept="application/pdf,image/png,image/jpeg" disabled={busy} onChange={event=>{
        setError("");setMessage("");const selected=event.target.files?.[0];setFile(undefined);if(!selected)return;
        try{validateCertificateFile(selected);setFile(selected);}catch(reason){setError((reason as Error).message);event.target.value="";}
      }}/>
      <button type="submit" disabled={!file || busy} className="block rounded bg-sky-800 px-3 py-2 text-white disabled:opacity-50">{busy?'Enviando…':certificate?'Substituir comprovante':'Enviar comprovante'}</button>
    </form>}
    {message && <p role="status" className="text-green-800">{message}</p>}{error && <p role="alert" className="text-red-800">{error}</p>}
  </section>;
}
