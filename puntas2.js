const fs=require('fs');const {JSDOM,VirtualConsole}=require('jsdom');
const RAW=fs.readFileSync('index.html','utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
let bad=0;const ok=(c,m,x)=>{if(!c)bad++;console.log((c?'  ✅ ':'  ❌ ')+m+(x&&!c?'  → '+x:''));};
function mide(cfg){
  const t0=Date.now();
  const w=new JSDOM(RAW,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/'}).window;
  w.cloudEnabled=false;cfg&&cfg(w);w.doGenerateAll();
  const ms=Date.now()-t0;
  let flojas=0,tot=0,huecos=0,over=0,rest=0;
  for(const s of Object.keys(w.genWeeks).map(Number)){
    w.weekOff=s;w._wdc=null;
    for(const e of w.emps){
      if(!e.ot){const q=w.empW(e);if(q.ext>0.26)over++;}
      for(let d=0;d<6;d++)if(w.descansoEntre(w.gS(e.id,d),w.gS(e.id,d+1))<12)rest++;
    }
    for(let d=0;d<7;d++){
      for(const g of w.getCovSegs(d))if(g.cnt===0&&!g.inPause)huecos+=g.e-g.s;
      for(const p of w.peaks){if(p.days.indexOf(d)<0)continue;tot++;
        let c=0;for(const e of w.emps)if(w.overlaps(w.gS(e.id,d),p.start,p.end))c++;
        if(c<p.min)flojas++;}}
  }
  return{flojas,tot,huecos,over,rest,ms,w};
}
console.log('\n═══ Reforzar puntas no rompe nada ═══');
for(const [nom,cfg] of [
  ['equipo actual',null],
  ['+2 de 12h',w=>{[1,2].forEach(n=>w.emps.push(Object.assign({},w.emps[2],{id:900+n,name:'N'+n,h:12,wd:3,md:'aaaaaaa'})));}],
  ['+1 de 25h',w=>w.emps.push(Object.assign({},w.emps[2],{id:901,name:'N1',h:25,wd:4,md:'aaaaaaa'}))],
  ['20 personas',w=>{for(let n=0;n<16;n++)w.emps.push(Object.assign({},w.emps[2],{id:900+n,name:'N'+n,h:20,wd:3,md:'aaaaaaa'}));}],
]){
  const r=mide(cfg);
  console.log('   '+nom.padEnd(16)+'puntas flojas '+(r.flojas+'/'+r.tot).padEnd(8)+
    '  huecos '+String(r.huecos).padStart(3)+'min   '+r.ms+'ms');
  ok(r.huecos===0,'   '+nom+': sin minutos sin cubrir');
  ok(r.over===0,'   '+nom+': nadie se pasa del contrato sin extras autorizadas');
  ok(r.ms<25000,'   '+nom+': tiempo razonable ('+r.ms+'ms)');
}
console.log('\n═══ Lo que fuerzas en la tabla no se toca ═══');
const r2=mide(w=>{w.emps[1].md='cccccccc'.slice(0,7);});
r2.w.weekOff=r2.w.genFromOff();r2.w._wdc=null;
let partidos=0;for(let d=0;d<7;d++){const x=r2.w.gS(r2.w.emps[1].id,d);if(x&&x.sh==='p')partidos++;}
ok(partidos===0,'con toda la semana en «C», ningún partido ('+partidos+')');
console.log(bad?'\n❌ '+bad+' fallos\n':'\n✅ TODO OK\n');process.exit(bad?1:0);
