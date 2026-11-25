import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

// Caminho do .env a partir do diretório atual (que é tests/connection-database)
const envPath = path.resolve(process.cwd(), '../../.env');
console.log('📁 Carregando .env de:', envPath);

if (!fs.existsSync(envPath)) {
  console.error(`❌ Arquivo .env não encontrado em: ${envPath}`);
  process.exit(1);
}

dotenv.config({ path: envPath });

import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não definida');
  console.log('🔍 Variáveis disponíveis:', Object.keys(process.env));
  process.exit(1);
}

const maskedUrl = DATABASE_URL.replace(/:[^:@]*@/, ':****@');

const client = new Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function testConnection() {
  console.log('🟡 Conectando ao banco...');
  console.log(`🔗 URL: ${maskedUrl}`);
  try {
    await client.connect();
    console.log('✅ Conectado com sucesso!');
    const res = await client.query('SELECT 1 as teste');
    console.log('✅ Query executada:', res.rows[0]);
    await client.end();
    console.log('✅ Conexão encerrada.');
  } catch (err: any) {
    console.error('❌ Erro:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

testConnection();