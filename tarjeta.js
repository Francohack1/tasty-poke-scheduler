const fs=require('fs');const {JSDOM,VirtualConsole}=require('jsdom');
const RAW=fs.readFileSync('index.html','utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
function abre(){const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>errs.push(String(e.message||e)));
 const w=new JSDOM(RAW,{runScripts:'dangerously',virtualConsole:vc,url:'https://x.test/'}).window;
 w.cloudEnabled=false;w.cloudPush=w.cloudPull=w.cloudCheck=()=>{};w.limitePreguntar=false;w._errs=errs;return w;}
const txt=h=>h.replace(/<[^>]+>/g,'·').replace(/·+/g,' ').replace(/\s+/g,' ').trim();
let bad=0;const ok=(c,t,x)=>{if(!c)bad++;console.log('  '+(c?'✅':'❌')+' '+t+(x!==undefined?'   → '+x:''));};
let w=abre();
console.log('\n── La tarjeta, como se ve en Equipo y en Config ──\n');
console.log('  '+txt(w.document.getElementById('objemp').innerHTML).replace(/ (Las |Turnos-persona|Horas de personal|Los días)/g,'\n  $1'));
ok(w.document.getElementById('objemp').innerHTML.length>400,'se pinta en Equipo');
ok(w.document.getElementById('objcfg').innerHTML.length>400,'se pinta en Config');
ok(w.document.getElementById('objemp').innerHTML===w.document.getElementById('objcfg').innerHTML,'y es la misma cuenta en los dos sitios');

console.log('\n── Reacciona a lo que configuro ──');
const necesarias=()=>w.diagnosticoObjetivo().horasNec, disp=()=>w.diagnosticoObjetivo().horasDisp;
const n0=necesarias(),d0=disp();
// 1. cierro 1h antes
w.document.getElementById('cfg-cl').value='22:30';w._wdc=null;w.renderEmps();
const n1=necesarias();
ok(n1<n0,'si cierro 1h antes, pide menos horas',w.h1(n0)+'h → '+w.h1(n1)+'h');
w.document.getElementById('cfg-cl').value='23:30';w._wdc=null;
// 2. quito el refuerzo de los lunes
const cena=w.peaks.filter(p=>/cena/i.test(p.name))[0];
const diasAntes=cena.days.slice();
cena.days=cena.days.filter(d=>d!==0);
const n2=necesarias();
ok(n2<n0,'si quito el refuerzo del lunes, pide menos',w.h1(n0)+'h → '+w.h1(n2)+'h');
cena.days=diasAntes;
// 3. autorizo más extras
const mafe=w.emps.find(e=>e.name==='Mafe');const mowAntes=mafe.mow;
mafe.mow=10;
const d3=disp();
ok(d3>d0,'si autorizo más extras, tengo más horas',w.h1(d0)+'h → '+w.h1(d3)+'h');
mafe.mow=mowAntes;
// 4. doy de baja a alguien
const ces=w.emps.find(e=>e.name==='Cesar');
ces.baja={from:'2020-01-01',to:'2099-01-01'};
const d4=disp();
w.renderEmps();
const t4=w.document.getElementById('objemp').innerHTML;
ok(d4<d0,'si alguien está de baja, sus horas no cuentan',w.h1(d0)+'h → '+w.h1(d4)+'h');
ok(/de baja/.test(t4),'y la tarjeta lo dice');
ces.baja=null;
// 5. añado una persona
w.emps.push(Object.assign({},mafe,{id:999,name:'Nuevo',h:25,ot:true,mow:6,baja:null}));
const d5=disp();
ok(d5>d0,'si añado una persona, sube lo disponible',w.h1(d0)+'h → '+w.h1(d5)+'h');
w.renderEmps();
ok(/de margen|justo/.test(txt(w.document.getElementById('objemp').innerHTML)),'y el semáforo pasa a verde/ámbar');
console.log('\n  con 5 personas:');
console.log('  '+txt(w.document.getElementById('objemp').innerHTML).slice(0,330));
console.log('\n── La línea de la pestaña Horario ──');
w.emps=w.emps.filter(e=>e.id!==999);w.renderEmps();
console.log('  '+txt(w.document.getElementById('objmini').innerHTML));
ok(/pide/.test(w.document.getElementById('objmini').innerHTML),'la línea corta se pinta en Horario');
w.emps.push(Object.assign({},mafe,{id:998,name:'Nuevo2',h:25,ot:true,mow:6,baja:null}));w.renderEmps();
console.log('  (con una persona más) '+txt(w.document.getElementById('objmini').innerHTML));
ok(/margen|justo/.test(w.document.getElementById('objmini').innerHTML),'y cambia de color cuando sobra');
console.log('\n  errores JS: '+w._errs.length+'   fallos: '+bad);
