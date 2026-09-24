const fs=require('fs');const {JSDOM,VirtualConsole}=require('jsdom');
const RAW=fs.readFileSync('index.html','utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
function app(cfg){const w=new JSDOM(RAW,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/'}).window;
  w.cloudEnabled=false;w.confirm=()=>true;cfg&&cfg(w);w.doGenerateAll();return w;}
let bad=0;const ok=(c,m)=>{console.log((c?'  ✅ ':'  ❌ ')+m);if(!c)bad++;};
const D=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const redonda=t=>!t||/:(00|30)$/.test(t);
function revisa(w,nom){
  const malas=[],largos=[],duras=[];
  const opM=w.tm(w.gOP()),clM=w.tm(w.gCL());
  for(const s of Object.keys(w.genWeeks).map(Number)){w.weekOff=s;w._wdc=null;
    for(const e of w.emps)for(let d=0;d<7;d++){const x=w.gS(e.id,d);
      if(!x||x.t!=='work')continue;
      const campos=x.sh==='p'?[x.ms,x.me,x.as_,x.ae]:[x.s,x.e];
      for(const t of campos){const m=w.tm(t);
        if(!redonda(t)&&m!==opM&&m!==clM)malas.push(e.name+' '+D[d]+' '+t);}
      const h=w.shH(x);
      if(Math.abs(h*2-Math.round(h*2))>0.001)duras.push(e.name+' '+D[d]+' '+h.toFixed(2)+'h');
      if(h>e.mhd+0.001&&!e.ot)largos.push(e.name+' '+D[d]+' '+h.toFixed(2)+'h');}}
  ok(malas.length===0,nom+': todas las horas en :00 o :30'+(malas.length?'  ← '+malas.slice(0,3).join(', '):''));
  ok(duras.length===0,nom+': todas las jornadas en medias horas exactas'+(duras.length?'  ← '+duras.slice(0,3).join(', '):''));
  ok(largos.length===0,nom+': nadie pasa de su máximo diario'+(largos.length?'  ← '+largos.slice(0,3).join(', '):''));
  let min=0;for(const s of Object.keys(w.genWeeks).map(Number)){w.weekOff=s;w._wdc=null;
    for(let d=0;d<7;d++)for(const g of w.getCovSegs(d))if(g.cnt===0&&!g.inPause)min+=g.e-g.s;}
  ok(min===0,nom+': cero minutos sin cubrir'+(min?' ('+min+' min)':''));
  // O cuadra el contrato, o la app te dice a quién le faltan horas. Lo que no
  // vale es que alguien cobre horas que no trabaja sin que nadie lo diga.
  const falta=[],mudos=[];
  for(const s of Object.keys(w.genWeeks).map(Number)){w.weekOff=s;w._wdc=null;
    const avisos=w.getIssues().map(i=>i.t).join(' | ');
    for(const e of w.emps){const t=w.empW(e);
      // Pasarse del contrato es horas extra: correcto si están autorizadas.
      const techo=e.h+(e.ot?e.mow:0);
      if(t.tot>=e.h-0.01&&t.tot<=techo+0.01)continue;
      falta.push(e.name+' S'+w.weekNumOf(s).n+' '+t.tot.toFixed(1)+'/'+e.h);
      if(avisos.indexOf(e.name)<0)mudos.push(e.name+' S'+w.weekNumOf(s).n);}}
  if(falta.length)ok(mudos.length===0,nom+': los '+falta.length+' descuadres de contrato están avisados ('+falta.slice(0,2).join(', ')+')',mudos.join(', '));
  else ok(true,nom+': todos cuadran su contrato al minuto');
}

console.log('\n═══ Tu equipo ═══');
const w=app();
w.weekOff=w.genFromOff();w._wdc=null;
for(const e of w.emps){const l=[];
  for(let d=0;d<7;d++){const x=w.gS(e.id,d);
    l.push(D[d]+' '+(x&&x.t==='work'?(x.sh==='p'?x.ms+'-'+x.me+'/'+x.as_+'-'+x.ae:x.s+'-'+x.e)+' ('+w.shH(x)+'h)':'libra'));}
  console.log('   '+e.name.padEnd(10)+w.empW(e).tot.toFixed(1)+'h de '+e.h+'h');
  console.log('      '+l.join('  |  '));}
console.log('');
revisa(w,'equipo actual');

console.log('\n═══ Otras configuraciones ═══');
const casos=[
 ['12:00–23:00',x=>{x.document.getElementById('cfg-op').value='12:00';x.document.getElementById('cfg-cl').value='23:00';}],
 ['10:00–22:00',x=>{x.document.getElementById('cfg-op').value='10:00';x.document.getElementById('cfg-cl').value='22:00';}],
 ['6 personas',x=>{[5,6].forEach(n=>x.emps.push(Object.assign({},x.emps[1],{id:100+n,name:'P'+n,h:20,mhd:8})));}],
 ['Nadie parte turno',x=>{x.emps.forEach(e=>e.ap=false);}],
 ['Contratos 40/30/20/20 con 25h extra',x=>{x.emps.push(Object.assign({},x.emps[1],{id:99,name:'Nuria',h:20,mhd:8}));}],
];
for(const [nom,cfg] of casos)revisa(app(cfg),nom);
console.log(bad?'\n❌ '+bad+' fallos\n':'\n✅ TODO OK\n');process.exit(bad?1:0);
