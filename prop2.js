const fs=require('fs'),path=require('path');const {JSDOM,VirtualConsole}=require('jsdom');
function app(cfg){
  const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
  const w=new JSDOM(html,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/'}).window;
  w.cloudEnabled=false;cfg(w);w.doGenerateAll();return w;
}
let bad=0;const ok=(c,m)=>{console.log((c?'  ✅ ':'  ❌ ')+m);if(!c)bad++;};
const rank={partido:0,reparto:1,repartir:2,extra:3};

const escenarios=[
 ['12:00–23:00 sin partidos',w=>{w.document.getElementById('cfg-op').value='12:00';w.document.getElementById('cfg-cl').value='23:00';w.emps.forEach(e=>{e.ap=false;e.ot=false;});}],
 ['12:00–23:30 con 5 personas',w=>{w.document.getElementById('cfg-op').value='12:00';w.document.getElementById('cfg-cl').value='23:30';w.emps.forEach(e=>{e.ap=false;e.ot=false;});w.emps.push(Object.assign({},w.emps[1],{id:99,name:'Nuria',h:25,wd:4,ap:false,ot:false}));}],
 ['09:00–23:30 muy justo',w=>{w.document.getElementById('cfg-op').value='09:00';w.document.getElementById('cfg-cl').value='23:30';w.emps.forEach(e=>{e.ap=false;e.ot=false;});}],
 ['Equipo grande (7 personas)',w=>{w.document.getElementById('cfg-cl').value='23:30';w.emps.forEach(e=>{e.ap=false;e.ot=false;});[5,6,7].forEach(n=>w.emps.push(Object.assign({},w.emps[1],{id:100+n,name:'P'+n,h:15+n*3,wd:3,ap:false,ot:false})));}],
];
for(const [nom,cfg] of escenarios){
  const t0=Date.now();const w=app(cfg);const ms=Date.now()-t0;const s=w._sugerencias;
  console.log('\n── '+nom+'  ('+s.length+' propuestas, '+ms+'ms) ──');
  s.forEach((x,i)=>{const e=w.eById(x.id);
    console.log('   '+(i+1)+'. '+x.tipo.padEnd(9)+(e?(e.role==='encargado'?'👑':'  ')+' '+e.name.padEnd(9)+String(e.h).padStart(2)+'h':'👥 varios     '));});
  ok(s.every((x,i)=>i===0||rank[s[i-1].tipo]<=rank[x.tipo]),'orden por tipo: partido → reparto → repartir → extra');
  ['partido','repartir','extra'].forEach(t=>{
    const g=s.filter(x=>x.tipo===t&&x.id!=null).map(x=>w.eById(x.id));
    if(g.length<2)return;
    const roles=g.map(e=>e.role==='encargado'?1:0);
    ok(roles.every((v,i)=>i===0||roles[i-1]<=v),'  '+t+': camareros antes que la encargada');
    const hs=g.filter(e=>e.role!=='encargado').map(e=>e.h);
    ok(hs.every((v,i)=>i===0||hs[i-1]<=v),'  '+t+': menos horas primero ('+hs.join('→')+')');
  });
  ok(ms<20000,'rápido ('+ms+'ms)');
  // el texto no muestra numeros negativos
  const txt=w.document.getElementById('sugerencias').textContent;
  ok(!/resuelve -/.test(txt),'sin "resuelve -N" en pantalla');
  if(s.some(x=>x.mejora<0))ok(/hueco.* de cobertura peor/.test(txt),'avisa del coste en cobertura cuando lo hay');
}
console.log(bad?'\n❌ '+bad+' fallos\n':'\n✅ TODO OK\n');process.exit(bad?1:0);
