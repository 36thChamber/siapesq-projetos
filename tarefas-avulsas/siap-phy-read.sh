#!/bin/sh
# Testa paginação e leitura parcial dos produtos pela camada de serviço do PhytoBloom.
set -e
cd "${APP_DIR:?Informe APP_DIR}" || exit 1
node - <<'JS'
const service=require('./build/src/services/analises-services').default;
(async()=>{for (const token of [undefined,'archive:first']){const items=await service.list(token);if(!items.total)throw Error('Lista vazia');const response=await service.download(items.analises[0].nome,'bytes=0-15');const b=await response.Body.transformToByteArray();if(b.length!==16||response.$metadata.httpStatusCode!==206)throw Error('Range divergente');console.log('VERIFICADO',token?'arquivo':'diario',items.total,b.length)}})().catch(e=>{console.error(e.name||'Erro',e.code||e.status||'');process.exit(1)});
JS
