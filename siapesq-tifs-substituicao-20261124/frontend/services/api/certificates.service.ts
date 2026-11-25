import { get, put } from "./apiClient";
export type CertificateInput = { nome: string; tipo: string; conteudo_base64: string };
export type Certificate = { nome: string; tipo: string; tamanho: number; sha256: string; atualizado_em?: string };
export function validateCertificateFile(file: File) {
  if (!file.size || file.size > 5 * 1024 * 1024) throw new Error("O comprovante deve ter até 5 MB e não pode estar vazio.");
  if (!['application/pdf','image/png','image/jpeg'].includes(file.type)) throw new Error("Envie PDF, PNG ou JPEG.");
}
export async function encodeCertificate(file: File): Promise<CertificateInput> {
  validateCertificateFile(file);
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(new Error("Não foi possível ler o comprovante."));reader.readAsDataURL(file);
  });
  return { nome: file.name, tipo: file.type, conteudo_base64: base64 };
}
export const getCertificate = (user: string) => get<Certificate>(`/usuarios/${encodeURIComponent(user)}/comprovante`);
export const saveCertificate = async (user: string, file: File) => put<Certificate>(`/usuarios/${encodeURIComponent(user)}/comprovante`, await encodeCertificate(file));
