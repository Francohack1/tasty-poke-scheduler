const fs=require('fs'),path=require('path');const {JSDOM,VirtualConsole}=require('jsdom');
const RAW=fs.readFileSync(path.join(__dirname,'index.html'),'utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
function app(store){
  const w=new JSDOM(RAW,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/',
    beforeParse(win){if(store){win.localStorage.setItem('tpVer','18');win.localStorage.setItem('tpScheduler',store);}}}).window;
  w.cloudEnabled=false;w.confirm=()=>true;w.alert=()=>{};return w;
}
let bad=0;const ok=(c,m)=>{console.log((c?'  ✅ ':'  ❌ ')+m);if(!c)bad++;};
const foto=(w,s)=>{const sv=w.weekOff;w.weekOff=s;w._wdc=null;
  const o=w.emps.map(e=>{const f=[];for(let d=0;d<7;d++){const x=w.gS(e.id,d);
    f.push(x&&x.t==='work'?(x.sh==='p'?'P':x.s+'-'+x.e):(x&&x.t==='baja'?'BAJA':'libra'));}
    return e.name+':'+f.join('|');});w.weekOff=sv;w._wdc=null;return o;};
const edita=(w,sem,nombre,dia,s,e)=>{const sv=w.weekOff;w.weekOff=sem;w._wdc=null;
  const p=w.emps.find(x=>x.name===nombre);w.openCell(p.id,dia);
  w.document.getElementById('mtype').value='work';w.mTCh();w.mSh('c');
  w.document.getElementById('ms').value=s;w.document.getElementById('me').value=e;
  w.saveCell(p.id,dia);w.weekOff=sv;w._wdc=null;};

console.log('\n═══ 1. Un cambio a mano sobrevive a cerrar la app ═══');
const w=app();const S=w.genFromOff();
edita(w,S,'Alex',2,'16:00','23:00');
w.saveConfig();
const store=w.localStorage.getItem('tpScheduler');
ok(!!JSON.parse(store).sched,'el horario se guarda en el navegador');
const esperado=foto(w,S);
const w2=app(store);
ok(JSON.stringify(foto(w2,S))===JSON.stringify(esperado),'al reabrir sale exactamente igual');
const mi=w2.gS(w2.emps.find(e=>e.name==='Alex').id,2);
ok(mi&&mi.s==='16:00'&&mi.e==='23:00','y el turno que edité sigue ahí: '+(mi?mi.s+'–'+mi.e:'—'));
ok(w2.semanasTocadas[S]===true,'recuerda que esa semana la tocaste tú');

console.log('\n═══ 2. Cambiar la configuración sí regenera ═══');
const w3=app(store);
const antes=foto(w3,S);
w3.document.getElementById('cfg-cl').value='22:00';
w3.cambioConfig('horario de cierre');
ok(JSON.stringify(foto(w3,S))!==JSON.stringify(antes),'al cambiar la hora de cierre se rehace el horario');
const cierres=[];for(let d=0;d<7;d++)for(const e of w3.emps){const x=w3.gS(e.id,d);
  if(x&&x.t==='work'&&(x.sh==='p'?x.ae:x.e)>'22:00')cierres.push(e.name+' d'+d);}
ok(cierres.length===0,'y nadie se queda más allá del nuevo cierre');

console.log('\n═══ 3. Un horario viejo se descarta ═══');
const viejo=JSON.parse(store);
const nuevo={};for(const k in viejo.sched){const p=k.split('|');nuevo[p[0]+'|'+(parseInt(p[1],10)-30)+'|'+p[2]]=viejo.sched[k];}
viejo.sched=nuevo;const gw={};for(const k in viejo.genWeeks)gw[parseInt(k,10)-30]=viejo.genWeeks[k];viejo.genWeeks=gw;
const w4=app(JSON.stringify(viejo));
const ws=Object.keys(w4.genWeeks).map(Number);
ok(Math.max(...ws)>=w4.initWeekOff(),'genera de nuevo en vez de enseñarte semanas pasadas');

console.log('\n═══ 4. Deshacer y regenerar siguen funcionando ═══');
const w5=app(store);
const f0=foto(w5,S);
w5.generarPulsado();
ok(true,'generar no peta');
w5.doUndo();
ok(JSON.stringify(foto(w5,S))===JSON.stringify(f0),'deshacer devuelve el horario anterior');

console.log('\n═══ 5. Sin nada guardado, arranca como siempre ═══');
const w6=app();
ok(Object.keys(w6.genWeeks).length===5,'genera 5 semanas ('+Object.keys(w6.genWeeks).length+')');
ok(w6.emps.length===4,'con el equipo de siempre');
console.log(bad?'\n❌ '+bad+' fallos\n':'\n✅ TODO OK\n');process.exit(bad?1:0);
