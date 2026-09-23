const fs=require('fs'),path=require('path');
const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync(path.join(__dirname,'TastyPoke_Scheduler.html'),'utf8')
  .replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
const vc=new VirtualConsole();
const dom=new JSDOM(html,{runScripts:'dangerously',virtualConsole:vc,url:'https://x.test/'});
const w=dom.window;
let bad=0;const ok=(c,m)=>{console.log((c?'  ✅ ':'  ❌ ')+m);if(!c)bad++;};

console.log('\n── El calendario se siembra solo al abrir ──');
ok(w.fests.length>=50,'hay '+w.fests.length+' entradas (2 años)');
const n=x=>w.fests.filter(f=>f.name.indexOf(x)>=0);
ok(n('Mercè').length>=2,'La Mercè: '+n('Mercè — festa major de Barcelona').map(f=>f.date).join(', '));
ok(n('Les Santes').length>=4,'Les Santes: '+n('Sant Pantaleó').map(f=>f.date).join(', '));
ok(n('Pasqua Granada').length>=2,'Pasqua Granada: '+n('Pasqua Granada').map(f=>f.date).join(', '));
ok(n('Black Friday').length>=2,'Black Friday: '+n('Black Friday').map(f=>f.date).join(', '));
ok(n('Sant Jordi').length>=2,'Sant Jordi: '+n('Sant Jordi').map(f=>f.date).join(', '));
ok(w.fests.filter(f=>f.type==='futbol').length===0,'sin partidos viejos de 2026');
ok(w.fests.every(f=>w.festActive(f)),'todos activos por defecto');

console.log('\n── Sin duplicados y ordenado ──');
const k=new Set();let dup=0;
w.fests.forEach(f=>{const q=f.date+'|'+f.name;if(k.has(q))dup++;k.add(q);});
ok(dup===0,'0 duplicados');
ok(w.fests.every((f,i)=>i===0||w.fests[i-1].date<=f.date),'ordenado por fecha');

console.log('\n── Sembrar dos veces no duplica ──');
const antes=w.fests.length;
ok(w.sembrarCalendario()===0,'segunda siembra añade 0');
w.sembrarCalendario(true);
ok(w.fests.length===antes,'forzada tampoco duplica ('+w.fests.length+')');

console.log('\n── Lo que borres no vuelve ──');
const i=w.fests.findIndex(f=>f.name.indexOf('Black Friday')>=0);
const d=w.fests[i].date;
delete w.festOn[w.fkey(w.fests[i])];w.fests.splice(i,1);
w.sembrarCalendario();
ok(!w.fests.some(f=>f.date===d&&f.name==='Black Friday'),'Black Friday borrado no reaparece');

console.log('\n── Se guarda y se recupera ──');
w.saveConfig();
const raw=JSON.parse(w.localStorage.getItem('tpScheduler'));
ok(raw.festSeedY&&raw.festSeedY[new Date().getFullYear()]===true,'festSeedY guardado');
ok(raw.fests.length===w.fests.length,'fests guardados ('+raw.fests.length+')');

console.log('\n── La Mercè sale marcada en su semana ──');
// buscamos la semana del 24 de septiembre
const y=new Date().getFullYear();
let found=false;
for(let off=-60;off<=60&&!found;off++){
  w.weekOff=off;const ds=w.getWD();
  if(ds.some(x=>w.dStr(x)===y+'-09-24')){found=true;
    w.renderSched();
    const t=w.document.getElementById('sctbl').textContent+w.document.getElementById('evbar').textContent;
    ok(t.indexOf('★')>=0,'la cabecera del día lleva ★');
    ok(t.indexOf('Mercè')>=0,'el nombre sale en la semana');
  }
}
ok(found,'semana de La Mercè localizada');

console.log('\n── Limpiar pasados ──');
w.confirm=()=>true;
const pasados=w.fests.filter(f=>f.date<w.dStr(new Date())).length;
w.limpiarPasados();
ok(w.fests.every(f=>f.date>=w.dStr(new Date())),'borrados los '+pasados+' pasados');
ok(w.fests.length>0,'quedan '+w.fests.length+' futuros');

console.log('\n── Deshacer devuelve lo borrado ──');
w.doUndo();
ok(w.fests.some(f=>f.date<w.dStr(new Date())),'deshacer recupera los pasados');

console.log(bad?'\n'+bad+' FALLOS\n':'\n✅ TODO OK\n');
process.exit(bad?1:0);
