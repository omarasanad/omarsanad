const { chromium } = require('/opt/node-tools/node_modules/playwright');const path=require('path'),fs=require('fs');
(async()=>{const [mode,dur,out]=process.argv.slice(2);fs.mkdirSync(out,{recursive:true});
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--allow-file-access-from-files']});
 const p=await b.newPage({viewport:{width:1080,height:1920}});await p.goto('file://'+path.resolve('io.html'));await p.evaluate(()=>window.ready);await p.waitForTimeout(300);
 const N=Math.round(+dur*30);for(let f=0;f<N;f++){await p.evaluate(([m,t])=>render(m,t),[mode,f/30]);await p.screenshot({path:`${out}/f${String(f).padStart(4,'0')}.jpg`,type:'jpeg',quality:95})}
 console.log(mode,N);await b.close()})();
