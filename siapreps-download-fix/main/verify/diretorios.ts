import fs from 'fs';
import os from 'os';
import path from 'path';

function verificaDiretorioSiapesq(): void {
    const diretorioRaizUsuario = os.homedir();
    const diretorioSiapesq = path.join(diretorioRaizUsuario, 'Siapesq');
    const diretorioMapas = path.join(diretorioSiapesq, 'MapsPng')
    const diretorioPdf = path.join(diretorioSiapesq,'documents')

    try {
        // Verifica se o diretório existe
        if (fs.existsSync(diretorioSiapesq)) {
            console.log(`O diretório '${diretorioSiapesq}' existe.`);
        } else {
            // Se não existe, cria o diretório
            fs.mkdirSync(diretorioSiapesq);
            fs.mkdirSync(diretorioMapas)
            fs.mkdirSync(diretorioPdf)

            console.log(`O diretório '${diretorioSiapesq}' foi criado.`);
        }
    } catch (err) {
        console.error('Erro ao verificar o diretório:', err);
    }
}

// Chama a função para verificar o diretório "Siapesq" no diretório raiz do usuário
export default verificaDiretorioSiapesq;

