#!/bin/sh
# Percorre o catálogo paginado, confere os 15 produtos esperados e lê os primeiros 16 bytes de cada um.
set -e
cd "${APP_DIR:?Informe APP_DIR}" || exit 1
node <<'JS'
(async()=>{
const s=require('./build/src/services/analises-services').default;
let next, products=[];
do{
 const page=await s.list(next);products.push(...page.analises);next=page.proximo_token;
}while(next?.startsWith('daily:'));
if(products.length!==15||new Set(products.map(p=>p.nome)).size!==15)throw Error('catalog');
for(const p of products) {
 const d=await s.download(p.nome,'bytes=0-15');
 const h=await d.Body.transformToByteArray();
 if(d.$metadata.httpStatusCode!==206||h.length!==16||d.ContentRange!=='bytes 0-15/'+p.tamanho)throw Error('range');
}
console.log('COGs lidos em produção:', products.length,'páginas de 10 e 5','histórico:',next);
})().catch(e=>{console.log('Falha',e.name||e.status);process.exit(1)});
JS
