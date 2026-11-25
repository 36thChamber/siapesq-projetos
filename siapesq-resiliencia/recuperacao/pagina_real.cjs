// Entrada do Next e TLS somente no loopback, com o mesmo domínio para os bytes e a página.
const http=require('node:http'), https=require('node:https'), fs=require('node:fs');
const {spawn}=require('node:child_process'), path=require('node:path'), {once}=require('node:events');
const net=require('node:net'), assert=require('node:assert/strict');
async function port(){
 const reservation=net.createServer();reservation.listen(0,'127.0.0.1');await once(reservation,'listening');
 const selected=reservation.address().port;await new Promise(cb=>reservation.close(cb));return selected;
}
module.exports=async function check({apiOrigin,frontend,browser,identity,species,scenario,manifest,work}){
 const nextPort=await port(), bytePort=new URL(process.env.DAILY_RASTER_ENDPOINT).port;
 const options={key:fs.readFileSync(path.join(work,'chave.pem')),cert:fs.readFileSync(path.join(work,'cert.pem'))};
 const proxy=https.createServer(options,(req,res)=>{
  const to=req.url.startsWith('/siapesq-cog-vps/')?bytePort:nextPort;
  const upstream=http.request({hostname:'127.0.0.1',port:to,method:req.method,path:req.url,headers:req.headers},r=>{
    res.writeHead(r.statusCode,r.headers);r.pipe(res);
  });
  upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end();});req.pipe(upstream);
 });
 proxy.listen(0,'127.0.0.1');await once(proxy,'listening');
 const origin='https://127.0.0.1:'+proxy.address().port;
 const env={...process.env,HOSTNAME:'127.0.0.1',PORT:String(nextPort),NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1',
    API_URL:apiOrigin,COG_MIRROR_ENDPOINT:origin,COG_MIRROR_BUCKET:'siapesq-cog-vps',COG_MIRROR_REGION:'us-east-1',
    COG_MIRROR_ACCESS_KEY_ID:process.env.DAILY_RASTER_ACCESS_KEY_ID,COG_MIRROR_SECRET_ACCESS_KEY:process.env.DAILY_RASTER_SECRET_ACCESS_KEY,
    COG_MANIFEST_PATH:manifest,COG_BUCKET:'example-bucket',AWS_REGION:'sa-east-1',COG_PREFIX:'siapesq-cog-clone/2026-11-13/catalog-20261114T015819Z/',
    NODE_EXTRA_CA_CERTS:path.join(work,'cert.pem')};
 const next=spawn('node',[path.join(frontend,'.next/standalone/server.js')],{env,stdio:'ignore'});
 const context=await browser.newContext({ignoreHTTPSErrors:true});
 const seen=[], denied=new Set();
 try{
  const timeout=Date.now()+12000;
  while(Date.now()<timeout){try{if((await fetch('http://127.0.0.1:'+nextPort+'/login')).ok)break;}catch{}await new Promise(r=>setTimeout(r,200));}
  const page=await context.newPage();
  await page.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
  page.on('response',r=>{const u=new URL(r.url());if(u.origin===origin&&u.pathname.startsWith('/siapesq-cog-vps/')&&r.status()===206)seen.push(1);if(r.status()>=400)denied.add(u.pathname+'='+r.status());});
  await page.goto(origin+'/login',{waitUntil:'domcontentloaded'});
  const status=await page.evaluate(async creds=>(await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(creds)})).status,identity);
  assert.equal(status,200);
  await page.goto(origin+'/map/'+species,{waitUntil:'domcontentloaded'});
  const future=/^futuro_(2050|2100)_ssp(245|585)$/.exec(scenario);
  const monthly=/^mensal_(0[1-9]|1[0-2])_(.+)$/.exec(scenario);
  let label;
  if(future){
    await page.getByRole('button',{name:'Futuro',exact:true}).click({timeout:13000});
    label='Futuro '+future[1]+' — '+(future[2]==='585'?'Pessimista':'Otimista');
  } else if(monthly){
    await page.getByRole('button',{name:'Mensal',exact:true}).click({timeout:13000});
    const month=new Intl.DateTimeFormat('pt-BR',{month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(2024,Number(monthly[1])-1,15)));
    label=month[0].toUpperCase()+month.slice(1);
  } else {
    assert.equal(scenario,'anual_2015_2024');label='Anual';
  }
  const control=page.getByRole('checkbox',{name:label,exact:true}).first();
  await control.check({timeout:10000});
  const hasPixels=()=>Array.from(document.querySelectorAll('.cog-raster-layer canvas')).some(canvas=>{
   const rgba=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
   return rgba.some((byte,i)=>i%4===3&&byte>0);
  });
  await page.waitForFunction(hasPixels,null,{timeout:16000});assert(seen.length>0);
  return {login_cookie:status,rota:'/map/[especie]',cenario:scenario,http_206:seen.length,canvas_com_pixels:true,
    frontend_build_id:fs.readFileSync(path.join(frontend,'.next/standalone/.next/BUILD_ID'),'utf8').trim()};
 }catch(err){
  throw Error('Página real: '+String(err.message).split('\n')[0]+' '+Array.from(denied).slice(0,8).join(' '));
 }finally{
  await context.close();next.kill('SIGTERM');proxy.closeAllConnections();await new Promise(cb=>proxy.close(cb));
 }
};
