const fs=require('fs');const {JSDOM,VirtualConsole}=require('jsdom');
const RAW=fs.readFileSync('index.html','utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
function mide(cfg){
  const w=new JSDOM(RAW,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/'}).window;
  w.cloudEnabled=false;cfg&&cfg(w);w.doGenerateAll();
  let flojas=0,tot=0,huecos=0,coste=0,extEnc=0,extCam=0,maxDia=0;
  for(const s of Object.keys(w.genWeeks).map(Number)){
    w.weekOff=s;w._wdc=null;
    for(const e of w.emps){const q=w.empW(e);coste+=q.tc;
      if(e.role==='encargado')extEnc+=q.ext;else extCam+=q.ext;
      for(let d=0;d<7;d++){const x=w.gS(e.id,d);if(x&&x.t==='work')maxDia=Math.max(maxDia,w.shH(x));}}
    for(let d=0;d<7;d++){
      for(const g of w.getCovSegs(d))if(g.cnt===0&&!g.inPause)huecos+=g.e-g.s;
      for(const p of w.peaks){if(p.days.indexOf(d)<0)continue;tot++;
        let c=0;for(const e of w.emps)if(w.overlaps(w.gS(e.id,d),p.start,p.end))c++;
        if(c<p.min)flojas++;}}
  }
  return{flojas,tot,huecos,coste:coste/5,extEnc:extEnc/5,extCam:extCam/5,maxDia,w};
}
const ot=(w,h,soloCam)=>w.emps.forEach(e=>{
  if(soloCam&&e.role==='encargado'){e.ot=false;e.mow=0;return;}
  e.ot=true;e.mow=h;e.or_=Math.round(e.ch*1.25*100)/100;});
console.log('\n'+'escenario'.padEnd(38)+'flojas'.padStart(8)+'huecos'.padStart(8)+'extra cam'.padStart(11)+'extra enc'.padStart(11)+'máx día'.padStart(9)+'coste'.padStart(9));
console.log('─'.repeat(94));
for(const [nom,cfg] of [
 ['Sin extras',null],
 ['Extras 2h/sem, solo camareros',w=>ot(w,2,true)],
 ['Extras 4h/sem, solo camareros',w=>ot(w,4,true)],
 ['Extras 6h/sem, solo camareros',w=>ot(w,6,true)],
 ['Extras 4h/sem, TODOS',w=>ot(w,4,false)],
]){
  const r=mide(cfg);
  console.log(nom.padEnd(38)+(r.flojas+'/'+r.tot).padStart(8)+(r.huecos+'m').padStart(8)+
    (r.extCam.toFixed(1)+'h').padStart(11)+(r.extEnc.toFixed(1)+'h').padStart(11)+
    (r.maxDia.toFixed(1)+'h').padStart(9)+(r.coste.toFixed(0)+'€').padStart(9));
}
process.exit(0);
