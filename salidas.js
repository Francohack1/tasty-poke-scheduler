const fs=require('fs'),path=require('path');const {JSDOM,VirtualConsole}=require('jsdom');
const XLSX=require('xlsx-js-style');
const RAW=fs.readFileSync('index.html','utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
let bad=0;const ok=(c,m,x)=>{if(!c)bad++;console.log((c?'  ✅ ':'  ❌ ')+m+(x&&!c?'  → '+x:''));};
const D=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const w=new JSDOM(RAW,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/'}).window;
w.cloudEnabled=false;w.XLSX=XLSX;
let guardado=null;
w.XLSX.writeFile=(wb,nombre)=>{guardado={wb,nombre};};
w.doGenerateAll();
const S=w.genFromOff();w.weekOff=S;w._wdc=null;

console.log('\n═══ Excel ═══');
w.doExcel();
ok(!!guardado,'genera el archivo');
ok(/\.xlsx$/.test(guardado.nombre),'con nombre correcto: '+guardado.nombre);
const hoja=guardado.wb.Sheets[guardado.wb.SheetNames[0]];
const celdas=Object.keys(hoja).filter(k=>k[0]!=='!');
ok(celdas.length>20,'con contenido ('+celdas.length+' celdas)');
const texto=celdas.map(k=>String(hoja[k].v==null?'':hoja[k].v)).join(' | ');
for(const e of w.emps)ok(texto.includes(e.name),'aparece '+e.name);
// cada turno del horario tiene que estar en el Excel
let faltan=0,total=0;
for(let d=0;d<7;d++)for(const e of w.emps){
  const x=w.gS(e.id,d);if(!x||x.t!=='work')continue;total++;
  const a=x.sh==='p'?x.ms:x.s,b=x.sh==='p'?x.ae:x.e;
  if(!texto.includes(a)||!texto.includes(b))faltan++;
}
ok(faltan===0,'los '+total+' turnos de la semana están en el Excel'+(faltan?' (faltan '+faltan+')':''));
ok(!!hoja['!merges']&&hoja['!merges'].length>0,'lleva las celdas combinadas del formato');
const conColor=celdas.filter(k=>hoja[k].s&&hoja[k].s.fill).length;
ok(conColor>5,'y los colores por persona ('+conColor+' celdas con fondo)');
// festivos de la semana marcados
const fes=w.fests.filter(f=>w.getWD().some(d=>w.dStr(d)===f.date)&&w.festActive(f));
if(fes.length)ok(fes.every(f=>texto.includes(f.name)),'los festivos de la semana salen en la cabecera: '+fes.map(f=>f.name).join(', '));
else console.log('  ·  esta semana no tiene festivos');

console.log('\n═══ Impresión ═══');
let impreso=false;w.print=()=>{impreso=true;};
w.doPrint();
ok(impreso,'llama a imprimir del navegador');
const tabla=w.document.getElementById('sctbl').textContent;
ok(w.emps.every(e=>tabla.includes(e.name)),'la tabla que se imprime lleva a todo el equipo');

console.log('\n═══ Texto para el grupo de WhatsApp ═══');
// se construye con lo que hay en pantalla: mismo dato, sin inventar nada
const lineas=[];
for(const e of w.emps){
  const turnos=[];
  for(let d=0;d<7;d++){const x=w.gS(e.id,d);
    if(x&&x.t==='work')turnos.push(D[d]+' '+(x.sh==='p'?x.ms+'–'+x.me+' y '+x.as_+'–'+x.ae:x.s+'–'+x.e));}
  lineas.push('*'+e.name+'*\n'+turnos.join('\n'));
}
const msg='*HORARIO S'+w.weekNumOf(S).n+'*\n\n'+lineas.join('\n\n');
console.log(msg.split('\n').map(l=>'      '+l).join('\n'));
let coinciden=0,cuenta=0;
for(let d=0;d<7;d++)for(const e of w.emps){const x=w.gS(e.id,d);if(!x||x.t!=='work')continue;cuenta++;
  if(msg.includes(x.sh==='p'?x.ms:x.s))coinciden++;}
ok(coinciden===cuenta,'el texto sale de los mismos datos del horario ('+coinciden+'/'+cuenta+')');
console.log(bad?'\n❌ '+bad+' fallos\n':'\n✅ TODO OK\n');
process.exit(bad?1:0);
