#!/bin/sh
# Testa listagem e leitura parcial de um raster com URL assinada pela aplicação.
set -e
cd "${APP_DIR:?Informe APP_DIR}" || exit 1
node - <<'JS'
const media=require('./build/repositories/scientific-media.js');
(async()=>{const r=media.rasterRepository(), b=process.env.COG_MIRROR_BUCKET;const page=await r.listar_objetos(b);const key=page.Contents.find(x=>x.Size>16).Key;const url=await r.assinar_leitura_objeto(b,key,30);const res=await fetch(url,{headers:{Range:'bytes=0-15'}});if(res.status!==206||(await res.arrayBuffer()).byteLength!==16)throw Error('range');console.log('LISTA_RANGE_OK',page.Contents.length,res.status);})().catch(e=>{console.error(e.code||e.name);process.exit(1)});
JS
