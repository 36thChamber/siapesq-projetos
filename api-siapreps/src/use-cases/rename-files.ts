import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Renomeia arquivos com padrão " copy.ts" para "-backup.ts" recursivamente.
 * @param rootDir - Diretório raiz onde a busca será iniciada.
 */
async function renameCopyFiles(rootDir: string): Promise<void> {
  try {
    // Verifica se o diretório existe
    await fs.access(rootDir);

    const resultados = await processarDiretorio(rootDir);
    console.log(`✅ Renomeação concluída. ${resultados.renomeados} arquivo(s) renomeado(s).`);
    if (resultados.pulados.length > 0) {
      console.warn(`⚠️ ${resultados.pulados.length} arquivo(s) pulado(s) (destino já existe):`);
      resultados.pulados.forEach(p => console.warn(`   ${p}`));
    }
  } catch (error) {
    console.error(`❌ Erro ao acessar o diretório "${rootDir}":`, error);
    process.exit(1);
  }
}

interface ProcessResult {
  renomeados: number;
  pulados: string[];
}

async function processarDiretorio(dir: string): Promise<ProcessResult> {
  let renomeados = 0;
  const pulados: string[] = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Processa subpastas recursivamente
        const subResult = await processarDiretorio(fullPath);
        renomeados += subResult.renomeados;
        pulados.push(...subResult.pulados);
        continue;
      }

      // Verifica se é um arquivo com nome terminando em " copy.ts"
      if (entry.isFile() && entry.name.endsWith(' copy.ts')) {
        // Gera o novo nome substituindo " copy.ts" por "-backup.ts"
        const novoNome = entry.name.replace(/ copy\.ts$/, '-backup.ts');
        const novoCaminho = path.join(dir, novoNome);

        // Verifica se o destino já existe
        try {
          await fs.access(novoCaminho);
          // Se chegou aqui, o arquivo destino existe -> pula
          pulados.push(fullPath);
          console.warn(`⚠️ Pulando "${fullPath}" -> destino "${novoCaminho}" já existe.`);
          continue;
        } catch {
          // Destino não existe, pode renomear
        }

        // Renomeia o arquivo
        try {
          await fs.rename(fullPath, novoCaminho);
          console.log(`✅ Renomeado: "${fullPath}" -> "${novoCaminho}"`);
          renomeados++;
        } catch (err) {
          console.error(`❌ Erro ao renomear "${fullPath}":`, err);
        }
      }
    }
  } catch (err) {
    console.error(`❌ Erro ao ler diretório "${dir}":`, err);
  }

  return { renomeados, pulados };
}

// --- Execução principal ---
const args = process.argv.slice(2);
const rootDir = args[0] || process.cwd(); // usa argumento ou diretório atual

console.log(`🔍 Iniciando renomeação em: ${rootDir}`);
renameCopyFiles(rootDir);