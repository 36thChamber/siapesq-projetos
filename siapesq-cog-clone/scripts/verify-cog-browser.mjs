import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const output = new URL(process.env.COG_VERIFY_OUTPUT || '../artifacts/cog/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('manifest.json', output)));
const bundle = await build({ stdin: { contents: `
import { loadCogRaster } from './utils/loadCogRaster';
import RasterLayer from './lib/cog/CogTileLayer';
import L from 'leaflet';
import { getSuitabilityColorForValues } from './utils/suitabilityColor';
window.runCog = async ({url,samples=[]}) => {
  const raster = await loadCogRaster(url);
  const values = await raster.getValues({left: 0, top: 0, right: raster.width, bottom: raster.height, width: 32, height: 32});
  for (const s of samples) {
    const pixel=await raster.getValues({left:s.col,top:s.row,right:s.col+1,bottom:s.row+1,width:1,height:1});
    if(pixel[0][0][0]!==s.value) throw new Error("Native pixel mismatch");
  }
  return {samplesVerified:samples.length,width:raster.width,height:raster.height,projection:raster.projection,finiteSamples:values[0].flat().filter(Number.isFinite).length};
};
window.drawCog = async url => {
  const raster = await loadCogRaster(url);
  const map = L.map('map', {zoomControl:false, attributionControl:false});
  const layer = new RasterLayer({georaster:raster,resolution:64,pixelValuesToColorFn:getSuitabilityColorForValues});
  const loaded = new Promise(resolve => layer.once('load',resolve));
  layer.addTo(map); map.fitBounds(layer.getBounds());
  await loaded;
  return document.querySelectorAll('canvas').length;
};`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, format: 'iife', platform: 'browser', write: false });
const css = await readFile('node_modules/leaflet/dist/leaflet.css');
const server = createServer((req, res) => {
  if (req.url === '/bundle.js') {res.setHeader('Content-Type','text/javascript'); res.end(bundle.outputFiles[0].contents);}
  else if (req.url === '/leaflet.css') {res.setHeader('Content-Type','text/css'); res.end(css);}
  else {res.setHeader('Content-Type','text/html'); res.end('<!doctype html><meta charset="utf-8"><title>SIAPESQ COG validation</title><link rel="stylesheet" href="/leaflet.css"><style>body{margin:0;background:#142c31;color:white;font:18px sans-serif}h1{padding:10px 24px}#map{height:680px;background:#dce6e0}</style><h1>SIAPESQ · leitura COG por HTTP Range</h1><div id="map"></div><script src="/bundle.js"></script>');}
});
await new Promise(resolve => server.listen(Number(process.env.COG_PREVIEW_PORT||3000),'127.0.0.1',resolve));
const browser = await chromium.launch({headless:true, executablePath:process.env.COG_BROWSER_EXECUTABLE});
const page = await browser.newPage({viewport:{width:1280,height:800}});
const errors=[]; const ranges=[];
page.on('console', message => { if(message.type()==='error') console.error(message.text().replace(/https?:[^\s'"]+/g, '[URL redacted]')); });
page.on('requestfailed', request => console.error('Network:', request.failure()?.errorText));
page.on('pageerror', e => errors.push(e.message));
page.on('response', async r => {
  if (r.url().includes('.amazonaws.com')) ranges.push({status:r.status(),bytes:Number(r.headers()['content-length']||0),range:r.headers()['content-range']||null});
});
const s3 = new S3Client({region:process.env.AWS_REGION||'sa-east-1'});
try {
  await page.goto(`http://localhost:${server.address().port}`);
  const samples=JSON.parse(await readFile(new URL("native-samples.json",output)));
  const results=[];
  for (const e of manifest.files) {
    const url=await getSignedUrl(s3,new GetObjectCommand({Bucket:e.bucket,Key:e.key}),{expiresIn:900});
    const metadata=await page.evaluate(input=>window.runCog(input),{url,samples:samples[e.source_key]});
    results.push({key:e.key,...metadata});
  }
  const first=manifest.files[0];
  const url=await getSignedUrl(s3,new GetObjectCommand({Bucket:first.bucket,Key:first.key}),{expiresIn:900});
  const canvases=await page.evaluate(url=>window.drawCog(url),url);
  await page.screenshot({path:new URL('browser-cog.png',output).pathname});
  if(errors.length || !ranges.length || ranges.some(r=>r.status!==206) || !canvases) throw new Error(JSON.stringify({errors,ranges,canvases}));
  const report={results,rangeRequests:ranges.length,bytesTransferred:ranges.reduce((sum,r)=>sum+r.bytes,0),allResponses206:true,canvases,errors};
  await writeFile(new URL('browser-verification.json',output),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
} finally {await browser.close(); await new Promise(resolve=>server.close(resolve));}
