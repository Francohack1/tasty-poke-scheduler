const fs=require('fs');const {JSDOM,VirtualConsole}=require('jsdom');
const {reglasRotas,rotasEnSilencio,estadoSano}=require('./qa-invariantes.js');
const RAW=fs.readFileSync('index.html','utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
const D=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
let bad=0;const ok=(c,m,x)=>{if(!c)bad++;console.log((c?'  ✅ ':'  ❌ ')+m+(x&&!c?'  → '+x:''));};
const w=new JSDOM(RAW,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/'}).window;
w.cloudEnabled=false;
console.log('\n═══ La semana, con los partidos bien hechos ═══');
const S=w.genFromOff();w.weekOff=S;w._wdc=null;
for(const e of w.emps){const l=[];
  for(let d=0;d<7;d++){const x=w.gS(e.id,d);
    l.push(x&&x.t==='work'?(x.sh==='p'?x.ms+'-'+x.me+'/'+x.as_+'-'+x.ae:x.s+'-'+x.e):'—');}
  const q=w.empW(e);
  console.log('   '+e.name.padEnd(10)+l.map(v=>v.padEnd(22)).join('')+q.tot.toFixed(1)+'h'+(q.ext>0.05?' (+'+q.ext.toFixed(1)+')':''));}
console.log('\n   personas y puntas por día:');
for(let d=0;d<7;d++){
  let n=0,h=0;for(const e of w.emps){const x=w.gS(e.id,d);if(x&&x.t==='work'){n++;h+=w.shH(x);}}
  const p=[];for(const pk of w.peaks){if(pk.days.indexOf(d)<0)continue;
    let c=0;for(const e of w.emps)if(w.overlaps(w.gS(e.id,d),pk.start,pk.end))c++;
    p.push(pk.name.slice(0,4)+' '+c+'/'+pk.min+(c>=pk.min?'✓':'✗'));}
  console.log('      '+D[d]+'  '+n+'p '+h.toFixed(1)+'h   '+p.join('  '));}
console.log('\n═══ Reglas ═══');
ok(reglasRotas(w).length===0,'ninguna regla dura rota',reglasRotas(w).slice(0,3).map(x=>x.join(' ')).join(' · '));
ok(rotasEnSilencio(w).length===0,'nada roto en silencio');
ok(estadoSano(w).length===0,'estado sano');
let hue=0,corto=99,pausaMin=99;
for(const s of Object.keys(w.genWeeks).map(Number)){w.weekOff=s;w._wdc=null;
  for(let d=0;d<7;d++)for(const g of w.getCovSegs(d))if(g.cnt===0&&!g.inPause)hue+=g.e-g.s;
  for(const e of w.emps)for(let d=0;d<7;d++){const x=w.gS(e.id,d);
    if(!x||x.t!=='work')continue;
    corto=Math.min(corto,w.shH(x));
    if(x.sh==='p'){pausaMin=Math.min(pausaMin,(w.tm(x.as_)-w.tm(x.me))/60);
      corto=Math.min(corto,(w.tm(x.me)-w.tm(x.ms))/60,(w.tm(x.ae)-w.tm(x.as_))/60);}}}
ok(hue===0,'cero minutos sin cubrir en 5 semanas');
ok(pausaMin>=2,'pausa mínima de los partidos: '+(pausaMin===99?'—':pausaMin.toFixed(1)+'h'));
ok(corto>=1.5,'tramo más corto: '+corto.toFixed(1)+'h (mínimo 1,5h, como en tus horarios)');
console.log(bad?'\n❌ '+bad+' fallos\n':'\n✅ TODO OK\n');process.exit(bad?1:0);
