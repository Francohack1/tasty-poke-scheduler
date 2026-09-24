// ════════════════════════════════════════════════════════════════════════════
//  MONKEY TEST — un usuario caótico dando botones al azar
//  Tras CADA acción se comprueba: no hay excepción, el estado sigue sano, y
//  toda regla rota está avisada en Alertas.
// ════════════════════════════════════════════════════════════════════════════
const fs=require('fs');const {JSDOM,VirtualConsole}=require('jsdom');
const {reglasRotas,rotasEnSilencio,estadoSano,D}=require('./qa-invariantes.js');
const RAW=fs.readFileSync('index.html','utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
// generador con semilla, para poder repetir un fallo exacto
let semilla=Number(process.argv[2]||20260924);
const rnd=()=>{semilla=(semilla*1103515245+12345)&0x7fffffff;return semilla/0x7fffffff;};
const ri=n=>Math.floor(rnd()*n);
const pick=a=>a[ri(a.length)];

const w=new JSDOM(RAW,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/'}).window;
w.cloudEnabled=false;w.confirm=()=>rnd()<0.8;w.alert=()=>{};w.print=()=>{};
const HORAS=['09:00','09:30','10:00','12:00','13:30','15:30','17:00','20:00','22:00','23:30'];
const acciones=[
 ['editar un turno',()=>{
   const e=pick(w.emps),d=ri(7);
   w.openCell(e.id,d);
   const t=w.document.getElementById('mtype');if(!t)return;
   t.value=pick(['work','off','vac','baja']);w.mTCh();
   if(t.value==='work'){
     if(rnd()<0.5&&e.ap){w.mSh('p');
       const g=i=>w.document.getElementById(i);
       if(g('mms')){g('mms').value=pick(HORAS);g('mme').value=pick(HORAS);g('mas').value=pick(HORAS);g('mae').value=pick(HORAS);}
     }else{w.mSh('c');
       const g=i=>w.document.getElementById(i);
       if(g('ms')){g('ms').value=pick(HORAS);g('me').value=pick(HORAS);}}
   }
   w.saveCell(e.id,d);}],
 ['plantilla rápida',()=>{const e=pick(w.emps);w.qA(e.id,ri(7),pick(['ap','td','pa','no']));}],
 ['cambiar la tabla partido/corrido',()=>{const e=pick(w.emps);
   const m=e.md.split('');m[ri(7)]=pick(['a','p','c']);e.md=m.join('');w.doSaveAndRegenerate();}],
 ['poner una baja',()=>{const e=pick(w.emps);
   const sv=w.weekOff;w.weekOff=w.genFromOff()+ri(4);w._wdc=null;
   const f=w.getWD().map(x=>w.dStr(x));w.weekOff=sv;w._wdc=null;
   e.baja={from:f[ri(4)],to:f[3+ri(4)]};w.doSaveAndRegenerate();}],
 ['quitar la baja',()=>{const e=pick(w.emps);e.baja=null;w.doSaveAndRegenerate();}],
 ['autorizar o quitar horas extra',()=>{const e=pick(w.emps);
   e.ot=rnd()<0.6;e.mow=e.ot?pick([1,2,4,6,8]):0;e.or_=Math.round(e.ch*1.25*100)/100;w.doSaveAndRegenerate();}],
 ['cambiar horas de contrato',()=>{const e=pick(w.emps);e.h=pick([10,15,20,25,30,40]);w.doSaveAndRegenerate();}],
 ['cambiar días/semana',()=>{const e=pick(w.emps);e.wd=1+ri(6);w.doSaveAndRegenerate();}],
 ['cambiar máximo diario',()=>{const e=pick(w.emps);e.mhd=pick([4,6,8,9,10]);w.doSaveAndRegenerate();}],
 ['tocar quién abre o cierra',()=>{const e=pick(w.emps);
   if(rnd()<0.5)e.canOpen=!e.canOpen;else e.canClose=!e.canClose;w.doSaveAndRegenerate();}],
 ['cambiar el horario del local',()=>{
   const o=pick(['08:00','09:00','09:30','11:00','12:00']),c=pick(['21:00','22:00','23:00','23:30']);
   w.document.getElementById('cfg-op').value=o;w.document.getElementById('cfg-cl').value=c;
   w.cambioConfig('horario');}],
 ['cambiar el máximo a la vez',()=>{
   w.document.getElementById('cfg-maxsim').value=String(1+ri(3));
   w.document.getElementById('cfg-maxsimpk').value=String(1+ri(4));w.cambioConfig('máximo');}],
 ['cambiar los descansos',()=>{w.document.getElementById('cfg-rd').value=String(1+ri(3));w.cambioConfig('descansos');}],
 ['tocar una franja de alta demanda',()=>{
   if(!w.peaks.length)return;const p=pick(w.peaks);
   p.min=1+ri(3);p.days=[0,1,2,3,4,5,6].filter(()=>rnd()<0.6);w.doSaveAndRegenerate();}],
 ['dar de alta a alguien',()=>{
   if(w.emps.length>9)return;
   w.emps.push(Object.assign({},w.emps[1],{id:Date.now()+ri(1000),name:'X'+ri(99),
     h:pick([10,15,20,30]),md:'aaaaaaa',baja:null,blocks:[],ud:[]}));
   w.doSaveAndRegenerate();}],
 ['dar de baja a alguien',()=>{
   if(w.emps.length<=2)return;
   w.emps.splice(ri(w.emps.length),1);w.doSaveAndRegenerate();}],
 ['generar',()=>{w.document.getElementById('genfrom').value=String(w.genFromOff()+(ri(3)-1));w.generarPulsado();}],
 ['fijar la semana como referencia',()=>{
   w.document.getElementById('gen-ref').checked=rnd()<0.5;w.generarPulsado();}],
 ['deshacer',()=>w.doUndo()],
 ['rehacer',()=>w.doRedo()],
 ['navegar de semana',()=>{w.weekOff+=(ri(5)-2);w._wdc=null;w.renderSched();w.renderAssess();}],
 ['mirar alertas y costes',()=>{w.renderAlerts();w.renderCosts();w.renderEmps();w.renderFests();}],
 ['guardar',()=>w.saveConfig()],
];
const N=Number(process.argv[3]||500);
let fallos=[],cuenta={};
console.log('\n  Semilla '+semilla+' · '+N+' acciones\n');
for(let i=0;i<N;i++){
  const [nom,fn]=pick(acciones);
  cuenta[nom]=(cuenta[nom]||0)+1;
  try{fn();}
  catch(err){fallos.push({i,nom,tipo:'EXCEPCIÓN',det:err.message+' | '+String(err.stack).split('\n')[1]});continue;}
  const sano=estadoSano(w);
  if(sano.length){fallos.push({i,nom,tipo:'ESTADO CORRUPTO',det:sano.slice(0,2).join(' · ')});continue;}
  if(w.tm(w.gCL())<=w.tm(w.gOP()))continue;      // horario inválido: ya avisa aparte
  let mudas=[];
  try{mudas=rotasEnSilencio(w);}
  catch(err){fallos.push({i,nom,tipo:'EXCEPCIÓN AL REVISAR',det:err.message});continue;}
  if(mudas.length)fallos.push({i,nom,tipo:'REGLA ROTA EN SILENCIO',det:mudas.slice(0,2).join(' · ')});
}
console.log('  Acciones ejecutadas:');
Object.keys(cuenta).sort((a,b)=>cuenta[b]-cuenta[a]).forEach(k=>console.log('     '+String(cuenta[k]).padStart(3)+'  '+k));
console.log('\n  Equipo final: '+w.emps.length+' personas · '+Object.keys(w.genWeeks).length+' semanas generadas');
if(fallos.length){
  console.log('\n  ❌ '+fallos.length+' incidencias:\n');
  const porTipo={};fallos.forEach(f=>{porTipo[f.tipo]=(porTipo[f.tipo]||0)+1;});
  Object.keys(porTipo).forEach(t=>console.log('     '+porTipo[t]+' × '+t));
  console.log('');
  fallos.slice(0,8).forEach(f=>console.log('     #'+f.i+' tras «'+f.nom+'»\n        '+f.tipo+': '+f.det));
}else console.log('\n  ✅ Ninguna excepción, ningún estado corrupto, nada roto en silencio.');
process.exit(fallos.length?1:0);
