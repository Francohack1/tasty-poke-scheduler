// Reproduce lo que pasó en el sitio vivo: datos en la nube SIN extras que
// llegan después del arranque y pisan el ajuste por defecto.
const fs=require('fs');const {JSDOM,VirtualConsole}=require('jsdom');
const RAW=fs.readFileSync('index.html','utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
let bad=0;const ok=(c,m,x)=>{if(!c)bad++;console.log((c?'  ✅ ':'  ❌ ')+m+(x&&!c?'  → '+x:''));};
function app(store){
  const w=new JSDOM(RAW,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/',
    beforeParse(win){if(store){win.localStorage.setItem('tpVer','18');win.localStorage.setItem('tpScheduler',store);}}}).window;
  w.cloudEnabled=false;w.confirm=()=>true;w.alert=()=>{};return w;}

console.log('\n═══ El caso que falló en el sitio vivo ═══');
// datos "antiguos": sin extras, Stephanie con 9h, y la marca vieja puesta
const w0=app();
const viejo=JSON.parse(JSON.stringify({
  version:3,
  emps:w0.emps.map(e=>Object.assign({},e,{ot:false,mow:0,mhd:e.role==='encargado'?9:8})),
  peaks:w0.peaks, fests:w0.fests, festOn:w0.festOn, genV:0,
  otPredeterminado:true,          // la marca VIEJA (booleana) del primer intento
  settings:{op:'09:30',cl:'23:30',td:'12:00',ps:'15:30',pe:'17:30',rd:2,cov:2,maxsim:2,maxsimpk:3,name:'Tasty Poke Mataró'}
}));
const w=app(JSON.stringify(viejo));
console.log('   al arrancar desde el navegador:');
w.emps.forEach(e=>console.log('      '+e.name.padEnd(10)+(e.ot?'extras '+e.mow+'h':'sin extras').padEnd(14)+'máx '+e.mhd+'h'));
ok(w.emps.filter(e=>e.role!=='encargado').every(e=>e.ot&&e.mow===4),'los camareros reciben las extras');
ok(w.emps.every(e=>e.mhd===8),'y todos quedan en 8h de jornada normal');

console.log('\n   ahora bajan los datos de la nube, también antiguos:');
w.applyCloudData(viejo);
w.emps.forEach(e=>console.log('      '+e.name.padEnd(10)+(e.ot?'extras '+e.mow+'h':'sin extras').padEnd(14)+'máx '+e.mhd+'h'));
ok(w.emps.filter(e=>e.role!=='encargado').every(e=>e.ot&&e.mow===4),'la nube ya NO se las quita');
ok(w.emps.every(e=>e.mhd===8),'ni le devuelve las 9h a la encargada');
ok(w.emps.filter(e=>e.role==='encargado').every(e=>!e.ot),'y la encargada sigue sin extras');

console.log('\n═══ Si las quitas tú a propósito, se respeta ═══');
{
  const g=JSON.parse(w.localStorage.getItem('tpScheduler'));
  console.log('   marca guardada: '+g.otPredeterminado);
  g.emps.forEach(e=>{e.ot=false;e.mow=0;});
  const v=app(JSON.stringify(g));
  ok(v.emps.every(e=>!e.ot),'no vuelven solas');
  v.applyCloudData(Object.assign({version:3},g));
  ok(v.emps.every(e=>!e.ot),'ni siquiera tras sincronizar');
}

console.log('\n═══ Instalación nueva ═══');
{
  const n=app();
  ok(n.emps.filter(e=>e.role!=='encargado').every(e=>e.ot&&e.mow===4),'camareros con extras');
  ok(n.emps.every(e=>e.mhd===8),'todos a 8h');
  let ext=0;for(const s of Object.keys(n.genWeeks).map(Number)){n.weekOff=s;n._wdc=null;
    for(const e of n.emps)ext+=n.empW(e).ext;}
  ok(ext>0.05,'y se usan: '+(ext/5).toFixed(1)+'h/sem');
}
console.log(bad?'\n❌ '+bad+' fallos\n':'\n✅ TODO OK\n');process.exit(bad?1:0);
