const fs=require('fs');const {JSDOM,VirtualConsole}=require('jsdom');
const RAW=fs.readFileSync('index.html','utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
const D=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const w=new JSDOM(RAW,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/'}).window;
w.cloudEnabled=false;w.limitePreguntar=false;
const S=w.genFromOff(); w.weekOff=S; w._wdc=null;
console.log('\nContador honesto — mínimo de gente DURANTE toda la franja:\n');
let cub=0,tot=0;
for(let d=0;d<7;d++){
  const p=[];
  for(const pk of w.peaks){ if(pk.days.indexOf(d)<0)continue; tot++;
    const n=w.gentePunta(d,pk); if(n>=pk.min)cub++;
    p.push(pk.name.slice(0,4)+' '+n+'/'+pk.min+(n>=pk.min?'✓':'✗'));}
  const q=[];for(const e of w.emps){const x=w.gS(e.id,d);
    if(x&&x.t==='work')q.push(e.name.slice(0,4)+' '+(x.sh==='p'?x.ms+'-'+x.me+'/'+x.as_+'-'+x.ae:x.s+'-'+x.e));}
  console.log('  '+D[d]+'  '+p.join('  ').padEnd(26)+'  '+q.join('  '));
}
console.log('\n  esta semana: '+cub+'/'+tot+' franjas realmente cubiertas');
let c5=0,t5=0,hue=0,peor=0;
for(const s of Object.keys(w.genWeeks).map(Number)){
  w.weekOff=s;w._wdc=null;
  for(let d=0;d<7;d++){
    for(const g of w.getCovSegs(d))if(g.cnt===0&&!g.inPause)hue+=g.e-g.s;
    for(const e of w.emps){const x=w.gS(e.id,d);if(x&&x.t==='work')peor=Math.max(peor,w.shH(x));}
    for(const pk of w.peaks){if(pk.days.indexOf(d)<0)continue;t5++;if(w.gentePunta(d,pk)>=pk.min)c5++;}}}
console.log('  5 semanas  : '+c5+'/'+t5+' ('+(c5*100/t5).toFixed(0)+'%)   turno más largo '+peor.toFixed(1)+'h   huecos '+hue+'min');
process.exit(0);
