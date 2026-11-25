#!/bin/sh
# Lista os nomes das variáveis de armazenamento e identifica quais clientes S3 ou MinIO estão instalados.
set -e
node - <<'JS'
const env=process.env;
console.log(Object.keys(env).filter(x=>x.startsWith('STORAGE_')).sort().join(' '));
for(const mod of ['@aws-sdk/client-s3','aws-sdk','minio'])try{require.resolve(mod);console.log('client',mod)}catch{}
JS
