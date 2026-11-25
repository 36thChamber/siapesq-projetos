#!/bin/sh
# Verifica disponibilidade do Python e testa autenticação SMTP com TLS no ambiente da aplicação.
set -e
command -v python3 || true
cd "${APP_DIR:?Informe APP_DIR}" || exit 1
node <<'JS'
const m = require("nodemailer");
const smtp = m.createTransport({host:"smtp.gmail.com",port:587,secure:false,requireTLS:true,connectionTimeout:10000,greetingTimeout:10000,socketTimeout:10000,auth:{user:process.env.EMAIL,pass:process.env.SENHA_EMAIL}});
smtp.verify().then(()=>console.log("SMTP_AUTH_OK")).catch(e=>console.log("SMTP_AUTH_FAIL",e.code||"",e.responseCode||""));
JS
