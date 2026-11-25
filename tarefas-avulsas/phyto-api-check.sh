#!/bin/sh
# Consulta a primeira página de análises e testa a leitura parcial de um produto diário.
set -e
cd "${APP_DIR:?Informe APP_DIR}" || exit 1
node <<'JS'
const Service=require('./build/src/services/analises-services').default;
(async()=>{
const first=await Service.list();
console.log('Primeira página:', first.total);
const daily=first.analises.filter(x=>/^\d+_2026_11_/.test(x.nome));
if (daily.length) {
const p=daily[0];
const result=await Service.download(p.nome,'bytes=0-15');
const buf=await result.Body.transformToByteArray();
if(buf.length!==16||!result.ContentRange?.startsWith('bytes 0-15/'))throw Error('Intervalo inválido');
console.log('Produto:',p.nome,'HTTP',result.$metadata.httpStatusCode);
}
})().catch(e=>{console.log('Falha',e.name||e.status);process.exit(1)});
JS
