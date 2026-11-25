// Repete listagens e downloads nas APIs SIAPREPS e PhytoBloom e compara os arquivos com hashes esperados.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
(async()=>{
const evidence=JSON.parse(fs.readFileSync('validacao-minio.json'));
for(const platform of ['siapreps','phytobloom']){
 // Cada plataforma usa suas próprias configurações no ambiente do processo.
 for (const key of ['DAILY_RASTER_ENDPOINT', 'DAILY_RASTER_BUCKET', 'DAILY_RASTER_ACCESS_KEY_ID', 'DAILY_RASTER_SECRET_ACCESS_KEY']) {
   const value = process.env[platform.toUpperCase() + '_' + key];
   if (!value) throw Error('Configuração ausente: ' + platform + '_' + key);
   process.env[key] = value;
 }
 const Api=require(path.resolve('integracoes/api-'+platform+'/build/src/services/analises-services.js')).default;
 const api=platform==='siapreps'?new Api():Api;
 const list=platform==='siapreps'?(await api.listarAnalises()).objetos.map(o=>o.key):(await api.list()).analises.map(o=>o.nome);
 const expected=evidence.filter(o=>o.platform===platform);
 assert.deepEqual(list.sort(),expected.map(o=>o.key).sort());
 for(const o of expected){
 const buffer=platform==='siapreps'?Buffer.from(await new Response((await api.downloadAnalise(o.key)).readStream).arrayBuffer()):Buffer.from(await (await api.download(o.key)).Body.transformToByteArray());
 assert.equal(crypto.createHash('sha256').update(buffer).digest('hex'),o.sha256);
 }
 console.log(platform+' listagem e download verificados: '+list.length);
}
})().catch(e=>{console.error(e.name,e.message);process.exitCode=1});
