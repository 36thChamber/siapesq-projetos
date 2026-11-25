const { spawn } = require('node:child_process');
const { resolve } = require('node:path');
const { stagingEnvironment } = require('./dev-staging.cjs');
const env = { ...stagingEnvironment(process.cwd()), NODE_ENV: 'production', SIAPESQ_HOST: '127.0.0.1', PORT: '3000' };
if (process.argv.includes('--check')) console.log('Production build profile: exclusive loopback API and frontend.');
else {
  const child = spawn(process.execPath,[resolve(__dirname,'start-standalone.cjs')],{env,stdio:'inherit'});
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
  child.on('exit',code=>{process.exitCode=code??1;});
}
