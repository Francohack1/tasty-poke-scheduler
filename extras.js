const fs=require('fs');const {JSDOM,VirtualConsole}=require('jsdom');
const RAW=fs.readFileSync('index.html','utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
function mide(cfg){
  const w=new JSDOM(RAW,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/'}).window;
  w.cloudEnabled=false;cfg&&cfg(w);w.doGenerateAll();
  let flojas=0,tot=0,huecos=0,ext=0,coste=0;
  for(const s of Object.keys(w.genWeeks).map(Number)){
    w.weekOff=s;w._wdc=null;
    for(const e of w.emps){const q=w.empW(e);ext+=q.ext;coste+=q.tc;}
    for(let d=0;d<7;d++){
      for(const g of w.getCovSegs(d))if(g.cnt===0&&!g.inPause)huecos+=g.e-g.s;
      for(const p of w.peaks){if(p.days.indexOf(d)<0)continue;tot++;
        let c=0;for(const e of w.emps)if(w.overlaps(w.gS(e.id,d),p.start,p.end))c++;
        if(c<p.min)flojas++;}}
  }
  return{flojas,tot,huecos,ext:ext/5,coste:coste/5};
}
const filas=[
 ['Sin horas extra (como ahora)',null],
 ['Extras 1,5h/sem (tope legal 80h/año)',w=>w.emps.forEach(e=>{e.ot=true;e.mow=1.5;e.or_=Math.round(e.ch*1.25*100)/100;})],
 ['Extras 4h/sem',w=>w.emps.forEach(e=>{e.ot=true;e.mow=4;e.or_=Math.round(e.ch*1.25*100)/100;})],
 ['Extras 8h/sem',w=>w.emps.forEach(e=>{e.ot=true;e.mow=8;e.or_=Math.round(e.ch*1.25*100)/100;})],
 ['+1 camarero de 20h, sin extras',w=>w.emps.push(Object.assign({},w.emps[2],{id:99,name:'Nuevo',h:20,md:'aaaaaaa'}))],
 ['+1 camarero de 20h + extras 1,5h',w=>{w.emps.push(Object.assign({},w.emps[2],{id:99,name:'Nuevo',h:20,md:'aaaaaaa'}));
   w.emps.forEach(e=>{e.ot=true;e.mow=1.5;e.or_=Math.round(e.ch*1.25*100)/100;});}],
];
console.log('\n'+'escenario'.padEnd(40)+'puntas flojas'.padStart(14)+'huecos'.padStart(9)+'extras/sem'.padStart(12)+'coste/sem'.padStart(11));
console.log('─'.repeat(87));
for(const [nom,cfg] of filas){
  const r=mide(cfg);
  console.log(nom.padEnd(40)+(r.flojas+'/'+r.tot).padStart(14)+(r.huecos+' min').padStart(9)+
    (r.ext.toFixed(1)+'h').padStart(12)+(r.coste.toFixed(0)+'€').padStart(11));
}
process.exit(0);
