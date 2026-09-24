const fs=require('fs');const {JSDOM,VirtualConsole}=require('jsdom');
const RAW=fs.readFileSync('index.html','utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
const D=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
let bad=0;const ok=(c,m,x)=>{if(!c)bad++;console.log((c?'  ✅ ':'  ❌ ')+m+(x&&!c?'  → '+x:''));};
function app(cfg){const w=new JSDOM(RAW,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/'}).window;
  w.cloudEnabled=false;w.confirm=()=>true;w.alert=()=>{};
  // extras solo para camareros, como pediste
  w.emps.forEach(e=>{if(e.role!=='encargado'){e.ot=true;e.mow=4;e.or_=Math.round(e.ch*1.25*100)/100;}});
  cfg&&cfg(w);w.doGenerateAll();return w;}
function stats(w){
  let flojas=0,tot=0,huecos=0,falta=0,ext=0;
  for(const s of Object.keys(w.genWeeks).map(Number)){
    w.weekOff=s;w._wdc=null;
    for(const e of w.emps){const q=w.empW(e);ext+=q.ext;
      if(!e.baja&&q.tot<e.h-0.26)falta+=(e.h-q.tot);}
    for(let d=0;d<7;d++){
      for(const g of w.getCovSegs(d))if(g.cnt===0&&!g.inPause)huecos+=g.e-g.s;
      for(const p of w.peaks){if(p.days.indexOf(d)<0)continue;tot++;
        let c=0;for(const e of w.emps)if(w.overlaps(w.gS(e.id,d),p.start,p.end))c++;
        if(c<p.min)flojas++;}}
  }
  return{flojas,tot,huecos,falta:falta/5,ext:ext/5};
}

console.log('\n═══ 1. Todas las horas de contrato se usan ═══');
const w1=app();
const s1=stats(w1);
ok(s1.falta<0.01,'nadie se queda corto de contrato (faltan '+s1.falta.toFixed(2)+'h/sem)');
ok(s1.huecos===0,'y sin minutos sin cubrir');

console.log('\n═══ 2. Las puntas se configuran: solo donde de verdad hace falta ═══');
console.log('   Con 2 personas en TODAS las puntas, los 7 días:');
console.log('      franjas flojas: '+s1.flojas+'/'+s1.tot+'   extras usadas: '+s1.ext.toFixed(1)+'h/sem');
const w2=app(w=>{
  // realista: refuerzo en cenas de jueves a domingo, y mediodías de finde
  w.peaks=[{id:1,name:'Mediodía',days:[5,6],start:'13:30',end:'15:30',min:2},
           {id:2,name:'Cenas',days:[3,4,5,6],start:'20:00',end:'23:00',min:2}];
});
const s2=stats(w2);
console.log('   Con refuerzo solo en cenas jue-dom y mediodías sáb-dom:');
console.log('      franjas flojas: '+s2.flojas+'/'+s2.tot+'   extras usadas: '+s2.ext.toFixed(1)+'h/sem');
ok(s2.flojas*100/s2.tot < s1.flojas*100/s1.tot,'ajustar las puntas mejora el resultado');
ok(s2.huecos===0,'sigue sin huecos');
if(s2.flojas){
  w2.weekOff=w2.genFromOff();w2._wdc=null;
  console.log('      las que quedan flojas en la 1ª semana:');
  for(let d=0;d<7;d++)for(const p of w2.peaks){if(p.days.indexOf(d)<0)continue;
    let c=0;for(const e of w2.emps)if(w2.overlaps(w2.gS(e.id,d),p.start,p.end))c++;
    if(c<p.min)console.log('         '+D[d]+' '+p.name+': '+c+' de '+p.min);}
}

console.log('\n═══ 3. Una baja se cubre con horas extra ═══');
const w3=app(w=>{
  w.peaks=[{id:1,name:'Mediodía',days:[5,6],start:'13:30',end:'15:30',min:2},
           {id:2,name:'Cenas',days:[3,4,5,6],start:'20:00',end:'23:00',min:2}];
});
const S=w3.genFromOff();
const antes=stats(w3);
const ce=w3.emps.find(e=>e.name==='Cesar');
w3.weekOff=S+1;w3._wdc=null;
const f=w3.getWD().map(d=>w3.dStr(d));
ce.baja={from:f[0],to:f[6]};
w3.doSaveAndRegenerate();
w3.weekOff=S+1;w3._wdc=null;
let hue=0,ex=0,flo=0,tt=0;
for(let d=0;d<7;d++){
  for(const g of w3.getCovSegs(d))if(g.cnt===0&&!g.inPause)hue+=g.e-g.s;
  for(const p of w3.peaks){if(p.days.indexOf(d)<0)continue;tt++;
    let c=0;for(const e of w3.emps)if(w3.overlaps(w3.gS(e.id,d),p.start,p.end))c++;
    if(c<p.min)flo++;}}
for(const e of w3.emps)ex+=w3.empW(e).ext;
console.log('      Semana con Cesar de baja (faltan sus 20h):');
for(const e of w3.emps){const q=w3.empW(e);
  console.log('         '+e.name.padEnd(10)+q.tot.toFixed(1)+'h de '+e.h+'h'+(q.ext>0.05?'   +'+q.ext.toFixed(1)+'h extra':''));}
ok(ex>0.05,'se tira de horas extra para cubrir la baja: '+ex.toFixed(1)+'h');
ok(hue===0,'sin minutos sin cubrir esa semana ('+hue+'min)');
console.log('      franjas flojas esa semana: '+flo+'/'+tt);
const enc=w3.emps.find(e=>e.role==='encargado');
ok(w3.empW(enc).ext<0.05,'y la encargada NO hace extras ('+w3.empW(enc).ext.toFixed(1)+'h)');
console.log(bad?'\n❌ '+bad+' fallos\n':'\n✅ TODO OK\n');process.exit(bad?1:0);
