const fs=require('fs');const {JSDOM,VirtualConsole}=require('jsdom');
const RAW=fs.readFileSync('index.html','utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
const D=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
let bad=0;const ok=(c,m,x)=>{if(!c)bad++;console.log((c?'  ✅ ':'  ❌ ')+m+(x&&!c?'  → '+x:''));};
function mide(cfg){
  const w=new JSDOM(RAW,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/'}).window;
  w.cloudEnabled=false;w.limitePreguntar=false; if(cfg){cfg(w);w.doGenerateAll();}
  let peor=0,quien='',hue=0,flo=0,tot=0,ext=0,falta=0;
  for(const s of Object.keys(w.genWeeks).map(Number)){
    w.weekOff=s;w._wdc=null;
    for(const e of w.emps){const q=w.empW(e);ext+=q.ext;if(q.tot<e.h-0.26)falta+=(e.h-q.tot);
      for(let d=0;d<7;d++){const x=w.gS(e.id,d);if(!x||x.t!=='work')continue;
        const h=w.shH(x); if(h>peor){peor=h;quien=e.name+' '+D[d];}}}
    for(let d=0;d<7;d++){
      for(const g of w.getCovSegs(d))if(g.cnt===0&&!g.inPause)hue+=g.e-g.s;
      for(const p of w.peaks){if(p.days.indexOf(d)<0)continue;tot++;
        let c=0;for(const e of w.emps)if(w.overlaps(w.gS(e.id,d),p.start,p.end))c++;
        if(c<p.min)flo++;}}}
  return{peor,quien,hue,flo,tot,ext:ext/5,falta:falta/5,w};
}
console.log('\n═══ Ningún turno de más de 8 horas ═══');
const r=mide(null);
ok(r.peor<=8.01,'turno más largo de las 5 semanas: '+r.peor.toFixed(1)+'h ('+r.quien+')');
ok(r.hue===0,'cero minutos sin cubrir');
ok(r.falta<0.01,'todas las horas de contrato repartidas');
console.log('     puntas cubiertas '+(r.tot-r.flo)+'/'+r.tot+' ('+((r.tot-r.flo)*100/r.tot).toFixed(0)+'%)   extras '+r.ext.toFixed(1)+'h/sem');
console.log('\n═══ Y en otras configuraciones ═══');
for(const [n,c] of [
 ['tienda 12:00–23:00',w=>{w.document.getElementById('cfg-op').value='12:00';w.document.getElementById('cfg-cl').value='23:00';}],
 ['extras 8h/sem',w=>w.emps.forEach(e=>{if(e.role!=='encargado'){e.ot=true;e.mow=8;}})],
 ['con una baja',w=>{const f=w.getWD().map(d=>w.dStr(d));w.emps[3].baja={from:f[0],to:f[6]};}],
 ['6 personas',w=>{[1,2].forEach(k=>w.emps.push(Object.assign({},w.emps[2],{id:900+k,name:'N'+k,h:15,wd:3,md:'aaaaaaa',ot:true,mow:4})));}],
]){
  const q=mide(c);
  ok(q.peor<=8.01,n.padEnd(20)+'turno más largo '+q.peor.toFixed(1)+'h   puntas '+(q.tot-q.flo)+'/'+q.tot+'   huecos '+q.hue+'m');
}
console.log('\n═══ La semana ═══');
const w=r.w; const S=w.genFromOff(); w.weekOff=S; w._wdc=null;
for(const e of w.emps){const l=[];
  for(let d=0;d<7;d++){const x=w.gS(e.id,d);
    l.push(x&&x.t==='work'?((x.sh==='p'?x.ms+'-'+x.me+'/'+x.as_+'-'+x.ae:x.s+'-'+x.e)+' '+w.shH(x)+'h'):'—');}
  console.log('   '+e.name.padEnd(10)+l.map(v=>v.padEnd(27)).join('')+w.empW(e).tot.toFixed(1)+'h');}
console.log(bad?'\n❌ '+bad+' fallos\n':'\n✅ TODO OK\n');process.exit(bad?1:0);
