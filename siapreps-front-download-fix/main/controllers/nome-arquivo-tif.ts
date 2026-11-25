/**
 * nome_arquivo, nome_arquivo_30 vêm da API sem extensão (ex.: "guariba").
 * nome_arquivo_nacional, nome_arquivo_otimista, nome_arquivo_pessimista,
 * nome_arquivo_30_otimista, nome_arquivo_30_pessimista,
 * nome_arquivo_rs_otimista, nome_arquivo_rs_pessimista vêm com ".tif" já
 * incluso (ex.: "Alouatta_guariba_..._adequabilidade.tif").
 * Concatenar ".tif" sem checar duplica a extensão e quebra o path no bucket.
 */
export function garantirExtensaoTif(nomeArquivo: string): string {
  return nomeArquivo.toLowerCase().endsWith(".tif")
    ? nomeArquivo
    : `${nomeArquivo}.tif`;
}
