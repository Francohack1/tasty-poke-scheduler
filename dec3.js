const fs=require('fs'),path=require('path');const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
const w=new JSDOM(html,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/'}).window;
w.cloudEnabled=false;
let bad=0;
// combinaciones que dan divisiones feas: 20/3, 30/7, 40/6, 25/3, 15/7, 35/6…
const casos=[[20,3],[30,7],[40,6],[25,3],[15,7],[35,6],[10,3],[24,7],[32,6],[18,7]];
for(const [horas,dias] of casos){
  w.emps.forEach(e=>{e.h=horas;e.wd=dias;e.mhd=12;});
  w.doGenerateAll();
  w.renderEmps();w.renderSched();w.renderAlerts();w.renderCosts();w.renderFests();w.renderPkCfg();w.updPP();
  try{w.openShift(w.emps[0].id,0);}catch(e){}
  let txt='';
  w.document.querySelectorAll('div,span,td,th,b,label,button,option').forEach(el=>{
    if(!el.children.length)txt+=' '+(el.textContent||'');
  });
  const malos=[...new Set(txt.match(/\d+\.\d{2,}/g)||[])].filter(x=>!/^\d+\.\d\d$/.test(x)||false);
  const feos=[...new Set(txt.match(/\d+\.\d{3,}/g)||[])];
  console.log(('  '+horas+'h ÷ '+dias+' días = '+(horas/dias).toFixed(6)).padEnd(38)+
              (feos.length?'❌ '+feos.join(', '):'✅ bien'));
  if(feos.length)bad++;
}
console.log(bad?'\n❌ '+bad+' casos con decimales largos':'\n✅ Ningún número con más de 1 decimal en pantalla');
process.exit(bad?1:0);
