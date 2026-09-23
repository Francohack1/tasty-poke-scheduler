const fs=require('fs'),path=require('path');const {JSDOM,VirtualConsole}=require('jsdom');
const RAW=fs.readFileSync(path.join(__dirname,'index.html'),'utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
function app(cfg){
  const w=new JSDOM(RAW,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/'}).window;
  w.cloudEnabled=false;cfg&&cfg(w);w.doGenerateAll();return w;
}
const ft=m=>('0'+Math.floor(m/60)).slice(-2)+':'+('0'+(m%60)).slice(-2);
const D=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
function mide(w){
  const out=[];
  for(const s of Object.keys(w.genWeeks).map(Number)){
    w.weekOff=s;w._wdc=null;
    for(let d=0;d<7;d++)for(const g of w.getCovSegs(d))
      if(g.cnt===0&&!g.inPause)out.push({sem:s,d,s:g.s,e:g.e,dur:g.e-g.s});
  }
  return out;
}
const sv=(w,id,v)=>{w.document.getElementById(id).value=v;};
const casos=[
 ['Tu config (09:30–23:30, 4p/110h)',null],
 ['Tienda 08:00–23:59 (16h)',w=>{sv(w,'cfg-op','08:00');sv(w,'cfg-cl','23:59');}],
 ['Tienda 10:00–22:00 (12h)',w=>{sv(w,'cfg-op','10:00');sv(w,'cfg-cl','22:00');}],
 ['Tienda 12:00–23:00 (11h)',w=>{sv(w,'cfg-op','12:00');sv(w,'cfg-cl','23:00');}],
 ['Tienda 11:15–22:45 (horas raras)',w=>{sv(w,'cfg-op','11:15');sv(w,'cfg-cl','22:45');}],
 ['Nadie hace partido',w=>{w.emps.forEach(e=>e.ap=false);}],
 ['Todos 20h / 3 días',w=>{w.emps.forEach(e=>{e.h=20;e.wd=3;});}],
 ['Todos 30h / 5 días',w=>{w.emps.forEach(e=>{e.h=30;e.wd=5;});}],
 ['Contratos raros (17h, 23h, 31h, 37h)',w=>{[17,23,31,37].forEach((h,i)=>{w.emps[i].h=h;});}],
 ['Equipo grande (7p, 170h)',w=>{[5,6,7].forEach(n=>w.emps.push(Object.assign({},w.emps[1],{id:100+n,name:'P'+n,h:20})));}],
 ['Máx 1 persona a la vez',w=>{sv(w,'cfg-maxsim','1');sv(w,'cfg-maxsimpk','1');}],
 ['Máx 5h/día a todos',w=>{w.emps.forEach(e=>e.mhd=5);}],
 ['3 días de descanso',w=>{sv(w,'cfg-rd','3');}],
];
console.log('caso'.padEnd(40)+'huecos'.padStart(8)+'min/sem'.padStart(9)+'   el mayor');
console.log('─'.repeat(78));
for(const [nom,cfg] of casos){
  let w;try{w=app(cfg);}catch(e){console.log(nom.padEnd(40)+'  ERROR '+e.message);continue;}
  const g=mide(w);
  const tot=g.reduce((s,x)=>s+x.dur,0);
  const may=g.length?g.reduce((a,b)=>a.dur>b.dur?a:b):null;
  console.log(nom.padEnd(40)+String(g.length).padStart(8)+String((tot/5).toFixed(0)).padStart(9)+
    '   '+(may?D[may.d]+' '+ft(may.s)+'–'+ft(may.e)+' ('+may.dur+'min)':'—'));
}
process.exit(0);
