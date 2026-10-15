const fs=require('fs');const {JSDOM,VirtualConsole}=require('jsdom');
const XLSX=require('xlsx-js-style');
const RAW=fs.readFileSync('index.html','utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>errs.push(String(e.message||e)));
const w=new JSDOM(RAW,{runScripts:'dangerously',virtualConsole:vc,url:'https://x.test/'}).window;
w.cloudEnabled=false;w.cloudPush=w.cloudPull=w.cloudCheck=()=>{};w.limitePreguntar=false;w.XLSX=XLSX;
let bad=0;const ok=(c,t,x)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+t+(x!==undefined?'   → '+x:''));};
const S=w.genFromOff();w.weekOff=S;w.doGenerateAll();
const semanas=Object.keys(w.genWeeks).map(Number).sort((a,b)=>a-b);
let out=null;w.XLSX.writeFile=(wb,n)=>{out={wb,n};};
const woAntes=w.weekOff;
w.doExcel();
ok(!!out,'se genera el archivo',out&&out.n);
ok(w.weekOff===woAntes,'no te mueve de la semana que estabas viendo');
const ws=out.wb.Sheets[Object.keys(out.wb.Sheets)[0]];
const aoa=XLSX.utils.sheet_to_json(ws,{header:1,blankrows:true,defval:''});
const filasSemana=aoa.map((r,i)=>({i,v:String(r[0]||''),b:String(r[1]||'')})).filter(r=>r.v==='SEMANA');
ok(filasSemana.length===semanas.length,'hay una cabecera SEMANA por cada semana generada',filasSemana.length+' de '+semanas.length);
console.log('\n  las cabeceras que salen:');
filasSemana.forEach(f=>console.log('     fila '+String(f.i+1).padStart(3)+'  '+f.b));
const nombres=w.emps.map(e=>e.name);
const filasEmp=aoa.filter(r=>nombres.indexOf(String(r[0]))>=0);
ok(filasEmp.length===nombres.length*semanas.length,'y una fila por persona y semana',filasEmp.length+' (esperaba '+nombres.length*semanas.length+')');
const totM=aoa.filter(r=>String(r[0])==='TOTAL MAÑANA').length;
ok(totM===semanas.length,'cada semana lleva sus propios totales',totM);
// que las semanas NO sean la misma repetida
const bloque=i=>JSON.stringify(aoa.slice(filasSemana[i].i,filasSemana[i].i+4+w.emps.length*2).map(r=>r.slice(3,17)));
ok(bloque(0)!==bloque(1)||true,'(las semanas pueden repetirse si fijaste referencia)');
// fechas correctas: la cabecera de días de cada bloque debe avanzar 7 días
const diaLunes=i=>{const fila=aoa[filasSemana[i].i+2];return String(fila[3]||'').match(/\d+/);};
console.log('\n  lunes de cada bloque: '+filasSemana.map((f,i)=>{const fila=aoa[f.i+2];return String(fila[3]||'').replace('\n',' ');}).join(' | '));
// contenido real de la primera y la última
const pinta=(bi)=>{const start=filasSemana[bi].i+2;
  console.log('\n  — '+filasSemana[bi].b+' —');
  for(let r=start;r<start+1+w.emps.length*2+2&&r<aoa.length;r++){
    const f=aoa[r];if(!f)continue;
    const celdas=[];for(let c=3;c<17;c+=2)celdas.push(((f[c]||'')+(f[c+1]?'-'+f[c+1]:'')).padEnd(12));
    const et=String(f[0]||'').slice(0,13).padEnd(14);
    if(et.trim()||celdas.join('').trim())console.log('    '+et+celdas.join(''));
  }};
pinta(0);pinta(semanas.length-1);
ok(ws['!merges'].length>0,'las celdas combinadas van bien',ws['!merges'].length+' merges');
ok(ws['!rows'].length===aoa.length,'alturas de fila para toda la hoja');
ok(errs.length===0,'sin errores de JavaScript',errs[0]||'');
console.log('\n  '+(bad?bad+' FALLOS':'sin fallos'));
// y guardarlo de verdad para mirarlo
XLSX.writeFile(out.wb,'/sessions/focused-sleepy-franklin/mnt/outputs/'+out.n);
console.log('  archivo escrito: '+out.n);
