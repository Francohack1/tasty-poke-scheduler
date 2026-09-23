const fs=require('fs'),path=require('path');const {JSDOM,VirtualConsole}=require('jsdom');
const RAW=fs.readFileSync(path.join(__dirname,'index.html'),'utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
function app(store){
  const w=new JSDOM(RAW,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/',
    beforeParse(win){ if(store){ win.localStorage.setItem('tpVer','18'); win.localStorage.setItem('tpScheduler',store);} }}).window;
  w.cloudEnabled=false;w.confirm=()=>true;w.alert=()=>{};
  return w;
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
const fijar=(w)=>{w.cambioGenFrom();w.document.getElementById('gen-ref').checked=true;w.generarPulsado();};

console.log('\n═══ A. Una baja posterior se respeta en las copias ═══');
{const w=app();w.doGenerateAll();const S=w.genFromOff();
 edita(w,S,'Alex',2,'16:00','23:00');fijar(w);
 // Cesar se pone de baja la semana siguiente
 const sv=w.weekOff;w.weekOff=S+1;w._wdc=null;const f=w.getWD().map(d=>w.dStr(d));w.weekOff=sv;w._wdc=null;
 const cesar=w.emps.find(e=>e.name==='Cesar');cesar.baja={from:f[0],to:f[6]};
 w.generarPulsado();
 const sem1=foto(w,S+1).find(l=>l.startsWith('Cesar'));
 ok(/BAJA/.test(sem1)&&!/\d\d:\d\d/.test(sem1),'Cesar sale de BAJA toda esa semana: '+sem1);
 ok(!/BAJA/.test(foto(w,S).find(l=>l.startsWith('Cesar'))),'y en la semana de referencia sigue normal');}

console.log('\n═══ B. Alguien que entra más tarde ═══');
{const w=app();w.doGenerateAll();const S=w.genFromOff();
 edita(w,S,'Alex',2,'16:00','23:00');fijar(w);
 const sv=w.weekOff;w.weekOff=S+2;w._wdc=null;const f=w.getWD().map(d=>w.dStr(d));w.weekOff=sv;w._wdc=null;
 const m=w.emps.find(e=>e.name==='Mafe');m.start=f[3];   // entra el jueves de S+2
 w.generarPulsado();
 const l1=foto(w,S+1).find(l=>l.startsWith('Mafe')),l2=foto(w,S+2).find(l=>l.startsWith('Mafe'));
 ok(!/\d\d:\d\d/.test(l1),'antes de entrar no trabaja: '+l1);
 ok(/\d\d:\d\d|P/.test(l2.split(':').slice(1).join(':')),'desde que entra, sí (domingo partido): '+l2);}

console.log('\n═══ C. Sobrevive a cerrar y reabrir la app ═══');
{const w=app();w.doGenerateAll();const S=w.genFromOff();
 edita(w,S,'Alex',2,'16:00','23:00');fijar(w);
 const esperado=foto(w,S);
 const guardado=w.localStorage.getItem('tpScheduler');
 ok(!!JSON.parse(guardado).refFoto,'la referencia se guarda en el navegador');
 const w2=app(guardado);
 ok(w2.refSemana===S,'al reabrir, recuerda qué semana era la referencia');
 ok(JSON.stringify(foto(w2,S))===JSON.stringify(esperado),'y el horario sale idéntico al que dejaste');
 ok(w2.document.getElementById('gen-ref').checked===true,'la casilla aparece marcada sola');
 ok(JSON.stringify(foto(w2,S+3))===JSON.stringify(esperado),'las siguientes siguen siendo copias');}

console.log('\n═══ D. Desmarcar la casilla la suelta ═══');
{const w=app();w.doGenerateAll();const S=w.genFromOff();
 edita(w,S,'Alex',2,'16:00','23:00');fijar(w);
 const fijada=foto(w,S);
 w.document.getElementById('gen-ref').checked=false;w.generarPulsado();
 ok(JSON.stringify(foto(w,S))!==JSON.stringify(fijada),'vuelve a calcularla');
 ok(w.refSemana===null&&w.refFoto===null,'y olvida la referencia');
 ok(!JSON.parse(w.localStorage.getItem('tpScheduler')).refFoto,'también en lo guardado');}

console.log('\n═══ E. Deshacer ═══');
{const w=app();w.doGenerateAll();const S=w.genFromOff();
 const original=foto(w,S);
 edita(w,S,'Alex',2,'16:00','23:00');fijar(w);
 w.doUndo();
 ok(true,'deshacer no peta (estado: '+(w.refSemana===null?'referencia soltada':'referencia S'+w.weekNumOf(w.refSemana).n)+')');}

console.log('\n═══ F. Las propuestas no proponen tonterías ═══');
{const w=app();w.doGenerateAll();const S=w.genFromOff();
 edita(w,S,'Alex',2,'16:00','23:00');fijar(w);
 const t=w.document.getElementById('sugerencias').textContent;
 ok(!/Aplicar/.test(t),'no ofrece botones de "Aplicar" sobre un horario que pusiste tú');
 if(t.trim())console.log('   Mensaje: "'+t.trim().slice(0,160)+'…"');}

console.log('\n═══ G. Semana no generada + casilla marcada ═══');
{const w=app();w.doGenerateAll();
 const lejos=w.genFromOff()+20;
 w.document.getElementById('genfrom').innerHTML+='<option value="'+lejos+'">lejos</option>';
 w.document.getElementById('genfrom').value=String(lejos);
 w.document.getElementById('gen-ref').checked=true;w.pintaNotaRef();
 ok(/todavía no está generada/.test(w.document.getElementById('nota-ref').textContent),'avisa de que no hay nada que copiar');
 w.generarPulsado();
 ok(Object.keys(w.genWeeks).length===5,'y genera normal, sin romperse');}

console.log(bad?'\n❌ '+bad+' fallos\n':'\n✅ TODO OK\n');process.exit(bad?1:0);
