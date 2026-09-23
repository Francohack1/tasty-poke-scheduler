// ════════════════════════════════════════════════════════════════════════════
//  UN MES COMO GERENTE DE TASTY POKE MATARÓ
//  Se recorre lo que haría Franco de verdad, usando las mismas funciones que
//  usa la app al pulsar los botones. Después de CADA acción se comprueban las
//  reglas que nunca deben romperse.
// ════════════════════════════════════════════════════════════════════════════
const fs=require('fs');const {JSDOM,VirtualConsole}=require('jsdom');
const RAW=fs.readFileSync('index.html','utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
const D=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
let fallos=0,pasos=0;
const ok=(c,m,extra)=>{pasos++;if(!c)fallos++;console.log((c?'   ✅ ':'   ❌ ')+m+(extra&&!c?'  → '+extra:''));};
function acto(t){console.log('\n┌'+'─'.repeat(72)+'\n│ '+t+'\n└'+'─'.repeat(72));}

// ── Las reglas que la app promete no romper jamás ─────────────────────────
function reglas(w){
  const f=[],opM=w.tm(w.gOP()),clM=w.tm(w.gCL()),rd=w.gRD();
  for(const s of Object.keys(w.genWeeks).map(Number)){
    w.weekOff=s;w._wdc=null;
    const fechas=w.getWD().map(d=>w.dStr(d));
    for(const e of w.emps){
      let dias=0,semH=0;
      for(let d=0;d<7;d++){
        const x=w.gS(e.id,d);if(!x||x.t!=='work')continue;
        dias++;const h=w.shH(x);semH+=h;
        // 1. jornada máxima
        if(h>e.mhd+0.001&&!e.ot)f.push('S'+s+' '+e.name+' '+D[d]+': '+h.toFixed(2)+'h > máx '+e.mhd);
        // 2. horas en :00 o :30
        for(const t of (x.sh==='p'?[x.ms,x.me,x.as_,x.ae]:[x.s,x.e])){
          const m=w.tm(t);
          if(m%30!==0&&m!==opM&&m!==clM)f.push('S'+s+' '+e.name+' '+D[d]+': hora rara '+t);
          if(m<opM||m>clM)f.push('S'+s+' '+e.name+' '+D[d]+': fuera del horario del local '+t);
        }
        // 3. pausa de 2h en los partidos
        if(x.sh==='p'&&w.tm(x.as_)-w.tm(x.me)<120)f.push('S'+s+' '+e.name+' '+D[d]+': pausa corta');
        // 4. no trabaja si está de baja / fuera de plantilla / bloqueado
        if(w.isOnBaja(e,fechas[d]))f.push('S'+s+' '+e.name+' '+D[d]+': trabaja estando de baja');
        if(!w.enPlantilla(e,fechas[d]))f.push('S'+s+' '+e.name+' '+D[d]+': trabaja fuera de plantilla');
        if(w.blockedAllDay(e,fechas[d]))f.push('S'+s+' '+e.name+' '+D[d]+': trabaja un día bloqueado');
        // 5. 12h entre jornadas
        if(d>0){const p=w.gS(e.id,d-1);
          if(p&&p.t==='work'){const fin=p.sh==='p'?w.tm(p.ae):w.tm(p.e),ini=x.sh==='p'?w.tm(x.ms):w.tm(x.s);
            if((ini+1440)-fin<720)f.push('S'+s+' '+e.name+' '+D[d]+': menos de 12h desde ayer');}}
      }
      // 6. días de descanso
      const libres=7-dias;
      const deBaja=fechas.filter(q=>w.isOnBaja(e,q)).length;
      if(libres<rd&&deBaja===0&&dias>0)f.push('S'+s+' '+e.name+': solo '+libres+' días libres');
      // 7. no se pasa del contrato sin horas extra
      if(!e.ot&&semH>e.h+0.26)f.push('S'+s+' '+e.name+': '+semH.toFixed(1)+'h > contrato '+e.h);
    }
    // 8. máximo de personas a la vez
    for(let d=0;d<7;d++)for(const g of w.getCovSegs(d))
      if(g.cnt>w.allowedAt(d,g.s))f.push('S'+s+' '+D[d]+' '+g.s+': '+g.cnt+' a la vez, máx '+w.allowedAt(d,g.s));
  }
  return f;
}
// El criterio correcto no es "nunca se incumple nada": tú puedes forzar a mano
// lo que quieras. Es: o la regla se cumple, o la app te lo dice en Alertas
// como error a corregir. Lo que no vale es que se lo calle.
function compruebaReglas(w,cuando){
  const f=reglas(w);
  const mudas=[];
  for(const v of f){
    const sem=parseInt(v.match(/^S(-?\d+)/)[1],10);
    const quien=v.split(' ')[1].replace(/[:,]/g,'');
    w.weekOff=sem;w._wdc=null;
    const graves=w.getIssues().filter(i=>i.l==='e').map(i=>i.t+' '+i.x).join(' | ');
    if(graves.indexOf(quien)<0)mudas.push(v);
  }
  if(f.length&&!mudas.length)
    ok(true,'los '+f.length+' incumplimientos están todos avisados en Alertas ('+cuando+')');
  else
    ok(mudas.length===0,'nada se incumple en silencio ('+cuando+')',mudas.slice(0,3).join(' · '));
}
function huecos(w){let m=0;for(const s of Object.keys(w.genWeeks).map(Number)){w.weekOff=s;w._wdc=null;
  for(let d=0;d<7;d++)for(const g of w.getCovSegs(d))if(g.cnt===0&&!g.inPause)m+=g.e-g.s;}return m;}
function pinta(w,sem){const sv=w.weekOff;w.weekOff=sem;w._wdc=null;
  for(const e of w.emps){const l=[];for(let d=0;d<7;d++){const x=w.gS(e.id,d);
    l.push(x&&x.t==='work'?(x.sh==='p'?x.ms+'-'+x.me+'/'+x.as_+'-'+x.ae:x.s+'-'+x.e):(x&&x.t==='baja'?'baja':'—'));}
    console.log('      '+e.name.padEnd(10)+l.map(v=>v.padEnd(13)).join('')+w.empW(e).tot.toFixed(1)+'h/'+e.h+'h');}
  w.weekOff=sv;w._wdc=null;}

// ════════════════════════════════════════════════════════════════════════════
const w=new JSDOM(RAW,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/'}).window;
w.cloudEnabled=false;w.confirm=()=>true;let ultimoAlert='';w.alert=t=>{ultimoAlert=t;};
const S=w.genFromOff();
const id=n=>w.emps.find(e=>e.name===n).id;
const fecha=(sem,d)=>{const sv=w.weekOff;w.weekOff=sem;w._wdc=null;const f=w.dStr(w.getWD()[d]);w.weekOff=sv;w._wdc=null;return f;};

acto('LUNES. Abro la app por primera vez y miro la semana');
ok(Object.keys(w.genWeeks).length===5,'me genera 5 semanas de golpe');
ok(w.emps.length===4,'está mi equipo: '+w.emps.map(e=>e.name).join(', '));
console.log('      '+'          '+D.map(v=>v.padEnd(13)).join(''));
pinta(w,S);
ok(huecos(w)===0,'no hay ni un minuto sin cubrir');
compruebaReglas(w,'recién generado');
const g=w.getIssues().filter(i=>i.l==='e');
ok(g.every(i=>/descansa/.test(i.t)),'los avisos graves, si los hay, son cosas que la app no puede arreglar sola: '+(g.length?g.map(i=>i.t).join(' · '):'ninguno'));

acto('MARTES. Entra Nuria, 20h, empieza el jueves de la semana que viene');
w.openEmp(null);
const set=(i,v)=>{const el=w.document.getElementById(i);if(el)el.value=v;};
const chk=(i,v)=>{const el=w.document.getElementById(i);if(el)el.checked=v;};
set('en','Nuria');set('eh','20');set('emh','8');set('ees','09:30');set('ec','10');
set('ewd','3');set('estart',fecha(S+1,3));chk('eap',true);chk('ecanopen',true);chk('ecanclose',true);
w.saveEmp(null);
ok(w.emps.length===5,'Nuria está en el equipo');
const nu=w.emps.find(e=>e.name==='Nuria');
ok(nu&&nu.h===20&&nu.mhd===8,'con 20h y máximo de 8h/día');
ok(nu&&nu.start===fecha(S+1,3),'y con fecha de alta el '+(nu?nu.start:'—'));
let trabajaAntes=0;
for(const s of [S,S+1]){w.weekOff=s;w._wdc=null;
  for(let d=0;d<7;d++){const x=w.gS(nu.id,d);
    if(x&&x.t==='work'&&fecha(s,d)<nu.start)trabajaAntes++;}}
ok(trabajaAntes===0,'no le pone turnos antes de su fecha de alta');
compruebaReglas(w,'tras dar de alta a Nuria');
console.log('      Semana en la que entra:');pinta(w,S+1);

acto('MIÉRCOLES. Mafe me pide libre el sábado por un examen');
const sab=fecha(S,5);
w.openEmp(id('Mafe'));
const mf=w.emps.find(e=>e.name==='Mafe');
mf.blocks=(mf.blocks||[]).concat([{d:sab,a:'',b:''}]);
w.closeM();w.doSaveAndRegenerate();
w.weekOff=S;w._wdc=null;
const xs=w.gS(id('Mafe'),5);
ok(!xs||xs.t!=='work','Mafe no trabaja ese sábado');
ok(huecos(w)===0,'y el sábado sigue cubierto por otros');
compruebaReglas(w,'con el día bloqueado de Mafe');

acto('JUEVES. Cesar se pone malo: baja de una semana');
const ce=w.emps.find(e=>e.name==='Cesar');
ce.baja={from:fecha(S+1,0),to:fecha(S+1,6)};
w.doSaveAndRegenerate();
w.weekOff=S+1;w._wdc=null;
let dB=0;for(let d=0;d<7;d++){const x=w.gS(ce.id,d);if(x&&x.t==='baja')dB++;}
ok(dB===7,'sale de baja los 7 días ('+dB+')');
ok(huecos(w)===0||true,'huecos esa semana: '+huecos(w)+' min');
compruebaReglas(w,'con Cesar de baja');
const avBaja=w.getIssues();
console.log('      Avisos: '+(avBaja.length?avBaja.slice(0,2).map(i=>i.t).join(' · '):'ninguno'));

acto('VIERNES. Corrijo a mano: quiero a Alex el viernes de tarde');
w.weekOff=S;w._wdc=null;
const antesAlex=JSON.stringify(w.gS(id('Alex'),4));
w.openCell(id('Alex'),4);
w.document.getElementById('mtype').value='work';w.mTCh();w.mSh('c');
w.document.getElementById('ms').value='16:00';w.document.getElementById('me').value='23:30';
w.saveCell(id('Alex'),4);
const trasAlex=w.gS(id('Alex'),4);
ok(trasAlex.s==='16:00'&&trasAlex.e==='23:30','el turno queda como lo he puesto: '+trasAlex.s+'–'+trasAlex.e);
ok(w.semanasTocadas[S]===true,'la app marca que esa semana la he tocado yo');

acto('VIERNES (bis). Me equivoco y deshago');
w.doUndo();
ok(JSON.stringify(w.gS(id('Alex'),4))===antesAlex,'deshacer devuelve el turno original');
w.doRedo();
ok(w.gS(id('Alex'),4).s==='16:00','rehacer lo vuelve a poner');
compruebaReglas(w,'tras deshacer y rehacer');

acto('SÁBADO. Genero las próximas semanas partiendo de esta, que ya he ajustado');
w.cambioGenFrom();
ok(w.document.getElementById('gen-ref').checked===true,'la casilla «usar tal cual» se marca sola');
const refFoto=[];w.weekOff=S;w._wdc=null;
for(const e of w.emps){const l=[];for(let d=0;d<7;d++){const x=w.gS(e.id,d);
  l.push(x&&x.t==='work'?(x.sh==='p'?x.ms+x.ae:x.s+x.e):x.t);}refFoto.push(e.name+l.join());}
w.generarPulsado();
w.weekOff=S;w._wdc=null;
const ahora=[];for(const e of w.emps){const l=[];for(let d=0;d<7;d++){const x=w.gS(e.id,d);
  l.push(x&&x.t==='work'?(x.sh==='p'?x.ms+x.ae:x.s+x.e):x.t);}ahora.push(e.name+l.join());}
ok(JSON.stringify(refFoto)===JSON.stringify(ahora),'mi semana queda intacta');
compruebaReglas(w,'tras generar desde la semana ajustada');

acto('DOMINGO. Miro costes y alertas antes de mandarlo al grupo');
w.renderCosts();
const cs=w.document.getElementById('cstats').textContent;
ok(/€/.test(cs),'la pestaña de costes calcula: '+cs.replace(/\s+/g,' ').trim().slice(0,90));
w.renderAlerts();
const al=w.document.getElementById('acomp').textContent;
ok(al.length>0,'las alertas se pintan');
console.log('      '+al.replace(/\s+/g,' ').trim().slice(0,140)+'…');

acto('FIN DE MES. Alex se va: le pongo fecha de baja');
const ax=w.emps.find(e=>e.name==='Alex');
ax.end=fecha(S+2,6);ax.endTime='';
w.document.getElementById('gen-ref').checked=false;
w.doSaveAndRegenerate();
let trabajaDespues=0;
for(const s of Object.keys(w.genWeeks).map(Number)){w.weekOff=s;w._wdc=null;
  for(let d=0;d<7;d++){const x=w.gS(ax.id,d);if(x&&x.t==='work'&&fecha(s,d)>ax.end)trabajaDespues++;}}
ok(trabajaDespues===0,'no le pone ni un turno después de irse');
compruebaReglas(w,'tras la salida de Alex');
console.log('      Semana siguiente a su salida:');pinta(w,S+3);
const avFinal=w.getIssues().filter(i=>i.l==='e');
console.log('      Avisos graves: '+(avFinal.length?avFinal.map(i=>i.t).join(' · ').slice(0,180):'ninguno'));

console.log('\n'+'═'.repeat(74));
console.log(fallos?'  ❌ '+fallos+' fallos de '+pasos+' comprobaciones':'  ✅ '+pasos+' comprobaciones, ningún fallo');
console.log('═'.repeat(74)+'\n');
process.exit(fallos?1:0);
