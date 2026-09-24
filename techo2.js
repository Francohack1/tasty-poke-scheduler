const fs=require('fs');const {JSDOM,VirtualConsole}=require('jsdom');
const RAW=fs.readFileSync('index.html','utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
const D=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
function prueba(dias, etiqueta){
  const w=new JSDOM(RAW,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/'}).window;
  w.cloudEnabled=false;
  if(dias){ w.peaks=[{id:1,name:'Mediodía',days:dias,start:'13:30',end:'15:30',min:2},
                     {id:2,name:'Cenas',days:dias,start:'20:00',end:'23:00',min:2}];
            w.doGenerateAll(); }
  let cub=0,tot=0,hue=0,ext=0;
  for(const s of Object.keys(w.genWeeks).map(Number)){
    w.weekOff=s;w._wdc=null;
    for(const e of w.emps)ext+=w.empW(e).ext;
    for(let d=0;d<7;d++){
      for(const g of w.getCovSegs(d)) if(g.cnt===0&&!g.inPause)hue+=g.e-g.s;
      for(const p of w.peaks){ if(p.days.indexOf(d)<0)continue; tot++;
        let c=0;for(const e of w.emps)if(w.overlaps(w.gS(e.id,d),p.start,p.end))c++;
        if(c>=p.min)cub++; }}}
  const pct=tot?(cub*100/tot).toFixed(0):'—';
  console.log('  '+etiqueta.padEnd(42)+(cub+'/'+tot).padStart(8)+(pct+'%').padStart(6)+
    ('  '+hue+'min sin cubrir').padStart(18)+('  '+(ext/5).toFixed(1)+'h extra/sem').padStart(18));
  return{cub,tot};
}
console.log('\nLA CUENTA:');
console.log('  110h de contrato + 12h de extras autorizadas = 122h a la semana');
console.log('  98h solo para tener a UNA persona de 09:30 a 23:30 los 7 días');
console.log('  quedan 24h de margen · cada día pide 5h más para doblar mediodía y cenas');
console.log('  24 ÷ 5 = ~5 días se pueden cubrir del todo\n');
console.log('SI LE DICES A LA APP QUÉ DÍAS IMPORTAN:');
console.log('  '+'configuración'.padEnd(42)+'cubierto'.padStart(8)+'  %'.padStart(4)+'          huecos        extras');
console.log('  '+'─'.repeat(92));
prueba(null,'los 7 días (como lo tienes ahora)');
prueba([2,3,4,5,6],'5 días: miércoles a domingo');
prueba([3,4,5,6],'4 días: jueves a domingo');
prueba([4,5,6],'3 días: viernes, sábado y domingo');
prueba([5,6],'2 días: sábado y domingo');
process.exit(0);
