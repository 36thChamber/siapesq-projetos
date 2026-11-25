#!/bin/sh
# Testa a conexão e a autenticação de e-mail configuradas, sem enviar uma mensagem.
set -e
cd "${APP_DIR:?Informe APP_DIR}" || exit 1
node - <<'JS'
const n=require('nodemailer'); n.createTransport({service:'gmail',auth:{user:process.env.EMAIL,pass:process.env.SENHA_EMAIL},connectionTimeout:8000}).verify().then(()=>console.log('SMTP OK')).catch(e=>console.log('SMTP ERROR',e.code,e.responseCode));
JS
