const fs=require('fs');const {JSDOM,VirtualConsole}=require('jsdom');
const RAW=fs.readFileSync('index.html','utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
function mide(cfg){
  const w=new JSDOM(RAW,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/'}).window;
  w.cloudEnabled=false;cfg&&cfg(w);w.doGenerateAll();
  let flojas=0,tot=0,huecos=0,coste=0,horas=0;
  for(const s of Object.keys(w.genWeeks).map(Number)){
    w.weekOff=s;w._wdc=null;
    for(const e of w.emps){const q=w.empW(e);coste+=q.tc;horas+=q.tot;}
    for(let d=0;d<7;d++){
      for(const g of w.getCovSegs(d))if(g.cnt===0&&!g.inPause)huecos+=g.e-g.s;
      for(const p of w.peaks){if(p.days.indexOf(d)<0)continue;tot++;
        let c=0;for(const e of w.emps)if(w.overlaps(w.gS(e.id,d),p.start,p.end))c++;
        if(c<p.min)flojas++;}}
  }
  return{flojas,tot,huecos,coste:coste/5,horas:horas/5,n:w.emps.length};
}
const nuevo=(w,n,h)=>w.emps.push(Object.assign({},w.emps[2],{id:900+n,name:'N'+n,h:h,md:'aaaaaaa',wd:h>=30?4:3}));
const filas=[
 ['Ahora: 4 personas, 110h',null],
 ['+1 de 15h  (125h)',w=>nuevo(w,1,15)],
 ['+1 de 20h  (130h)',w=>nuevo(w,1,20)],
 ['+1 de 25h  (135h)',w=>nuevo(w,1,25)],
 ['+1 de 30h  (140h)',w=>nuevo(w,1,30)],
 ['+2 de 12h  (134h)',w=>{nuevo(w,1,12);nuevo(w,2,12);}],
 ['Cenas solo (quitar punta de mediodía)',w=>{w.peaks=w.peaks.filter(p=>p.name!=='Mediodía');}],
 ['Abrir a las 12:00 en vez de 09:30',w=>{w.document.getElementById('cfg-op').value='12:00';}],
];
console.log('\n'+'escenario'.padEnd(40)+'puntas flojas'.padStart(14)+'huecos'.padStart(9)+'horas/sem'.padStart(11)+'coste/sem'.padStart(11));
console.log('─'.repeat(85));
for(const [nom,cfg] of filas){
  const r=mide(cfg);
  console.log(nom.padEnd(40)+(r.flojas+'/'+r.tot).padStart(14)+(r.huecos+'min').padStart(9)+
    (r.horas.toFixed(0)+'h').padStart(11)+(r.coste.toFixed(0)+'€').padStart(11));
}
process.exit(0);
