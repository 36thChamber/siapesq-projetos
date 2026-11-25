const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require(process.argv[2]);
const path = require('node:path');
const root = path.resolve(__dirname,'..');
function load(file, mocks) {
  const source=fs.readFileSync(path.join(root,file),'utf8');
  const result=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true},reportDiagnostics:true});
  assert.equal((result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
  const module={exports:{}};
  vm.runInNewContext(result.outputText,{module,exports:module.exports,require:n=>n in mocks?mocks[n]:require(n),Buffer,Uint8Array,console:{log(){},error(){},warn(){}},global:{window:{localStorage:{getItem:()=>null}}}});
  return module.exports;
}
async function main() {
  const resolver = load('renderer/controllers/tiffObjects.ts',{});
  let bytes=Buffer.from([73,73,42,0,1]),writes=[],renames=[],requests=[];
  let names=[{name:'caranx_all'}];
  const key='predictions/daily/2026-11-15/caranx_all/caranx_all_rf_2026-11-15_mean.tif';
  const mod=load('renderer/controllers/downloadPng.ts',{
    './tiffObjects':resolver,
    '../components/funcao/encryptionUtils':{encryptDataNode:b=>b,encryptText:n=>Buffer.from(n).toString('base64'),decryptText:()=>''},
    '../controllers/pngsMapas':{get_pngs:async k=>{requests.push(k);return bytes},get_principal_pngs_names:async()=>names,list_pngs:async()=>({objects:[{Key:key}]})},
    '../resources/checarInternet':{checarConexaoInternet:async()=>true},
    fs:{existsSync:()=>true,promises:{writeFile:async(...v)=>writes.push(v),rename:async(...v)=>renames.push(v)}},
    os:{homedir:()=>'/mock'},path
  });
  assert.equal(await mod.get_all_pngs(),true);
  assert.equal(requests[0],key);
  assert.equal(writes.length,1);assert.equal(renames.length,1);
  assert.ok(writes[0][0].endsWith('.enc.tmp'));
  assert.ok(renames[0][1].endsWith('.enc'));
  writes=[];renames=[];bytes=Buffer.from('{"Code":"NoSuchKey"}');
  assert.equal(await mod.get_all_pngs(),false);
  assert.equal(writes.length,0);assert.equal(renames.length,0);
  names.push({name:'MS_bathymetry'});
  bytes=Buffer.from([73,73,42,0]);
  assert.equal(await mod.get_all_pngs(),false);
  // API sends complete key as an encoded query parameter, not as a filename/path guess.
  let request;
  const api=load('renderer/controllers/pngsMapas.ts',{
    axios:{get:async(...args)=>{request=args;return {data:bytes}}},
    './cookies':{getUserToken:()=> 'test-token'},'../resources/api':{BASE_API:'https://example.invalid'}
  });
  await api.get_pngs(key);
  assert.equal(request[0],'https://example.invalid/mapas/download');
  assert.equal(request[1].params.object_name,key);
  console.log('Download/API integration mocks passed: full key, atomic cache write, invalid body and missing layer fail safely');
}
main().catch(e=>{console.error(e);process.exitCode=1});
