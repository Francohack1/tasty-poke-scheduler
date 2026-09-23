const fs=require('fs');const {JSDOM,VirtualConsole}=require('jsdom');
const RAW=fs.readFileSync('index.html','utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
let bad=0;const ok=(c,m)=>{console.log((c?'  ✅ ':'  ❌ ')+m);if(!c)bad++;};
console.log('\n═══ Cierre a medianoche o más tarde ═══');
for(const cl of ['00:00','00:30','09:30']){
  const w=new JSDOM(RAW,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/'}).window;
  w.cloudEnabled=false;let dicho='';w.alert=t=>{dicho=t;};
  w.doGenerateAll();
  const antes=Object.keys(w.sched).length;
  w.document.getElementById('cfg-cl').value=cl;
  w.cambioConfig('cierre');
  ok(dicho.includes('no puede ser anterior'),'cierre '+cl+': avisa en vez de quedarse mudo');
  ok(Object.keys(w.sched).length===antes,'   y NO borra el horario que tenías ('+Object.keys(w.sched).length+' entradas)');
  const a=w.getIssues();
  ok(a.length===1&&/mal puesto/.test(a[0].t),'   Alertas lo explica: "'+(a[0]?a[0].t:'—')+'"');
}
console.log('\n═══ Y con un horario normal todo sigue igual ═══');
const w2=new JSDOM(RAW,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/'}).window;
w2.cloudEnabled=false;w2.alert=()=>{throw new Error('no debería avisar');};
w2.doGenerateAll();
ok(Object.keys(w2.genWeeks).length===5,'genera las 5 semanas');
ok(w2.getIssues().filter(i=>/mal puesto/.test(i.t)).length===0,'sin aviso de horario mal puesto');
console.log(bad?'\n❌ '+bad+' fallos\n':'\n✅ TODO OK\n');process.exit(bad?1:0);
