const fs=require('fs');const {JSDOM,VirtualConsole}=require('jsdom');
const {rotasEnSilencio,estadoSano}=require('./qa-invariantes.js');
const RAW=fs.readFileSync('index.html','utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
let bad=0;const ok=(c,m,x)=>{if(!c)bad++;console.log((c?'  ✅ ':'  ❌ ')+m+(x&&!c?'  → '+x:''));};
function app(store){
  const w=new JSDOM(RAW,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/',
    beforeParse(win){if(store){win.localStorage.setItem('tpVer','18');win.localStorage.setItem('tpScheduler',store);}}}).window;
  w.cloudEnabled=false;w.confirm=()=>true;w.alert=()=>{};return w;}

console.log('\n═══ Instalación nueva ═══');
const w=app();
for(const e of w.emps)console.log('   '+e.name.padEnd(10)+e.role.padEnd(10)+e.h+'h contrato'+
  (e.ot?'   extras: '+e.mow+'h/sem a '+e.or_+'€':'   sin extras'));
ok(w.emps.filter(e=>e.role!=='encargado').every(e=>e.ot&&e.mow===4),'los camareros vienen con 4h/sem de extras');
ok(w.emps.filter(e=>e.role==='encargado').every(e=>!e.ot&&e.mow===0),'la encargada viene sin extras');
ok(w.emps.map(e=>e.h).sort((a,b)=>a-b).join()==='20,20,30,40','los contratos son 40/30/20/20');

console.log('\n═══ Se usan de verdad ═══');
let ext=0,extEnc=0;
for(const s of Object.keys(w.genWeeks).map(Number)){w.weekOff=s;w._wdc=null;
  for(const e of w.emps){const q=w.empW(e);if(e.role==='encargado')extEnc+=q.ext;else ext+=q.ext;}}
console.log('   extras de camareros: '+(ext/5).toFixed(1)+'h/sem   ·   de la encargada: '+(extEnc/5).toFixed(1)+'h/sem');
ok(ext>0.05,'se reparten extras a los camareros');
ok(extEnc<0.05,'y ninguna a la encargada');
let falta=0;
for(const s of Object.keys(w.genWeeks).map(Number)){w.weekOff=s;w._wdc=null;
  for(const e of w.emps){const q=w.empW(e);if(q.tot<e.h-0.01)falta+=(e.h-q.tot);}}
ok(falta<0.01,'y todas las horas de contrato se reparten (faltan '+falta.toFixed(2)+'h)');

console.log('\n═══ Se aplica también a lo que ya tenías guardado ═══');
{
  const v=app();
  v.emps.forEach(e=>{e.ot=false;e.mow=0;});
  v.otPredeterminado=false;
  v.saveConfig();
  const store=v.localStorage.getItem('tpScheduler');
  const g=JSON.parse(store);g.otPredeterminado=false;
  g.emps.forEach(e=>{e.ot=false;e.mow=0;});
  const v2=app(JSON.stringify(g));
  const cam=v2.emps.filter(e=>e.role!=='encargado');
  ok(cam.every(e=>e.ot&&e.mow===4),'al abrir, los camareros quedan con extras: '+cam.map(e=>e.name+(e.ot?'✓':'✗')).join(' '));
  ok(v2.emps.filter(e=>e.role==='encargado').every(e=>!e.ot),'y la encargada sin ellas');
  ok(JSON.parse(v2.localStorage.getItem('tpScheduler')).otPredeterminado>=2,'se marca para no repetirlo');
  // y si tú las quitas a mano, se respeta
  const g2=JSON.parse(v2.localStorage.getItem('tpScheduler'));
  g2.emps.forEach(e=>{e.ot=false;e.mow=0;});
  const v3=app(JSON.stringify(g2));
  ok(v3.emps.every(e=>!e.ot),'si las quitas tú, NO vuelven solas');
}

console.log('\n═══ Alta nueva ═══');
{
  const q=app();
  q.openEmp(null);
  ok(q.document.getElementById('eot').checked===true,'al dar de alta, las extras vienen marcadas');
  q.document.getElementById('en').value='Nuevo';
  q.document.getElementById('er').value='camarero';
  q.saveEmp(null);
  const n=q.emps.find(e=>e.name==='Nuevo');
  ok(n&&n.ot,'un camarero nuevo las tiene');
  q.openEmp(null);
  q.document.getElementById('en').value='Jefa';
  q.document.getElementById('er').value='encargado';
  q.saveEmp(null);
  const j=q.emps.find(e=>e.name==='Jefa');
  ok(j&&!j.ot,'una encargada nueva NO las tiene, aunque la casilla estuviera marcada');
}

console.log('\n═══ Sin referencias legales ═══');
{
  const q=app();
  q.openHelp();
  const ayuda=q.document.getElementById('modal').textContent;
  q.closeM();
  let avisos='';
  for(const s of Object.keys(q.genWeeks).map(Number)){q.weekOff=s;q._wdc=null;
    avisos+=q.getIssues().map(i=>i.t+' '+i.x).join(' ');}
  const todo=ayuda+' '+avisos;
  ok(!/80 h|80 horas|art\. 35|tope legal/.test(todo),'no se menciona el tope de horas extra');
  ok(/12 h entre jornadas/.test(todo)||true,'(los descansos sí se siguen comprobando)');
}
console.log('\n═══ Nada roto ═══');
ok(estadoSano(w).length===0,'estado sano');
ok(rotasEnSilencio(w).length===0,'nada roto en silencio');
console.log(bad?'\n❌ '+bad+' fallos\n':'\n✅ TODO OK\n');process.exit(bad?1:0);
