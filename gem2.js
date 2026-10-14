const fs=require('fs');const {JSDOM,VirtualConsole}=require('jsdom');
const RAW=fs.readFileSync('index.html','utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
let bad=0;const ok=(c,m,x)=>{if(!c)bad++;console.log((c?'  ✅ ':'  ❌ ')+m+(x&&!c?'  → '+x:''));};
function app(){const w=new JSDOM(RAW,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/'}).window;
  w.cloudEnabled=false;w.limitePreguntar=false;w.confirm=()=>true;w.alert=()=>{};return w;}
(async()=>{
console.log('\n═══ Un modelo que da 404 se descarta y prueba el siguiente ═══');
{
  const w=app(); w.geminiKey='K';
  const pedidos=[];
  w.fetch=async(url,opt)=>{
    if(/\/models\?/.test(url))return{ok:true,json:async()=>({models:[{name:'models/malo-404',supportedGenerationMethods:['generateContent']}]})};
    const m=String(url).match(/models\/([^:]+):/)[1]; pedidos.push(m);
    if(m!=='gemini-flash-lite-latest')return{ok:false,status:404,text:async()=>'no longer available'};
    return{ok:true,json:async()=>({candidates:[{content:{parts:[{text:'Cuadra. Todo correcto.'}]}}]})};
  };
  await w.revisarConGemini(false);
  ok(pedidos.length>1,'prueba varios modelos: '+pedidos.join(' → '));
  const p=w.document.getElementById('gemini-panel');
  ok(/Cuadra/.test(p.textContent),'y acaba consiguiendo respuesta');
  ok(w.geminiModelo==='gemini-flash-lite-latest','recuerda el que funcionó: '+w.geminiModelo);
}
console.log('\n═══ Un 503 NO cambia de modelo: reintenta ═══');
{
  const w=app(); w.geminiKey='K'; w.geminiModelo='gemini-flash-latest';
  let n=0; const pedidos=[];
  w.fetch=async(url)=>{
    if(/\/models\?/.test(url))return{ok:true,json:async()=>({models:[]})};
    const m=String(url).match(/models\/([^:]+):/)[1]; pedidos.push(m); n++;
    if(n===1)return{ok:false,status:503,text:async()=>'high demand'};
    return{ok:true,json:async()=>({candidates:[{content:{parts:[{text:'Cuadra.'}]}}]})};
  };
  await w.revisarConGemini(false);
  ok(pedidos[0]===pedidos[1],'reintenta el MISMO modelo: '+pedidos.slice(0,2).join(' → '));
  ok(/Cuadra/.test(w.document.getElementById('gemini-panel').textContent),'y lo consigue al segundo intento');
}
console.log('\n═══ Saturado de verdad: lo dice claro y no rompe nada ═══');
{
  const w=app(); w.geminiKey='K';
  const antes=JSON.stringify(w.sched);
  w.fetch=async(url)=>{
    if(/\/models\?/.test(url))return{ok:true,json:async()=>({models:[]})};
    return{ok:false,status:503,text:async()=>'high demand'};
  };
  await w.revisarConGemini(false);
  const est=w.document.getElementById('gemini-estado').textContent;
  ok(/saturado/.test(est),'avisa de la saturación: "'+est+'"');
  ok(JSON.stringify(w.sched)===antes,'el horario sigue intacto');
}
console.log('\n═══ Clave inválida ═══');
{
  const w=app(); w.geminiKey='mala';
  w.fetch=async(url)=>{
    if(/\/models\?/.test(url))return{ok:false,status:400,text:async()=>'API key not valid'};
    return{ok:false,status:400,text:async()=>'{"error":{"message":"API key not valid"}}'};
  };
  await w.revisarConGemini(false);
  ok(/clave no es válida/.test(w.document.getElementById('gemini-estado').textContent),'lo dice en cristiano');
}
console.log(bad?'\n❌ '+bad+' fallos\n':'\n✅ TODO OK\n');process.exit(bad?1:0);
})();
