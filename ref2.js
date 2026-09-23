const fs=require('fs'),path=require('path');const {JSDOM,VirtualConsole}=require('jsdom');
function app(){
  const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
  const w=new JSDOM(html,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/'}).window;
  w.cloudEnabled=false;w.confirm=()=>true;w.alert=()=>{};return w;
}
let bad=0;const ok=(c,m)=>{console.log((c?'  ✅ ':'  ❌ ')+m);if(!c)bad++;};
const foto=(w,s)=>{const sv=w.weekOff;w.weekOff=s;w._wdc=null;
  const o=w.emps.map(e=>{const f=[];for(let d=0;d<7;d++){const x=w.gS(e.id,d);
    f.push(x&&x.t==='work'?(x.sh==='p'?x.ms+'-'+x.me+'/'+x.as_+'-'+x.ae:x.s+'-'+x.e):(x&&x.t==='baja'?'BAJA':'libra'));}
    return e.name+': '+f.join(' | ');});w.weekOff=sv;w._wdc=null;return o;};
const edita=(w,sem,nombre,dia,s,e)=>{const sv=w.weekOff;w.weekOff=sem;w._wdc=null;
  const p=w.emps.find(x=>x.name===nombre);w.openCell(p.id,dia);
  w.document.getElementById('mtype').value='work';w.mTCh();w.mSh('c');
  w.document.getElementById('ms').value=s;w.document.getElementById('me').value=e;
  w.saveCell(p.id,dia);w.weekOff=sv;w._wdc=null;};

const w=app();w.doGenerateAll();
const SEM=w.genFromOff();
console.log('\n═══ 1. Edito dos turnos de la semana S'+w.weekNumOf(SEM).n+' ═══');
edita(w,SEM,'Alex',2,'16:00','23:00');
edita(w,SEM,'Mafe',0,'10:00','16:00');
foto(w,SEM).forEach(l=>console.log('   '+l));
ok(w.semanasTocadas[SEM]===true,'la app detecta que esa semana tiene cambios míos');
w.cambioGenFrom();
ok(w.document.getElementById('gen-ref').checked===true,'la casilla «usar tal cual» se marca sola');
const nota=w.document.getElementById('nota-ref');
ok(nota.style.display!=='none','sale el aviso explicando qué va a pasar');
console.log('   Aviso: "'+nota.textContent.trim().slice(0,110)+'…"');

console.log('\n═══ 2. Pulso Generar ═══');
const antes=foto(w,SEM);

w.generarPulsado();
const despues=foto(w,SEM);
ok(JSON.stringify(antes)===JSON.stringify(despues),'la semana de referencia queda IDÉNTICA');
if(JSON.stringify(antes)!==JSON.stringify(despues))
  antes.forEach((l,i)=>{if(l!==despues[i])console.log('      antes: '+l+'\n      ahora: '+despues[i]);});

console.log('\n═══ 3. Las 4 siguientes copian la referencia ═══');
for(let k=1;k<=4;k++){
  const f=foto(w,SEM+k);
  const igual=JSON.stringify(f)===JSON.stringify(despues);
  ok(igual,'S'+w.weekNumOf(SEM+k).n+' es igual que la referencia');
  if(!igual)f.forEach((l,i)=>{if(l!==despues[i])console.log('      ref: '+despues[i]+'\n      sem: '+l);});
}
console.log('\n   Semana siguiente:');
foto(w,SEM+1).forEach(l=>console.log('   '+l));

console.log('\n═══ 4. Sin marcar la casilla, sigue funcionando como siempre ═══');
const w2=app();w2.doGenerateAll();
const s2=w2.genFromOff();
edita(w2,s2,'Alex',2,'16:00','23:00');
w2.document.getElementById('gen-ref').checked=false;
const a2=foto(w2,s2);w2.generarPulsado();const d2=foto(w2,s2);
ok(JSON.stringify(a2)!==JSON.stringify(d2),'se recalcula todo (comportamiento de siempre)');
ok(JSON.stringify(foto(w2,s2))!==JSON.stringify(foto(w2,s2+1)),'y las semanas NO son idénticas: rotan');
console.log(bad?'\n❌ '+bad+' fallos\n':'\n✅ TODO OK\n');process.exit(bad?1:0);
