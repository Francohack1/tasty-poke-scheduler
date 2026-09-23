const fs=require('fs'),path=require('path');const {JSDOM,VirtualConsole}=require('jsdom');
function app(cfg){
  const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
  const w=new JSDOM(html,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/'}).window;
  w.cloudEnabled=false;w.confirm=()=>true;cfg&&cfg(w);w.doGenerateAll();return w;
}
let bad=0;const ok=(c,m)=>{console.log((c?'  ✅ ':'  ❌ ')+m);if(!c)bad++;};

console.log('\n═══ 40h + máx 9h/día + 3 días de descanso = no cabe ═══');
const w=app(x=>{x.document.getElementById('cfg-rd').value='3';});
const av=w.getIssues().filter(i=>/no cabe/.test(i.t));
ok(av.length>0,'salta el aviso');
av.forEach(i=>console.log('\n   ⚠ '+i.t+'\n     '+i.x.replace(/(.{78}) /g,'$1\n     ')));
ok(av.every(i=>i.l==='w'||i.l==='e'),'el aviso tiene nivel de alerta, no informativo');
// y NADIE libra menos de 3
let malo=0;
for(const s of Object.keys(w.genWeeks).map(Number)){w.weekOff=s;w._wdc=null;
  for(const e of w.emps){let t=0;for(let d=0;d<7;d++){const st=w.gS(e.id,d);if(st&&st.t==='work')t++;}if(7-t<3)malo++;}}
ok(malo===0,'y aun así nadie libra menos de 3 días');

console.log('\n═══ Configuración normal (2 descansos): no debe molestar ═══');
const w2=app();
const av2=w2.getIssues().filter(i=>/no cabe/.test(i.t));
ok(av2.length===0,'con el equipo y la config de siempre, ningún aviso de estos');
console.log('   Equipo: '+w2.emps.map(e=>e.name+' '+e.h+'h/'+w2.workDays(e)+'d ('+(7-w2.workDays(e))+' libres)').join(' · '));

console.log('\n═══ 40h + máx 8h/día + 2 descansos: cabe justo ═══');
const w3=app(x=>{x.emps.forEach(e=>{if(e.h===40)e.mhd=8;});});
ok(w3.getIssues().filter(i=>/no cabe/.test(i.t)).length===0,'40h en 5 días a 8h: cabe, sin aviso');
const w4=app(x=>{x.emps.forEach(e=>{if(e.h===40)e.mhd=7;});});
ok(w4.getIssues().filter(i=>/no cabe/.test(i.t)).length>0,'40h en 5 días a 7h máx: NO cabe, avisa');
console.log(bad?'\n❌ '+bad+' fallos\n':'\n✅ TODO OK\n');process.exit(bad?1:0);
