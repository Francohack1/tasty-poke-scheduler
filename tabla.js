const fs=require('fs');const {JSDOM,VirtualConsole}=require('jsdom');
const RAW=fs.readFileSync('index.html','utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
const D=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
let bad=0;const ok=(c,m,x)=>{if(!c)bad++;console.log((c?'  ✅ ':'  ❌ ')+m+(x&&!c?'  → '+x:''));};
function app(){const w=new JSDOM(RAW,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/'}).window;
  w.cloudEnabled=false;w.confirm=()=>true;w.alert=()=>{};return w;}
console.log('\n═══ Por defecto: nadie tiene nada marcado ═══');
const w=app();
ok(w.emps.every(e=>e.md==='aaaaaaa'),'todos arrancan en «que decida la app»: '+w.emps.map(e=>e.md).join(' '));

console.log('\n═══ La tabla aparece en la ficha ═══');
w.openEmp(w.emps[0].id);
const btns=[];for(let i=0;i<7;i++)btns.push(w.document.getElementById('emd'+i));
ok(btns.every(b=>!!b),'hay 7 casillas, una por día');
ok(btns.every(b=>b.textContent==='–'),'todas en «–» al abrir');
w.cicloModo(btns[0]);
ok(btns[0].getAttribute('data-v')==='p'&&btns[0].textContent==='P','una pulsación → P');
w.cicloModo(btns[0]);
ok(btns[0].getAttribute('data-v')==='c'&&btns[0].textContent==='C','dos → C');
w.cicloModo(btns[0]);
ok(btns[0].getAttribute('data-v')==='a'&&btns[0].textContent==='–','tres → vuelve a «–»');

console.log('\n═══ Marco a Stephanie partido de lunes a viernes ═══');
const w2=app();
const st=w2.emps[0];
w2.openEmp(st.id);
for(let i=0;i<5;i++)w2.cicloModo(w2.document.getElementById('emd'+i));
w2.saveEmp(st.id);
ok(w2.emps[0].md==='pppppaa','se guarda en la ficha: '+w2.emps[0].md);
w2.doSaveAndRegenerate();
const S=w2.genFromOff();w2.weekOff=S;w2._wdc=null;
const modos=[];for(let d=0;d<7;d++){const x=w2.gS(st.id,d);modos.push(D[d]+':'+(x&&x.t==='work'?(x.sh==='p'?'PARTIDO':'corrido'):'libra'));}
console.log('      '+modos.join('  '));
let forzados=0,cumplidos=0;
for(let d=0;d<5;d++){const x=w2.gS(st.id,d);if(!x||x.t!=='work')continue;forzados++;if(x.sh==='p')cumplidos++;}
ok(forzados>0&&cumplidos===forzados,'los '+forzados+' días que trabaja de lun-vie salen partidos ('+cumplidos+')');

console.log('\n═══ Y al revés: fuerzo corrido a quien la app parte ═══');
const w3=app();
w3.doGenerateAll();
const S3=w3.genFromOff();w3.weekOff=S3;w3._wdc=null;
let victima=null,dia=-1;
for(const e of w3.emps)for(let d=0;d<7;d++){const x=w3.gS(e.id,d);if(x&&x.sh==='p'){victima=e;dia=d;break;}if(victima)break;}
if(victima){
  console.log('      La app parte el turno de '+victima.name+' el '+D[dia]);
  const md='a'.repeat(dia)+'c'+'a'.repeat(6-dia);
  victima.md=md;
  w3.doSaveAndRegenerate();
  w3.weekOff=S3;w3._wdc=null;
  const x=w3.gS(victima.id,dia);
  ok(!x||x.t!=='work'||x.sh!=='p','forzado a corrido, ya no es partido: '+(x&&x.t==='work'?(x.sh==='p'?'sigue PARTIDO':x.s+'-'+x.e):'libra'));
}else console.log('      (esta semana la app no parte ningún turno)');

console.log('\n═══ Se guarda y sobrevive ═══');
w2.saveConfig();
const g=JSON.parse(w2.localStorage.getItem('tpScheduler'));
ok(g.emps[0].md==='pppppaa','la tabla se guarda en el navegador');
console.log(bad?'\n❌ '+bad+' fallos\n':'\n✅ TODO OK\n');process.exit(bad?1:0);
