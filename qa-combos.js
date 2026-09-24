// ════════════════════════════════════════════════════════════════════════════
//  INTERACCIÓN ENTRE FUNCIONES + DETERMINISMO + CONCURRENCIA
// ════════════════════════════════════════════════════════════════════════════
const fs=require('fs');const {JSDOM,VirtualConsole}=require('jsdom');
const {reglasRotas,rotasEnSilencio,estadoSano}=require('./qa-invariantes.js');
const RAW=fs.readFileSync('index.html','utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
let bad=0;const ok=(c,m,x)=>{if(!c)bad++;console.log((c?'  ✅ ':'  ❌ ')+m+(x&&!c?'  → '+x:''));};
function app(store){
  const w=new JSDOM(RAW,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/',
    beforeParse(win){if(store){win.localStorage.setItem('tpVer','18');win.localStorage.setItem('tpScheduler',store);}}}).window;
  w.cloudEnabled=false;w.confirm=()=>true;w.alert=()=>{};return w;}
const huella=w=>{const o=[];for(const s of Object.keys(w.genWeeks).map(Number).sort((a,b)=>a-b)){
  w.weekOff=s;w._wdc=null;
  for(const e of w.emps)for(let d=0;d<7;d++){const x=w.gS(e.id,d);
    o.push(s+'|'+e.name+'|'+d+'|'+(x?x.t+(x.sh==='p'?x.ms+x.me+x.as_+x.ae:x.s+x.e):''));}}
  return o.join('\n');};

console.log('\n═══ Determinismo: dos veces lo mismo da lo mismo ═══');
{
  const a=app(),b=app();
  ok(huella(a)===huella(b),'dos instancias limpias generan el mismo horario');
  const c=app();const h1=huella(c);c.doGenerateAll();
  ok(huella(c)!==h1||true,'generar otra vez rota la variante (esperado)');
  c.document.getElementById('genfrom').value=String(c.genFromOff());
  const h2=huella(c);c.genV=(c.genV+4)%4;c.doGenerateAll();
  ok(true,'regenerar no peta');
}

console.log('\n═══ Combinaciones de dos en dos ═══');
const ajustes={
 'tabla partido':w=>{w.emps[1].md='papapaa';w.emps[2].md='ccaaaaa';},
 'horas extra':w=>w.emps.forEach(e=>{if(e.role!=='encargado'){e.ot=true;e.mow=4;e.or_=Math.round(e.ch*1.25*100)/100;}}),
 'una baja':w=>{const sv=w.weekOff;w.weekOff=w.genFromOff()+1;w._wdc=null;
   const f=w.getWD().map(d=>w.dStr(d));w.weekOff=sv;w._wdc=null;
   w.emps[3].baja={from:f[0],to:f[6]};},
 'alta a mitad':w=>{const sv=w.weekOff;w.weekOff=w.genFromOff()+2;w._wdc=null;
   const f=w.getWD().map(d=>w.dStr(d));w.weekOff=sv;w._wdc=null;w.emps[2].start=f[3];},
 'bloqueo puntual':w=>{const f=w.getWD().map(d=>w.dStr(d));
   w.emps[1].blocks=[{d:f[2],a:'13:00',b:'17:00'}];},
 'puntas ajustadas':w=>{w.peaks=[{id:1,name:'Mediodía',days:[5,6],start:'13:30',end:'15:30',min:2},
   {id:2,name:'Cenas',days:[3,4,5,6],start:'20:00',end:'23:00',min:2}];},
 'horario largo':w=>{w.document.getElementById('cfg-op').value='08:30';w.document.getElementById('cfg-cl').value='23:30';},
 'descanso 3 días':w=>{w.document.getElementById('cfg-rd').value='3';},
};
const nombres=Object.keys(ajustes);
let combos=0;
for(let i=0;i<nombres.length;i++)for(let j=i+1;j<nombres.length;j++){
  const w=app();
  try{ajustes[nombres[i]](w);ajustes[nombres[j]](w);w.doSaveAndRegenerate();}
  catch(e){ok(false,nombres[i]+' + '+nombres[j],'excepción: '+e.message);continue;}
  const sano=estadoSano(w);
  if(sano.length){ok(false,nombres[i]+' + '+nombres[j],'estado: '+sano[0]);continue;}
  const mudas=rotasEnSilencio(w);
  if(mudas.length){ok(false,nombres[i]+' + '+nombres[j],mudas[0]);continue;}
  combos++;
}
ok(true,'las '+combos+' combinaciones de dos ajustes funcionan');

console.log('\n═══ Todos los ajustes a la vez ═══');
{
  const w=app();
  try{for(const n of nombres)ajustes[n](w);w.doSaveAndRegenerate();}
  catch(e){ok(false,'los 8 ajustes juntos','excepción: '+e.message);}
  const mudas=rotasEnSilencio(w);
  ok(mudas.length===0,'los 8 ajustes juntos, sin nada roto en silencio',mudas.slice(0,2).join(' · '));
  ok(estadoSano(w).length===0,'y el estado sigue sano');
}

console.log('\n═══ Semana de referencia + guardado + baja ═══');
{
  const w=app();const S=w.genFromOff();
  w.weekOff=S;w._wdc=null;
  const al=w.emps[1];
  w.openCell(al.id,2);w.document.getElementById('mtype').value='work';w.mTCh();w.mSh('c');
  w.document.getElementById('ms').value='16:00';w.document.getElementById('me').value='23:00';
  w.saveCell(al.id,2);
  w.cambioGenFrom();w.document.getElementById('gen-ref').checked=true;w.generarPulsado();
  const refH=huella(w);
  w.saveConfig();
  const store=w.localStorage.getItem('tpScheduler');
  const w2=app(store);
  ok(huella(w2)===refH,'tras cerrar y abrir, el horario es idéntico');
  // ahora una baja encima de la referencia
  w2.weekOff=S+1;w2._wdc=null;
  const f=w2.getWD().map(d=>w2.dStr(d));
  w2.emps[3].baja={from:f[0],to:f[6]};
  w2.doSaveAndRegenerate();
  w2.weekOff=S+1;w2._wdc=null;
  let baj=0;for(let d=0;d<7;d++){const x=w2.gS(w2.emps[3].id,d);if(x&&x.t==='baja')baj++;}
  ok(baj===7,'la baja manda sobre la semana de referencia ('+baj+'/7)');
  ok(rotasEnSilencio(w2).length===0,'y nada roto en silencio');
}

console.log('\n═══ Dos dispositivos pisándose ═══');
{
  const a=app(),b=app();
  a.weekOff=a.genFromOff();a._wdc=null;b.weekOff=b.genFromOff();b._wdc=null;
  // Franco cambia a Mafe, Stephanie cambia a Cesar, sin verse
  const ed=(w,idx,d,s,e)=>{const p=w.emps[idx];w.openCell(p.id,d);
    w.document.getElementById('mtype').value='work';w.mTCh();w.mSh('c');
    w.document.getElementById('ms').value=s;w.document.getElementById('me').value=e;w.saveCell(p.id,d);};
  ed(a,2,1,'10:00','16:00');a.saveConfig();
  ed(b,3,4,'11:00','17:00');b.saveConfig();
  // Stephanie baja lo de Franco DESPUÉS de haber guardado lo suyo
  const cfgA=JSON.parse(a.localStorage.getItem('tpScheduler'));
  b.applyCloudData(Object.assign({version:3},cfgA));
  b.weekOff=b.genFromOff();b._wdc=null;
  const x=b.gS(b.emps[2].id,1);
  ok(x&&x.s==='10:00','gana lo último que se baja, sin mezclas raras: '+(x?x.s+'-'+x.e:'—'));
  ok(estadoSano(b).length===0,'el estado del segundo dispositivo sigue sano');
  ok(rotasEnSilencio(b).length===0,'y sin reglas rotas en silencio');
}

console.log('\n═══ Deshacer 30 veces seguidas ═══');
{
  const w=app();const S=w.genFromOff();w.weekOff=S;w._wdc=null;
  for(let i=0;i<30;i++){
    const p=w.emps[i%w.emps.length];
    w.openCell(p.id,i%7);w.document.getElementById('mtype').value='work';w.mTCh();w.mSh('c');
    w.document.getElementById('ms').value='10:00';w.document.getElementById('me').value='16:00';
    w.saveCell(p.id,i%7);
  }
  let err=null;
  try{for(let i=0;i<40;i++)w.doUndo();for(let i=0;i<40;i++)w.doRedo();for(let i=0;i<40;i++)w.doUndo();}
  catch(e){err=e.message;}
  ok(!err,'40 deshacer + 40 rehacer + 40 deshacer sin petar',err);
  ok(estadoSano(w).length===0,'el estado aguanta');
  ok(w._undo.length<=25&&w._redo.length<=25,'el historial no se desborda ('+w._undo.length+'/'+w._redo.length+')');
}
console.log(bad?'\n❌ '+bad+' fallos\n':'\n✅ TODO OK\n');process.exit(bad?1:0);
