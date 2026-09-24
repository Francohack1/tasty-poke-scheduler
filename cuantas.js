const fs=require('fs');const {JSDOM,VirtualConsole}=require('jsdom');
const RAW=fs.readFileSync('index.html','utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
function mide(mow,tope){
  const w=new JSDOM(RAW,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/'}).window;
  w.cloudEnabled=false;
  if(tope)w.TOPE_DIA_ABS=tope;
  w.emps.forEach(e=>{if(e.role==='encargado'){e.ot=false;e.mow=0;return;}
    e.ot=true;e.mow=mow;e.or_=Math.round(e.ch*1.25*100)/100;});
  w.doGenerateAll();
  let flojas=0,tot=0,ext=0,coste=0,maxDia=0,huecos=0;
  for(const s of Object.keys(w.genWeeks).map(Number)){
    w.weekOff=s;w._wdc=null;
    for(const e of w.emps){const q=w.empW(e);ext+=q.ext;coste+=q.tc;
      for(let d=0;d<7;d++){const x=w.gS(e.id,d);if(x&&x.t==='work')maxDia=Math.max(maxDia,w.shH(x));}}
    for(let d=0;d<7;d++){
      for(const g of w.getCovSegs(d))if(g.cnt===0&&!g.inPause)huecos+=g.e-g.s;
      for(const p of w.peaks){if(p.days.indexOf(d)<0)continue;tot++;
      let c=0;for(const e of w.emps)if(w.overlaps(w.gS(e.id,d),p.start,p.end))c++;
      if(c<p.min)flojas++;}}
  }
  return{flojas,tot,ext:ext/5,coste:coste/5,maxDia,huecos};
}
console.log('\nSolo camareros hacen extras. Tope diario absoluto = 10h:');
console.log('  '+'extras autorizadas'.padEnd(24)+'flojas'.padStart(8)+'extras reales'.padStart(15)+'máx día'.padStart(9)+'coste/sem'.padStart(11)+'  al año');
console.log('  '+'─'.repeat(78));
for(const m of [0,2,4,6,8,10,12]){
  const r=mide(m);
  console.log('  '+((m||'—')+'h/sem cada uno').padEnd(24)+(r.flojas+'/'+r.tot).padStart(8)+
    (r.ext.toFixed(1)+'h').padStart(15)+(r.maxDia.toFixed(1)+'h').padStart(9)+
    (r.coste.toFixed(0)+'€').padStart(11)+'   '+(r.ext*52).toFixed(0)+'h extra/año ('+(r.ext*52/3).toFixed(0)+'h por camarero)');
}
console.log('\nY si el tope diario fuera 12h en vez de 10h:');
for(const m of [8,12]){
  const r=mide(m,12);
  console.log('  '+(m+'h/sem, tope 12h/día').padEnd(24)+(r.flojas+'/'+r.tot).padStart(8)+
    (r.ext.toFixed(1)+'h').padStart(15)+(r.maxDia.toFixed(1)+'h').padStart(9)+(r.coste.toFixed(0)+'€').padStart(11));
}
process.exit(0);
