// usage: node rend.js <port> <out> t1 t2 ...   OR  node rend.js <port> <out> --range a b fps
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs=require('fs');
(async()=>{const [port,out,...rest]=process.argv.slice(2);fs.mkdirSync(out,{recursive:true});
 let frames=[];if(rest[0]==='--range'){const [a,b,fps]=rest.slice(1).map(Number);for(let f=a;f<b;f++)frames.push([f,f/fps])}else rest.forEach((t,i)=>frames.push([i,+t]));
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 const p=await b.newPage({viewport:{width:1080,height:1920}});p.on('pageerror',e=>{console.error('PAGEERR',e.message);process.exit(2)});p.on('console',m=>{if(m.type()==='error')console.error('CONSOLE',m.text())});
 await p.goto(`http://127.0.0.1:${port}/reel.html`);await p.waitForFunction(()=>window.ready);await p.evaluate(()=>window.ready);
 const t0=Date.now();
 for(const [f,t] of frames){await p.evaluate(t=>render(t),t);await p.screenshot({path:`${out}/f${String(f).padStart(5,'0')}.jpg`,type:'jpeg',quality:rest[0]==='--range'?95:85});}
 console.log(`done ${frames.length} in ${((Date.now()-t0)/1000).toFixed(1)}s`);await b.close()})();
