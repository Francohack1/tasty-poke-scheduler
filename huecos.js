const fs=require('fs'),path=require('path');const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
const w=new JSDOM(html,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/'}).window;
w.cloudEnabled=false;w.doGenerateAll();
const D=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const ft=m=>('0'+Math.floor(m/60)).slice(-2)+':'+('0'+(m%60)).slice(-2);
const op=w.tm(w.gOP()),cl=w.tm(w.gCL());
console.log('Tienda '+w.gOP()+'–'+w.gCL()+'  ('+((cl-op)/60).toFixed(1)+'h/día · '+((cl-op)*7/60).toFixed(0)+'h/semana solo para tener a UNA persona)');
console.log('Equipo: '+w.emps.reduce((s,e)=>s+e.h,0)+'h de contrato\n');
let totalMin=0,porDia={},lista=[];
for(const s of Object.keys(w.genWeeks).map(Number).sort((a,b)=>a-b)){
  w.weekOff=s;w._wdc=null;
  for(let d=0;d<7;d++){
    const segs=w.getCovSegs(d);
    for(const g of segs){
      if(g.cnt!==0||g.inPause)continue;
      const dur=g.e-g.s;totalMin+=dur;
      porDia[d]=(porDia[d]||0)+dur;
      lista.push({sem:s,d,s:g.s,e:g.e,dur});
    }
  }
}
console.log('TOTAL sin cubrir en las 5 semanas: '+totalMin+' min  ('+(totalMin/60).toFixed(1)+'h)');
console.log('Media por semana: '+(totalMin/5).toFixed(0)+' min\n');
console.log('Por día de la semana (suma de las 5 semanas):');
for(let d=0;d<7;d++)console.log('   '+D[d]+': '+(porDia[d]||0)+' min');
console.log('\nLos huecos, uno a uno (primeras 2 semanas):');
const sems=[...new Set(lista.map(x=>x.sem))].slice(0,2);
lista.filter(x=>sems.includes(x.sem)).forEach(x=>
  console.log('   S'+w.weekNumOf(x.sem).n+' '+D[x.d]+'  '+ft(x.s)+'–'+ft(x.e)+'   ('+x.dur+' min)'));
console.log('\nClasificación:');
const cortos=lista.filter(x=>x.dur<=30).length, largos=lista.filter(x=>x.dur>30).length;
console.log('   huecos de ≤30 min (pinta de redondeo): '+cortos+'  → '+lista.filter(x=>x.dur<=30).reduce((s,x)=>s+x.dur,0)+' min');
console.log('   huecos de >30 min (falta de horas):    '+largos+'  → '+lista.filter(x=>x.dur>30).reduce((s,x)=>s+x.dur,0)+' min');
process.exit(0);
