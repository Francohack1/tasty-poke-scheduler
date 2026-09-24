// ════════════════════════════════════════════════════════════════════════════
//  VALORES LÍMITE Y DATOS CORRUPTOS
//  Lo que pasa cuando un campo recibe cero, negativo, texto, algo enorme o
//  basura; y cuando lo guardado en el navegador o en la nube viene roto.
// ════════════════════════════════════════════════════════════════════════════
const fs=require('fs');const {JSDOM,VirtualConsole}=require('jsdom');
const {estadoSano,reglasRotas}=require('./qa-invariantes.js');
const RAW=fs.readFileSync('index.html','utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
let bad=0;const ok=(c,m,x)=>{if(!c)bad++;console.log((c?'  ✅ ':'  ❌ ')+m+(x&&!c?'  → '+x:''));};
function app(store){
  const w=new JSDOM(RAW,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/',
    beforeParse(win){if(store!==undefined){win.localStorage.setItem('tpVer','18');win.localStorage.setItem('tpScheduler',store);}}}).window;
  w.cloudEnabled=false;w.confirm=()=>true;w.alert=()=>{};return w;
}
function resiste(nombre,fn){
  let w;
  try{w=app();fn(w);w.doSaveAndRegenerate();}
  catch(err){ok(false,nombre,'EXCEPCIÓN: '+err.message);return;}
  const sano=estadoSano(w);
  if(sano.length){ok(false,nombre,'estado corrupto: '+sano.slice(0,2).join(' · '));return;}
  let h=0;try{
    for(const s of Object.keys(w.genWeeks).map(Number)){w.weekOff=s;w._wdc=null;
      for(const e of w.emps)for(let d=0;d<7;d++){const x=w.gS(e.id,d);if(x&&x.t==='work')h+=w.shH(x);}}
  }catch(err){ok(false,nombre,'peta al leer el horario: '+err.message);return;}
  if(!isFinite(h)||h<0){ok(false,nombre,'horas absurdas: '+h);return;}
  ok(true,nombre+'   ('+h.toFixed(0)+'h repartidas)');
}

console.log('\n═══ Campos numéricos en los extremos ═══');
const campos=[
 ['horas de contrato = 0',w=>w.emps[0].h=0],
 ['horas de contrato negativas',w=>w.emps[0].h=-20],
 ['horas de contrato enormes',w=>w.emps[0].h=99999],
 ['horas de contrato con texto',w=>w.emps[0].h='muchas'],
 ['horas de contrato NaN',w=>w.emps[0].h=NaN],
 ['máximo diario = 0',w=>w.emps[0].mhd=0],
 ['máximo diario negativo',w=>w.emps[0].mhd=-5],
 ['máximo diario = 100',w=>w.emps[0].mhd=100],
 ['días/semana = 0',w=>w.emps[0].wd=0],
 ['días/semana = 99',w=>w.emps[0].wd=99],
 ['€/hora negativo',w=>w.emps[0].ch=-10],
 ['€/hora gigante',w=>w.emps[0].ch=1e9],
 ['extras autorizadas negativas',w=>{w.emps[0].ot=true;w.emps[0].mow=-8;}],
 ['extras autorizadas = 999',w=>{w.emps[0].ot=true;w.emps[0].mow=999;}],
 ['máximo a la vez = 0',w=>{w.document.getElementById('cfg-maxsim').value='0';}],
 ['máximo a la vez = 99',w=>{w.document.getElementById('cfg-maxsim').value='99';}],
 ['descansos = 0',w=>{w.document.getElementById('cfg-rd').value='0';}],
 ['descansos = 7',w=>{w.document.getElementById('cfg-rd').value='7';}],
 ['local abierto 1 minuto',w=>{w.document.getElementById('cfg-op').value='12:00';w.document.getElementById('cfg-cl').value='12:01';}],
 ['local 24 horas',w=>{w.document.getElementById('cfg-op').value='00:00';w.document.getElementById('cfg-cl').value='23:59';}],
 ['equipo vacío',w=>w.emps=[]],
 ['una sola persona',w=>w.emps=[w.emps[0]]],
 ['sin franjas de alta demanda',w=>w.peaks=[]],
 ['franja de 0 minutos',w=>{w.peaks=[{id:1,name:'X',days:[0],start:'13:30',end:'13:30',min:2}];}],
 ['franja que pide 99 personas',w=>{w.peaks[0].min=99;}],
 ['todos los días no disponibles',w=>w.emps.forEach(e=>e.ud=[0,1,2,3,4,5,6])],
 ['todos de baja a la vez',w=>{const f=w.getWD().map(d=>w.dStr(d));w.emps.forEach(e=>e.baja={from:f[0],to:f[6]});}],
 ['nadie puede abrir ni cerrar',w=>w.emps.forEach(e=>{e.canOpen=false;e.canClose=false;})],
 ['nombre con HTML',w=>w.emps[0].name='<script>alert(1)</script>'],
 ['nombre vacío',w=>w.emps[0].name=''],
 ['nombre larguísimo',w=>w.emps[0].name='A'.repeat(5000)],
 ['tabla partido con basura',w=>w.emps[0].md='XYZ!!!'],
 ['tabla partido corta',w=>w.emps[0].md='pc'],
 ['tabla partido larguísima',w=>w.emps[0].md='p'.repeat(500)],
 ['hora de entrada inválida',w=>w.emps[0].es='99:99'],
 ['fecha de alta absurda',w=>w.emps[0].start='no-es-fecha'],
 ['bloqueo con fecha rota',w=>w.emps[0].blocks=[{d:'xx',a:'ss',b:null}]],
];
for(const [n,f] of campos)resiste(n,f);

console.log('\n═══ Lo guardado viene roto ═══');
const corruptos=[
 ['JSON inválido','{esto no es json'],
 ['vacío',''],
 ['null','null'],
 ['una lista','[1,2,3]'],
 ['un número','42'],
 ['emps es texto','{"emps":"hola"}'],
 ['emps con nulls','{"emps":[null,null,{"name":"A"}]}'],
 ['sched corrupto','{"sched":{"1|2026-09-21":"texto"},"genWeeks":{"24":0}}'],
 ['genWeeks raro','{"genWeeks":{"no":"1","24":null}}'],
 ['refFoto basura','{"refSemana":"x","refFoto":[1,2,3]}'],
 ['fests con basura','{"fests":[1,"dos",{"date":null}]}'],
 ['festSeedY lista','{"festSeedY":[1,2]}'],
 ['objeto profundísimo','{"emps":'+'['.repeat(40)+']'.repeat(40)+'}'],
];
for(const [n,raw] of corruptos){
  let w;
  try{w=app(raw);}
  catch(err){ok(false,'arranca con '+n,'EXCEPCIÓN: '+err.message);continue;}
  const sano=estadoSano(w);
  const gen=Object.keys(w.genWeeks).length;
  ok(sano.length===0&&w.emps.length>0&&gen>0,
     'arranca con '+n+'   ('+w.emps.length+' personas, '+gen+' semanas)',
     sano.slice(0,2).join(' · ')||(gen?'':'no generó nada'));
}

// (la inyección de HTML se prueba a fondo en xss3.js)
console.log(bad?'\n❌ '+bad+' fallos\n':'\n✅ TODO OK\n');
process.exit(bad?1:0);
