const fs=require('fs');const {JSDOM,VirtualConsole}=require('jsdom');
const RAW=fs.readFileSync('index.html','utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
const w=new JSDOM(RAW,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/'}).window;
w.cloudEnabled=false;w.doGenerateAll();
const D=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
console.log('Tienda '+w.gOP()+'–'+w.gCL()+'   ·   máximo a la vez: '+w.gMAX()+' (en punta '+w.gMAXPK()+')\n');
for(const s of Object.keys(w.genWeeks).map(Number).sort((a,b)=>a-b)){
  w.weekOff=s;w._wdc=null;
  console.log('── S'+w.weekNumOf(s).n+' ──');
  for(const e of w.emps){
    const t=w.empW(e);const dias=[];let peor=0;
    for(let d=0;d<7;d++){const x=w.gS(e.id,d);
      if(x&&x.t==='work'){const h=w.shH(x);peor=Math.max(peor,h);dias.push(D[d]+' '+h.toFixed(1)+'h');}}
    console.log('   '+e.name.padEnd(10)+t.tot.toFixed(1)+'h de '+e.h+'h'+
      (Math.abs(t.tot-e.h)>0.05?'  ⚠ '+(t.tot-e.h>0?'+':'')+(t.tot-e.h).toFixed(1):'  ✓')+
      '   máx día '+peor.toFixed(1)+'h'+(peor>8.001?'  ⚠ >8h':'')+'   libra '+(7-dias.length));
  }
}
process.exit(0);
