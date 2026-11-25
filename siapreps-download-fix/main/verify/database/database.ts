import Database from 'better-sqlite3';
import { decryptData } from '../../../encryptDir/config_encryption';
import fs from 'fs';
import Store from "electron-store";
// Função para criar o banco de dados

export async function criarBanco(nomeArquivo: string) {
    try {
        // Verificar se o arquivo existe
        fs.accessSync(nomeArquivo);
        return true; // O arquivo existe
    } catch{
        //se não existe cria o banco
        const db = new Database(nomeArquivo);
        db.exec('CREATE TABLE IF NOT EXISTS image (id INTEGER PRIMARY KEY, name TEXT,base64 TEXT, data DATE DEFAULT CURRENT_DATE)');
        db.close();
    }
}

// Função para inserir dados
const store = new Store();

export async function inserirDados(nomeArquivo: string, nome: string, buffer: Buffer, data: string) {
    const db = new Database(nomeArquivo);
    const existingRow = db.prepare('SELECT * FROM image WHERE name = ?').get(nome);

    if (!existingRow) {
        const insert = db.prepare('INSERT INTO image (name, base64, data) VALUES (?, ?, ?)');
        const result = insert.run(nome, buffer, data);

        if (result.changes > 0) {
            console.log('Inserção realizada com sucesso!');
            store.set('log-inserir', 'tiff inserido');
        } else {
            console.log('Nenhuma linha foi inserida.');
            store.set('log-erro-inserir', 'tiff nao foi inserido');
        }

    } else {
        console.log('atual (no banco): ', existingRow.data);
        console.log('novo dado recebido: ', nome, data);
        store.set('verify-date', data);

        // Comparar buffers
        const bufferAntigo: Buffer = existingRow.base64;
        const isEqual = Buffer.compare(buffer, bufferAntigo) === 0;

        if (!isEqual) {
            const update = db.prepare('UPDATE image SET data = ?, base64 = ? WHERE name = ?');
            const result = update.run(new Date(data).toISOString(), buffer, nome);

            if (result.changes > 0) {
                console.log('Atualização realizada com sucesso!');
                store.set('log-atualizar', 'tiff atualizado');
            } else {
                console.log('Nenhuma linha foi atualizada.');
                store.set('log-erro-atualizar', 'tiff nao foi atualizado');
            }
        } else {
            console.log('Esse é o TIFF mais atualizado');
        }
    }

    db.close();
}

// Função para selecionar dados
export async function selecionarDados(nomeArquivo: string) {
    const db = new Database(nomeArquivo);
    const rows = db.prepare('SELECT * FROM image').all();
    db.close();
    return rows;
}
export async function limparDados(nomeArquivo: string){
    const db = new Database(nomeArquivo);
    db.prepare(`DELETE FROM image`).run();
    db.close();
}

// Função para verificar se um nome de arquivo corresponde a um peixe conhecido
function verificarNomeDePeixe(nomeArquivo: string) {
    const nomesDePeixesParaArquivos = {
        "anchova": "engraulis_anchoita.tif",
        "enchova":"pomatomus_saltatrix.tif",
        "merluza": "merluccius_hubbsi.tif",
        "corvina": "micropogonia_funieri.tif",
        "sardinha": "sardinella_brasiliensis.tif",
        "atum yellowfin": "thunnus_alalunga.tif",
        "atum voador": "thunnus_albacares.tif",
        "atum olhudo": "thunnus_obesus.tif",
        "abrótea": "urophycis_brasiliensis.tif",
        "tainha": "mugil_liza.tif",
        "pescada branca": "merluccius_merluccius.tif",
        "bonito listrado": "katsuwonus_pelamis.tif",
        "meka": "xiphias_gladius.tif",
        "bagre":"genidens_barbus.tif"
    };

    return Object.values(nomesDePeixesParaArquivos).some((nome) => nomeArquivo.includes(nome));
}

// Função para verificar se algum nome de arquivo do banco de dados corresponde a um peixe conhecido
// function verificarNomesDePeixesNoBanco(nomeArquivo: string, pngBlob: { nome: string, blob: string }[]) {
//     const db = new Database(nomeArquivo);
//     const rows = db.prepare('SELECT name, base64, data FROM image').all();
//     db.close();

//     for (const row of rows) {
//         if (verificarNomeDePeixe(row.name)) {
//             const blob = decryptData(row.base64);
//             // Adicione o nome do arquivo e o blob ao array pngBlob
//             pngBlob.push({ nome: row.name, blob: blob });
//         }
//     }
// }

