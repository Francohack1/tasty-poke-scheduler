const fs=require('fs'),path=require('path');const {JSDOM,VirtualConsole}=require('jsdom');
function app(cfg){
  const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
  const w=new JSDOM(html,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/'}).window;
  w.cloudEnabled=false;w.confirm=()=>true;cfg&&cfg(w);w.doGenerateAll();return w;
}
let bad=0;const ok=(c,m)=>{console.log((c?'  ✅ ':'  ❌ ')+m);if(!c)bad++;};
// cuenta los dias libres REALES de cada persona en todas las semanas generadas
function diasLibres(w){
  const out=[];const sv=w.weekOff;
  const semanas=Object.keys(w.genWeeks).map(Number).sort((a,b)=>a-b);
  for(const s of semanas){
    w.weekOff=s;w._wdc=null;
    for(const e of w.emps){
      let trab=0;
      for(let d=0;d<7;d++){const st=w.gS(e.id,d);if(st&&st.t==='work')trab++;}
      out.push({sem:s,nombre:e.name,trabaja:trab,libres:7-trab});
    }
  }
  w.weekOff=sv;w._wdc=null;return out;
}

for(const RD of [1,2,3]){
  console.log('\n═══ Descanso mínimo configurado: '+RD+' día(s) ═══');
  const w=app(x=>{
    x.document.getElementById('cfg-rd').value=String(RD);
    x.document.getElementById('cfg-op').value='12:00';
    x.document.getElementById('cfg-cl').value='23:00';
    x.emps.forEach(e=>{e.ap=false;e.ot=false;});
  });
  const rep=w._sugerencias.filter(s=>s.tipo==='repartir');
  console.log('  Propuestas de "repartir en más días": '+rep.length);
  rep.forEach(s=>{const e=w.eById(s.id);
    console.log('     · '+e.name+': '+w.workDays(e)+' → '+(w.workDays(e)+1)+' días  (máximo legal aquí: '+(7-RD)+')');});
  ok(rep.every(s=>w.workDays(w.eById(s.id))+1<=7-RD),'ninguna propone pasar de '+(7-RD)+' días');

  // aplicamos TODAS las de repartir, una tras otra, y miramos el horario real
  rep.forEach((s,i)=>{w._sugerencias.indexOf(s)>=0&&w.aplicarSugerencia(w._sugerencias.indexOf(s));});
  const dl=diasLibres(w);
  const infractores=dl.filter(x=>x.libres<RD);
  ok(infractores.length===0,'tras aplicarlas, nadie baja de '+RD+' día(s) libre(s) en ninguna semana');
  if(infractores.length)infractores.slice(0,6).forEach(x=>console.log('        ❌ '+x.nombre+' sem'+x.sem+': solo '+x.libres+' libre(s)'));
  const min=Math.min(...dl.map(x=>x.libres)),max=Math.max(...dl.map(x=>x.trabaja));
  console.log('     Mínimo de días libres observado: '+min+'   ·   máximo de días trabajados: '+max);
}

console.log('\n═══ Y el límite duro, tocado a mano (wd=7 forzado) ═══');
const w2=app(x=>{x.document.getElementById('cfg-rd').value='2';x.emps.forEach(e=>{e.wd=7;});});
const dl2=diasLibres(w2);
const inf2=dl2.filter(x=>x.libres<2);
ok(inf2.length===0,'aunque pongas wd=7 a mano, el generador sigue dando 2 libres');
if(inf2.length)inf2.slice(0,5).forEach(x=>console.log('        ❌ '+x.nombre+' sem'+x.sem+': '+x.libres+' libre(s)'));
console.log(bad?'\n❌ '+bad+' fallos\n':'\n✅ TODO OK\n');process.exit(bad?1:0);
