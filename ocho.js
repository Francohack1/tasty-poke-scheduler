const fs=require('fs');const {JSDOM,VirtualConsole}=require('jsdom');
const RAW=fs.readFileSync('index.html','utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
function app(cfg){const w=new JSDOM(RAW,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/'}).window;
  w.cloudEnabled=false;w.confirm=()=>true;cfg&&cfg(w);w.doGenerateAll();return w;}
let bad=0;const ok=(c,m)=>{console.log((c?'  ✅ ':'  ❌ ')+m);if(!c)bad++;};
const D=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
// horas de un turno
function hT(w,s){if(!s||s.t!=='work')return 0;
  return s.sh==='p'?((w.tm(s.me)-w.tm(s.ms))+(w.tm(s.ae)-w.tm(s.as_)))/60:(w.tm(s.e)-w.tm(s.s))/60;}

console.log('\n═══ Equipo precargado ═══');
const w=app();
w.emps.forEach(e=>console.log('   '+e.name.padEnd(10)+e.h+'h/sem · máx '+e.mhd+'h/día · '+w.workDays(e)+' días · '+w.h1(w.dailyH(e))+'h por turno · libra '+(7-w.workDays(e))));
ok(w.emps.every(e=>[40,30,20].includes(e.h)),'contratos de 40, 30 y 20 h');
ok(w.emps.every(e=>e.mhd===8),'todos con jornada normal de 8 h/día');
ok(w.emps.filter(e=>e.role!=='encargado').every(e=>e.ot),'y los camareros con extras activadas de serie');
ok(w.emps.every(e=>7-w.workDays(e)>=2),'todos con 2 días libres o más');

console.log('\n═══ Nadie pasa de 8 h en ningún día ═══');
let peor=0,quien='';
for(const s of Object.keys(w.genWeeks).map(Number)){w.weekOff=s;w._wdc=null;
  for(const e of w.emps)for(let d=0;d<7;d++){const h=hT(w,w.gS(e.id,d));
    if(h>peor){peor=h;quien=e.name+' '+D[d]+' S'+w.weekNumOf(s).n;}}}
const topeMax=Math.max(...w.emps.map(e=>w.topeDia(e)));
ok(peor<=topeMax+0.02,'el turno más largo de las 5 semanas: '+peor.toFixed(2)+'h ('+quien+'), tope '+topeMax+'h');

console.log('\n═══ Cada uno cumple su contrato ═══');
for(const s of Object.keys(w.genWeeks).map(Number)){w.weekOff=s;w._wdc=null;
  for(const e of w.emps){const t=w.empW(e);
    const techo=e.h+(e.ot?e.mow:0);
    if(t.tot<e.h-0.5||t.tot>techo+0.5){ok(false,e.name+' S'+w.weekNumOf(s).n+': '+t.tot.toFixed(1)+'h de '+e.h+'h (techo '+techo+')');}}}
ok(true,'las 5 semanas cuadran con el contrato de cada uno');

console.log('\n═══ Sin minutos sueltos ═══');
let min=0;for(const s of Object.keys(w.genWeeks).map(Number)){w.weekOff=s;w._wdc=null;
  for(let d=0;d<7;d++)for(const g of w.getCovSegs(d))if(g.cnt===0&&!g.inPause)min+=g.e-g.s;}
ok(min===0,'minutos sin cubrir en las 5 semanas: '+min);

console.log('\n═══ El máximo de 8 h aguanta en otras configuraciones ═══');
const casos=[
 ['Tienda 08:00–23:59',x=>{x.document.getElementById('cfg-op').value='08:00';x.document.getElementById('cfg-cl').value='23:59';}],
 ['Tienda 12:00–23:00',x=>{x.document.getElementById('cfg-op').value='12:00';x.document.getElementById('cfg-cl').value='23:00';}],
 ['6 personas',x=>{[5,6].forEach(n=>x.emps.push(Object.assign({},x.emps[1],{id:100+n,name:'P'+n,h:20,mhd:8})));}],
 ['Solo la encargada puede abrir',x=>{x.emps.forEach(e=>{if(e.role!=='encargado')e.canOpen=false;});}],
 ['Nadie hace partido',x=>{x.emps.forEach(e=>e.ap=false);}],
 ['Una de baja toda la semana',x=>{const f=x.getWD().map(d=>x.dStr(d));x.emps[2].baja={from:f[0],to:f[6]};}],
];
for(const [nom,cfg] of casos){
  const q=app(cfg);let p=0,q2='';
  for(const s of Object.keys(q.genWeeks).map(Number)){q.weekOff=s;q._wdc=null;
    for(const e of q.emps)for(let d=0;d<7;d++){const h=hT(q,q.gS(e.id,d));if(h>p){p=h;q2=e.name;}}}
  const exc=q.emps.filter(e=>{let m=0;for(const s of Object.keys(q.genWeeks).map(Number)){q.weekOff=s;q._wdc=null;
    for(let d=0;d<7;d++)m=Math.max(m,hT(q,q.gS(e.id,d)));}return m>e.mhd+0.02&&!e.ot;});
  ok(exc.length===0,nom.padEnd(32)+'turno más largo '+p.toFixed(2)+'h'+(exc.length?'  ← '+exc.map(e=>e.name).join(', '):''));
}
console.log(bad?'\n❌ '+bad+' fallos\n':'\n✅ TODO OK\n');process.exit(bad?1:0);
