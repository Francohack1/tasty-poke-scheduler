const fs=require('fs');const {JSDOM,VirtualConsole}=require('jsdom');
const RAW=fs.readFileSync('index.html','utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
let bad=0;const ok=(c,m,x)=>{if(!c)bad++;console.log((c?'  ✅ ':'  ❌ ')+m+(x&&!c?'  → '+x:''));};

console.log('\n═══ La encargada abre la app en el móvil ═══');
const w=new JSDOM(RAW,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/'}).window;
w.cloudEnabled=false;w.confirm=()=>true;w.alert=()=>{};
// etiquetas que hacen que se vea bien en un móvil
const vp=w.document.querySelector('meta[name="viewport"]');
ok(!!vp&&/width=device-width/.test(vp.content),'lleva la etiqueta viewport: '+(vp?vp.content:'—'));
ok(!!w.document.querySelector('link[rel="manifest"]'),'lleva el manifest para poder instalarla');
ok(!!w.document.querySelector('link[rel="apple-touch-icon"]'),'lleva el icono para iPhone');
ok(!!w.document.querySelector('meta[name="theme-color"]'),'lleva el color de la barra');
// todo lo ancho tiene que ir dentro de un contenedor con scroll propio
const tablas=[...w.document.querySelectorAll('table')];
const sinScroll=tablas.filter(t=>{let p=t.parentElement,n=0;
  while(p&&n++<4){if((p.className||'').includes('ov'))return false;p=p.parentElement;}return true;});
ok(sinScroll.length===0,'las '+tablas.length+' tablas van dentro de un contenedor que hace scroll',
   sinScroll.length+' sueltas');

console.log('\n═══ Puede trabajar: abre un turno y lo cambia ═══');
const S=w.genFromOff();w.weekOff=S;w._wdc=null;
const ale=w.emps.find(e=>e.name==='Alex');
w.openCell(ale.id,0);
const modal=w.document.getElementById('modal');
ok(modal.innerHTML.length>200,'se abre el cuadro del turno');
ok(!!w.document.getElementById('ms')&&!!w.document.getElementById('me'),'con los campos de entrada y salida');
const botones=[...modal.querySelectorAll('button')];
ok(botones.length>=4,'y con los botones de plantilla rápida ('+botones.length+' botones)');
w.document.getElementById('mtype').value='work';w.mTCh();w.mSh('c');
w.document.getElementById('ms').value='10:00';w.document.getElementById('me').value='17:30';
w.saveCell(ale.id,0);
const x=w.gS(ale.id,0);
ok(x.s==='10:00'&&x.e==='17:30','guarda el cambio: '+x.s+'–'+x.e);
ok(w.document.getElementById('modal').innerHTML==='','y cierra el cuadro');

console.log('\n═══ Dos dispositivos a la vez ═══');
// simulamos la nube con una variable compartida
let nube=null,pisado=false;
function dispositivo(nombre){
  const d=new JSDOM(RAW,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/'}).window;
  d.confirm=(t)=>{if(/guardó cambios después/.test(t)){pisado=true;return false;}return true;};
  d.alert=()=>{};d.cloudEnabled=false;
  return d;
}
const franco=dispositivo('Franco'),steph=dispositivo('Stephanie');
// Franco cambia un turno y "sube"
franco.weekOff=franco.genFromOff();franco._wdc=null;
const fa=franco.emps.find(e=>e.name==='Mafe');
franco.openCell(fa.id,1);
franco.document.getElementById('mtype').value='work';franco.mTCh();franco.mSh('c');
franco.document.getElementById('ms').value='11:00';franco.document.getElementById('me').value='18:00';
franco.saveCell(fa.id,1);
franco.saveConfig();
nube=franco.localStorage.getItem('tpScheduler');
ok(!!nube,'Franco guarda y sube');
// Stephanie "baja" lo de Franco
const cfg=JSON.parse(nube);
steph.applyCloudData(Object.assign({version:3},cfg,{settings:cfg.settings}));
steph.weekOff=steph.genFromOff();steph._wdc=null;
const sa=steph.emps.find(e=>e.name==='Mafe');
const y=steph.gS(sa.id,1);
ok(y&&y.s==='11:00'&&y.e==='18:00','Stephanie ve el mismo turno que puso Franco: '+(y?y.s+'–'+y.e:'—'));
let iguales=0,tot=0;
for(let d=0;d<7;d++)for(let i=0;i<franco.emps.length;i++){
  const a=franco.gS(franco.emps[i].id,d),b=steph.gS(steph.emps[i].id,d);tot++;
  if(JSON.stringify(a)===JSON.stringify(b))iguales++;}
ok(iguales===tot,'los dos ven exactamente el mismo horario ('+iguales+'/'+tot+' turnos)');

console.log('\n═══ Sin cobertura en la tienda ═══');
const sinRed=new JSDOM(RAW,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/'}).window;
sinRed.fetch=()=>Promise.reject(new Error('sin red'));
sinRed.alert=()=>{};sinRed.confirm=()=>true;
ok(Object.keys(sinRed.genWeeks).length===5,'genera el horario igual sin internet');
sinRed.weekOff=sinRed.genFromOff();sinRed._wdc=null;
let h=0;for(const e of sinRed.emps)for(let d=0;d<7;d++){const q=sinRed.gS(e.id,d);if(q&&q.t==='work')h+=sinRed.shH(q);}
ok(h>100,'y reparte las horas normalmente ('+h.toFixed(0)+'h)');
console.log(bad?'\n❌ '+bad+' fallos\n':'\n✅ TODO OK\n');
process.exit(bad?1:0);
