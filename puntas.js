const fs=require('fs');const {JSDOM,VirtualConsole}=require('jsdom');
const RAW=fs.readFileSync('index.html','utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
const D=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const w=new JSDOM(RAW,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/'}).window;
w.cloudEnabled=false;w.doGenerateAll();
console.log('Tienda '+w.gOP()+'–'+w.gCL()+'   ('+((w.tm(w.gCL())-w.tm(w.gOP()))/60)+'h al día)');
console.log('Franjas de alta demanda:');
w.peaks.forEach(p=>console.log('   '+p.name+'  '+p.start+'–'+p.end+'  mínimo '+p.min+' personas  ('+p.days.length+' días)'));
console.log('Equipo: '+w.emps.map(e=>e.name+' '+e.h+'h'+(e.ap?'':' (NO partido)')).join(', '));
console.log('        total '+w.emps.reduce((s,e)=>s+e.h,0)+'h de contrato\n');
const horasLocal=(w.tm(w.gCL())-w.tm(w.gOP()))/60;
let horasPunta=0;
w.peaks.forEach(p=>{horasPunta+=((w.tm(p.end)-w.tm(p.start))/60)*p.days.length*(p.min-1);});
const necesita=horasLocal*7+horasPunta, tiene=w.emps.reduce((s,e)=>s+e.h,0);
console.log('LAS CUENTAS:');
console.log('   tener a 1 persona de apertura a cierre:  '+(horasLocal*7).toFixed(0)+'h');
console.log('   la 2ª persona en las franjas de punta:   '+horasPunta.toFixed(0)+'h');
console.log('   ──────────────────────────────────────────────');
console.log('   HARÍAN FALTA                             '+necesita.toFixed(0)+'h');
console.log('   tu equipo tiene                          '+tiene+'h');
console.log('   '+(necesita>tiene?'FALTAN                                   '+(necesita-tiene).toFixed(0)+'h':'sobran '+(tiene-necesita).toFixed(0)+'h')+'\n');
let flojas=0,totalP=0,det=[];
const S=Math.min(...Object.keys(w.genWeeks).map(Number));
for(const s of Object.keys(w.genWeeks).map(Number)){
  w.weekOff=s;w._wdc=null;
  for(let d=0;d<7;d++)for(const p of w.peaks){
    if(p.days.indexOf(d)<0)continue;totalP++;
    let c=0;for(const e of w.emps)if(w.overlaps(w.gS(e.id,d),p.start,p.end))c++;
    if(c<p.min){flojas++;if(s===S)det.push(D[d]+'  '+p.name.padEnd(9)+p.start+'–'+p.end+':  '+c+' de '+p.min);}
  }
}
console.log('LO QUE SALE:');
console.log('   franjas flojas: '+flojas+' de '+totalP+'  ('+(flojas*100/totalP).toFixed(0)+'%)');
console.log('   primera semana:');det.forEach(x=>console.log('      ⚠ '+x));
w.weekOff=S;w._wdc=null;
let np=0,nc=0;for(let d=0;d<7;d++)for(const e of w.emps){const x=w.gS(e.id,d);if(!x||x.t!=='work')continue;x.sh==='p'?np++:nc++;}
console.log('\n   turnos partidos: '+np+'   corridos: '+nc);
console.log('\n   La semana:');
for(const e of w.emps){const l=[];for(let d=0;d<7;d++){const x=w.gS(e.id,d);
  l.push(x&&x.t==='work'?(x.sh==='p'?x.ms+'-'+x.me+'/'+x.as_+'-'+x.ae:x.s+'-'+x.e):'—');}
  console.log('      '+e.name.padEnd(10)+l.map(v=>v.padEnd(22)).join(''));}
process.exit(0);
