const fs=require('fs');const {JSDOM,VirtualConsole}=require('jsdom');
const RAW=fs.readFileSync('index.html','utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
let bad=0;const ok=(c,m,x)=>{if(!c)bad++;console.log((c?'  ✅ ':'  ❌ ')+m+(x&&!c?'  → '+x:''));};
const P='<img src=x onerror="window.PWNED=1">';
console.log('\n═══ Inyección por cada campo de texto que escribes tú ═══');
const campos=[
 ['nombre de empleado',w=>w.emps[0].name=P],
 ['nombre de otro empleado',w=>w.emps[2].name=P],
 ['nombre de la franja de alta demanda',w=>w.peaks[0].name=P],
 ['nombre de un festivo',w=>{w.fests.push({date:w.dStr(w.getWD()[2]),name:P,type:'otro'});w.festOn[w.fkey(w.fests[w.fests.length-1])]=true;}],
 ['nombre del local',w=>{w.document.getElementById('cfg-name').value=P;}],
 ['todos a la vez',w=>{w.emps.forEach(e=>e.name=P);w.peaks.forEach(p=>p.name=P);}],
];
for(const [nom,inyecta] of campos){
  const w=new JSDOM(RAW,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/'}).window;
  w.cloudEnabled=false;w.confirm=()=>true;w.alert=()=>{};w.print=()=>{};
  inyecta(w);
  try{
    w.doSaveAndRegenerate();
    w.renderSched();w.renderAssess();w.renderEmps();w.renderAlerts();w.renderCosts();
    w.renderFests();w.renderPkCfg();w.renderWkDots();w.updPP();w.pintaNotaRef();
    w.openEmp(w.emps[0].id);w.closeM();
    w.openCell(w.emps[0].id,0);w.closeM();
    w.openHelp();w.closeM();
    w.goTab('alertas',{classList:{add(){},remove(){}}});
    w.goTab('costes',{classList:{add(){},remove(){}}});
  }catch(e){ok(false,nom,'excepción: '+e.message);continue;}
  const imgs=w.document.querySelectorAll('img[onerror]').length;
  const pwned=!!w.PWNED;
  ok(imgs===0&&!pwned,nom,(imgs?imgs+' etiquetas inyectadas':'')+(pwned?' · CÓDIGO EJECUTADO':''));
}
console.log('\n═══ Comillas y caracteres que rompen HTML ═══');
for(const veneno of ['a"b','a\'b','</td></tr><td>x','&amp;','<<<>>>','a`b','\\"><script>x</script>']){
  const w=new JSDOM(RAW,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/'}).window;
  w.cloudEnabled=false;w.confirm=()=>true;w.alert=()=>{};
  w.emps[0].name=veneno;
  try{w.doSaveAndRegenerate();w.renderSched();w.renderEmps();w.renderAlerts();w.openEmp(w.emps[0].id);}
  catch(e){ok(false,'nombre «'+veneno+'»','excepción: '+e.message);continue;}
  const filas=w.document.getElementById('sctbl').querySelectorAll('tr').length;
  const scripts=[...w.document.querySelectorAll('script')].filter(el=>el.textContent.length<200).length;
  // el nombre debe volver íntegro desde el campo de la ficha
  const campo=w.document.getElementById('en');
  ok(scripts===0&&filas>0&&campo&&campo.value===veneno,
     'nombre «'+veneno+'» se muestra y se recupera intacto',
     'scripts='+scripts+' filas='+filas+' valor='+(campo?JSON.stringify(campo.value):'—'));
}
console.log(bad?'\n❌ '+bad+' fallos\n':'\n✅ TODO OK\n');process.exit(bad?1:0);
