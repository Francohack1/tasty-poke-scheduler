const fs=require('fs');const {JSDOM,VirtualConsole}=require('jsdom');
const RAW=fs.readFileSync('index.html','utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
console.log('\nSemana con Cesar de baja (se van sus 20h). Extras solo para camareros:');
console.log('  '+'autorizadas'.padEnd(18)+'extras usadas'.padStart(14)+'sin cubrir'.padStart(12)+'puntas flojas'.padStart(15));
console.log('  '+'─'.repeat(60));
for(const mow of [0,4,7,10]){
  const w=new JSDOM(RAW,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/'}).window;
  w.cloudEnabled=false;w.confirm=()=>true;w.alert=()=>{};
  w.peaks=[{id:1,name:'Mediodía',days:[5,6],start:'13:30',end:'15:30',min:2},
           {id:2,name:'Cenas',days:[3,4,5,6],start:'20:00',end:'23:00',min:2}];
  w.emps.forEach(e=>{if(e.role!=='encargado'&&mow>0){e.ot=true;e.mow=mow;e.or_=Math.round(e.ch*1.25*100)/100;}});
  const S=w.genFromOff();w.weekOff=S+1;w._wdc=null;
  const f=w.getWD().map(d=>w.dStr(d));
  w.emps.find(e=>e.name==='Cesar').baja={from:f[0],to:f[6]};
  w.doSaveAndRegenerate();
  w.weekOff=S+1;w._wdc=null;
  let hue=0,ext=0,flo=0,tt=0;
  for(const e of w.emps)ext+=w.empW(e).ext;
  for(let d=0;d<7;d++){
    for(const g of w.getCovSegs(d))if(g.cnt===0&&!g.inPause)hue+=g.e-g.s;
    for(const p of w.peaks){if(p.days.indexOf(d)<0)continue;tt++;
      let c=0;for(const e of w.emps)if(w.overlaps(w.gS(e.id,d),p.start,p.end))c++;
      if(c<p.min)flo++;}}
  console.log('  '+((mow?mow+'h/sem cada uno':'sin extras')).padEnd(18)+(ext.toFixed(1)+'h').padStart(14)+
    ((hue/60).toFixed(1)+'h').padStart(12)+(flo+'/'+tt).padStart(15));
}
process.exit(0);
