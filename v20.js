// Test adversario de lo nuevo (v20) contra el archivo PUBLICADO
const fs=require('fs');const {JSDOM,VirtualConsole}=require('jsdom');
const RAW=fs.readFileSync('index.html','utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
let bad=0,nube=0;
const ok=(c,t,x)=>{if(!c)bad++;console.log('   '+(c?'✅':'❌')+' '+t+(x!==undefined&&x!==''?'   → '+x:''));};
function abre(store){
  const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>errs.push(String(e.message||e)));
  const w=new JSDOM(RAW,{runScripts:'dangerously',virtualConsole:vc,url:'https://francohack1.github.io/tasty-poke-scheduler/',
    beforeParse(win){if(store){win.localStorage.setItem('tpVer','18');win.localStorage.setItem('tpScheduler',store);}}}).window;
  w.cloudEnabled=false;w.cloudPush=()=>{nube++};w.cloudPull=()=>{};w.cloudCheck=()=>{};
  w.confirm=()=>true;w.alert=()=>{};w.print=()=>{};w._errs=errs;return w;
}
const sano=w=>{try{w.renderSched();w.renderAssess();w.renderEmps();w.renderPkCfg();return w._errs.length===0;}catch(e){return 'excepción: '+e.message;}};
const card=w=>(w.document.getElementById('objemp')||{innerHTML:''}).innerHTML;
const mini=w=>(w.document.getElementById('objmini')||{innerHTML:''}).innerHTML;
const limpio=h=>!/NaN|undefined|Infinity|null h/.test(h);

console.log('\n═══ 1. La tarjeta con el equipo vacío ═══');
{const w=abre();w.emps=[];w._wdc=null;w.renderEmps();
 ok(sano(w)===true,'no revienta sin empleados',w._errs[0]||'');
 ok(limpio(card(w)),'sin NaN ni undefined en la tarjeta');
 ok(/0 h|0h/.test(card(w).replace(/<[^>]+>/g,' ')),'dice que tienes 0 h');}

console.log('\n═══ 2. Todos de baja ═══');
{const w=abre();w.emps.forEach(e=>e.baja={from:'2020-01-01',to:'2099-01-01'});w._wdc=null;w.renderEmps();
 const t=card(w).replace(/<[^>]+>/g,' ');
 ok(limpio(card(w)),'tarjeta sin basura');
 ok(/de baja/.test(t),'avisa de que están de baja');
 ok(/0 h/.test(t),'y que no queda ninguna hora disponible');
 ok(sano(w)===true,'la app sigue entera',w._errs[0]||'');}

console.log('\n═══ 3. Sin franjas de alta demanda ═══');
{const w=abre();w.peaks=[];w._wdc=null;w.renderEmps();w.renderPkCfg();
 const t=card(w).replace(/<[^>]+>/g,' ');
 ok(limpio(card(w)),'sin NaN al dividir por cero franjas');
 ok(/98 h/.test(t),'pide solo las horas de apertura: 98 h');
 ok(sano(w)===true,'sigue entera',w._errs[0]||'');}

console.log('\n═══ 4. El local abierto 24h (caso absurdo a propósito) ═══');
{const w=abre();w.document.getElementById('cfg-op').value='00:00';w.document.getElementById('cfg-cl').value='23:59';
 w._wdc=null;w.renderEmps();
 const t=card(w).replace(/<[^>]+>/g,' ');
 ok(limpio(card(w)),'la cuenta aguanta',t.slice(0,60));
 ok(/16[0-9]\.?\d? h/.test(t),'pide ~167 h de apertura');}

console.log('\n═══ 5. Un nombre con HTML dentro (inyección) ═══');
{const w=abre();w.emps[1].name='<img src=x onerror=alert(1)>';w.emps[1].h=5;w._wdc=null;
 w.generarPulsado();
 const m=w.document.getElementById('modal').innerHTML;
 ok(!/<img/i.test(m)||/&lt;img/.test(m),'el nombre va escapado en el diálogo');
 ok(w.document.querySelectorAll('#modal img').length===0,'no se crea ninguna etiqueta img viva');
 w.renderEmps();
 ok(w.document.querySelectorAll('#objemp img').length===0,'ni en la tarjeta');
 ok(w._errs.length===0,'sin errores',w._errs[0]||'');}

console.log('\n═══ 6. Solo la encargada (sin camareros a quien dar extras) ═══');
{const w=abre();w.emps=w.emps.filter(e=>e.role==='encargado');w._wdc=null;
 w.generarPulsado();
 const m=w.document.getElementById('modal').innerHTML;
 const ops=(m.match(/eligeLimite\('(\w+)'\)/g)||[]).map(s=>s.match(/'(\w+)'/)[1]);
 ok(ops.indexOf('extra')<0,'no me ofrece horas extra si no hay a quién dárselas',ops.join(', '));
 ok(ops.indexOf('nada')>=0,'pero siempre queda la salida de no romper nada');
 w.eligeLimite('nada');
 ok(Object.keys(w.genWeeks).length===5,'y genera igual');
 ok(w._errs.length===0,'sin errores',w._errs[0]||'');}

console.log('\n═══ 7. Cancelar el diálogo no toca nada ═══');
{const w=abre();w.limitePreguntar=false;w.generarPulsado();
 const antes=JSON.stringify(w.sched),nSem=Object.keys(w.genWeeks).length;
 w.limitePreguntar=true;w.generarPulsado();
 ok(/límite/.test(w.document.getElementById('modal').innerHTML),'sale el diálogo');
 w.closeM();
 ok(JSON.stringify(w.sched)===antes,'al cancelar, el horario que tenía sigue intacto');
 ok(Object.keys(w.genWeeks).length===nSem,'y las mismas semanas');}

console.log('\n═══ 8. «No volver a preguntarme» se queda guardado ═══');
{const w=abre();w.generarPulsado();
 const chk=w.document.getElementById('limnoask');chk.checked=true;
 w.eligeLimite('nada');
 ok(w.limitePreguntar===false,'queda desactivado');
 w.saveConfig();
 const store=w.localStorage.getItem('tpScheduler');
 ok(/limitePreguntar/.test(store),'se guarda en el navegador');
 const w2=abre(store);
 ok(w2.limitePreguntar===false,'y sigue desactivado al reabrir');
 w2.generarPulsado();
 ok(w2.document.getElementById('modal').innerHTML==='','ya no vuelve a preguntar');
 ok(Object.keys(w2.genWeeks).length===5,'genera directamente');}

console.log('\n═══ 9. Elegir «puntas» no deja la config rota ═══');
{const w=abre();w.generarPulsado();w.eligeLimite('puntas');
 ok(w.peaks.every(p=>Array.isArray(p.days)),'las franjas siguen bien formadas');
 ok(w.peaks.some(p=>p.days.length>0),'queda al menos una franja con días');
 const g=w.diagnosticoObjetivo();
 ok(g.faltanHoras<0.5&&g.faltanPD===0,'y la cuenta ya cuadra',w.h1(g.horasNec)+'h de '+w.h1(g.horasDisp)+'h');
 w.renderPkCfg();
 ok(sano(w)===true,'la pestaña Config se pinta',w._errs[0]||'');
 w.saveConfig();
 const w2=abre(w.localStorage.getItem('tpScheduler'));
 ok(JSON.stringify(w2.peaks.map(p=>p.days))===JSON.stringify(w.peaks.map(p=>p.days)),'y se guarda al reabrir');}

console.log('\n═══ 10. 8 personas: debe sobrar y ponerse verde ═══');
{const w=abre();
 for(let i=0;i<4;i++)w.emps.push(Object.assign({},w.emps[2],{id:900+i,name:'Extra'+i,h:25,ot:true,mow:4,baja:null}));
 w._wdc=null;w.renderEmps();
 const t=card(w).replace(/<[^>]+>/g,' ');
 ok(/de margen/.test(t),'la tarjeta dice que sobra',t.match(/\+[\d.,]+ h de margen/)||'');
 ok(/suficientes/.test(t),'y que los turnos-persona llegan');
 w.generarPulsado();
 ok(w.document.getElementById('modal').innerHTML==='','no pregunta por límites: no hace falta');
 ok(Object.keys(w.genWeeks).length===5,'genera directo');
 let cub=0,tot=0,hue=0,peor=0;
 for(const s of Object.keys(w.genWeeks).map(Number)){w.weekOff=s;w._wdc=null;
  for(const e of w.emps)for(let d=0;d<7;d++){const x=w.gS(e.id,d);if(x&&x.t==='work')peor=Math.max(peor,w.shH(x));}
  for(let d=0;d<7;d++){for(const g of w.getCovSegs(d))if(g.cnt===0&&!g.inPause)hue+=(g.e-g.s);
   for(const pk of w.peaks){if(pk.days.indexOf(d)<0)continue;tot++;if(w.gentePunta(d,pk)>=pk.min)cub++;}}}
 ok(hue===0,'sin huecos',hue+' min');
 ok(peor<=8.01,'nadie pasa de 8h',peor.toFixed(1)+'h');
 ok(cub===tot,'y AHORA SÍ cubre todas las franjas',cub+'/'+tot);}

console.log('\n═══ 11. La línea de Horario con números raros ═══');
{const w=abre();w.emps.forEach(e=>{e.h=0;e.mow=0;e.ot=false;});w._wdc=null;w.renderEmps();
 ok(limpio(mini(w)),'0 h de contrato: sin NaN',mini(w).replace(/<[^>]+>/g,' ').trim().slice(0,70));
 w.emps.forEach(e=>{e.h=40;e.mhd=0;});w._wdc=null;w.renderEmps();
 ok(limpio(card(w)),'máx 0 h/día: sin división por cero');
 ok(sano(w)===true,'sigue entera',w._errs[0]||'');}

console.log('\n═══ 12. Móvil: la tarjeta cabe ═══');
{const w=abre();w.innerWidth=360;w.renderEmps();
 const c=w.document.getElementById('objemp');
 ok(!/width:\s*\d{3,}px/.test(c.innerHTML),'sin anchos fijos que desborden');
 ok((c.innerHTML.match(/grid-template-columns/g)||[]).length>=2,'usa rejillas que se adaptan');
 ok(sano(w)===true,'se pinta en móvil');}

console.log('\n'+(bad?'\x1b[31m   '+bad+' FALLOS\x1b[0m':'\x1b[32m   Sin fallos\x1b[0m')+'   ·   escrituras en tu nube: '+nube);
