#!/bin/sh
# Identifica o destino do banco e do armazenamento configurados no ambiente da aplicação.
set -e
node -e 'for(const k of ["DATABASE_URL","STORAGE_ENDPOINT"]){const v=process.env[k];if(!v)continue;const h=new URL(v).hostname;console.log(k,h.includes("rds.amazonaws.com")?"RDS":h.includes("postgres")?"PostgreSQL na rede interna":h)}'
