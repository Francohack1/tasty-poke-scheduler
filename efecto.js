const fs=require('fs');const {JSDOM,VirtualConsole}=require('jsdom');
const RAW=fs.readFileSync('index.html','utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
function mide(cfg){
  const w=new JSDOM(RAW,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/'}).window;
  w.cloudEnabled=false;cfg&&cfg(w);if(cfg)w.doGenerateAll();
  let flo=0,tot=0,hue=0,ext=0,cost=0;
  for(const s of Object.keys(w.genWeeks).map(Number)){
    w.weekOff=s;w._wdc=null;
    for(const e of w.emps){const q=w.empW(e);ext+=q.ext;cost+=q.tc;}
    for(let d=0;d<7;d++){
      for(const g of w.getCovSegs(d))if(g.cnt===0&&!g.inPause)hue+=g.e-g.s;
      for(const p of w.peaks){if(p.days.indexOf(d)<0)continue;tot++;
        let c=0;for(const e of w.emps)if(w.overlaps(w.gS(e.id,d),p.start,p.end))c++;
        if(c<p.min)flo++;}}
  }
  return{flo,tot,hue,ext:ext/5,cost:cost/5};
}
console.log('\n'+'configuración de puntas'.padEnd(44)+'flojas'.padStart(8)+'huecos'.padStart(8)+'extras'.padStart(9)+'coste/sem'.padStart(11));
console.log('─'.repeat(80));
const filas=[
 ['Como viene (2 pers. en las 14 franjas)',null],
 ['Cenas jue-dom + mediodías finde',w=>{w.peaks=[{id:1,name:'Mediodía',days:[5,6],start:'13:30',end:'15:30',min:2},
   {id:2,name:'Cenas',days:[3,4,5,6],start:'20:00',end:'23:00',min:2}];}],
 ['Solo cenas, todos los días',w=>{w.peaks=[{id:2,name:'Cenas',days:[0,1,2,3,4,5,6],start:'20:00',end:'23:00',min:2}];}],
 ['Solo cenas jue-dom',w=>{w.peaks=[{id:2,name:'Cenas',days:[3,4,5,6],start:'20:00',end:'23:00',min:2}];}],
];
for(const [n,c] of filas){const r=mide(c);
  console.log(n.padEnd(44)+(r.flo+'/'+r.tot).padStart(8)+(r.hue+'m').padStart(8)+
    (r.ext.toFixed(1)+'h').padStart(9)+(r.cost.toFixed(0)+'€').padStart(11));}
process.exit(0);
