const fs=require('fs');const {JSDOM,VirtualConsole}=require('jsdom');
const RAW=fs.readFileSync('index.html','utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
const D=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
let bad=0;const ok=(c,m,x)=>{if(!c)bad++;console.log((c?'  ✅ ':'  ❌ ')+m+(x&&!c?'  → '+x:''));};
function mide(cfg){
  const w=new JSDOM(RAW,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/'}).window;
  w.cloudEnabled=false;if(cfg){cfg(w);w.doGenerateAll();}
  const cortos=[],dur=[];let flo=0,tot=0,hue=0;
  for(const s of Object.keys(w.genWeeks).map(Number)){
    w.weekOff=s;w._wdc=null;
    for(const e of w.emps)for(let d=0;d<7;d++){const x=w.gS(e.id,d);
      if(!x||x.t!=='work')continue;const h=w.shH(x);dur.push(h);
      if(h<2)cortos.push(e.name+' S'+w.weekNumOf(s).n+' '+D[d]+' '+h+'h');}
    for(let d=0;d<7;d++){
      for(const g of w.getCovSegs(d))if(g.cnt===0&&!g.inPause)hue+=g.e-g.s;
      for(const p of w.peaks){if(p.days.indexOf(d)<0)continue;tot++;
        let c=0;for(const e of w.emps)if(w.overlaps(w.gS(e.id,d),p.start,p.end))c++;
        if(c<p.min)flo++;}}
  }
  return{cortos,flo,tot,hue,min:Math.min(...dur),w};
}
console.log('\n═══ Ningún turno por debajo de 2 h (y solo tan corto si la tienda queda vacía) ═══');
for(const [n,c] of [
 ['equipo actual',null],
 ['con una baja',w=>{const f=w.getWD().map(d=>w.dStr(d));w.emps[3].baja={from:f[0],to:f[6]};}],
 ['extras 8h/sem',w=>w.emps.forEach(e=>{if(e.role!=='encargado'){e.ot=true;e.mow=8;}})],
 ['6 personas',w=>{[1,2].forEach(k=>w.emps.push(Object.assign({},w.emps[2],{id:900+k,name:'N'+k,h:12,wd:3,md:'aaaaaaa'})));}],
]){
  const r=mide(c);
  ok(r.cortos.length===0,n.padEnd(16)+'turno más corto: '+r.min.toFixed(1)+'h   puntas '+r.flo+'/'+r.tot+'   huecos '+r.hue+'m',
     r.cortos.slice(0,3).join(', '));
}
console.log(bad?'\n❌ '+bad+' fallos\n':'\n✅ TODO OK\n');process.exit(bad?1:0);
