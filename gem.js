const fs=require('fs');const {JSDOM,VirtualConsole}=require('jsdom');
const RAW=fs.readFileSync('index.html','utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
let bad=0;const ok=(c,m,x)=>{if(!c)bad++;console.log((c?'  ✅ ':'  ❌ ')+m+(x&&!c?'  → '+x:''));};
function app(){const w=new JSDOM(RAW,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/'}).window;
  w.cloudEnabled=false;w.confirm=()=>true;w.alert=()=>{};return w;}

console.log('\n═══ Sin clave, la app funciona igual ═══');
{
  const w=app();
  ok(Object.keys(w.genWeeks).length===5,'genera las 5 semanas');
  ok(w.geminiKey==='','sin clave guardada');
  const p=w.document.getElementById('gemini-panel');
  ok(p&&p.style.display==='none','el panel de Gemini está oculto');
}
console.log('\n═══ No se envían nombres ═══');
{
  const w=app();
  w.emps[0].name='Stephanie Rodríguez';
  w.emps[1].name='Alex Pérez';
  const d=w.resumenParaGemini();
  const txt=JSON.stringify(d);
  ok(!/Stephanie|Alex|Mafe|Cesar|Rodríguez|Pérez/.test(txt),'ningún nombre real en lo que se envía');
  ok(/Encargada/.test(txt)&&/Camarero A/.test(txt),'van como Encargada / Camarero A: '+d.equipo.map(e=>e.quien).join(', '));
  ok(d.horarioLocal==='09:30–23:30'&&d.diasDescansoMinimo===2,'incluye tus parámetros: '+d.horarioLocal+', descanso '+d.diasDescansoMinimo);
  ok(Array.isArray(d.semana)&&d.semana.length===7,'incluye los 7 días');
  ok(d.semana.some(x=>x.turnos.length>0),'con sus turnos');
  ok(Array.isArray(d.horasPorPersona),'y las horas de cada uno');
  console.log('      tamaño del envío: '+(txt.length/1024).toFixed(1)+' KB');
}
console.log('\n═══ La clave no se sincroniza ni se guarda con lo demás ═══');
{
  const w=app();
  w.document.getElementById('cfg-gemini-key').value='CLAVE-SECRETA-123';
  w.document.getElementById('cfg-gemini-on').checked=true;
  w.guardarGemini();
  w.saveConfig();
  const cfg=w.localStorage.getItem('tpScheduler');
  ok(cfg.indexOf('CLAVE-SECRETA-123')<0,'la clave NO está en los datos de la app');
  ok(JSON.stringify(w.resumenParaGemini()).indexOf('CLAVE')<0,'ni en lo que se envía');
  const gem=JSON.parse(w.localStorage.getItem('tpGemini'));
  ok(gem.key==='CLAVE-SECRETA-123'&&gem.auto===true,'se guarda aparte, solo en este dispositivo');
  // y al recargar la recupera
  const w2=app();
  ok(w2.geminiKey==='','otro dispositivo no la tiene');
}
console.log('\n═══ Si Gemini falla, el horario no se toca ═══');
{
  const w=app();
  w.geminiKey='x'; w.geminiAuto=true;
  const antes=JSON.stringify(w.sched);
  w.fetch=()=>Promise.reject(new Error('sin conexión'));
  return (async()=>{
    await w.revisarConGemini(true);
    ok(JSON.stringify(w.sched)===antes,'el horario sigue intacto');
    const p=w.document.getElementById('gemini-panel');
    ok(/No se pudo consultar/.test(p.textContent),'y lo dice claro: "'+p.textContent.slice(40,100)+'…"');
    ok(Object.keys(w.genWeeks).length===5,'las 5 semanas siguen ahí');
    console.log(bad?'\n❌ '+bad+' fallos\n':'\n✅ TODO OK\n');
    process.exit(bad?1:0);
  })();
}
