const fs=require('fs');const {JSDOM,VirtualConsole}=require('jsdom');
const RAW=fs.readFileSync('index.html','utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
const D=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
function app(cfg){const w=new JSDOM(RAW,{runScripts:'dangerously',virtualConsole:new VirtualConsole(),url:'https://x.test/'}).window;
  w.cloudEnabled=false;cfg&&cfg(w);w.doGenerateAll();return w;}
function viola(w){const out=[];
  for(const s of Object.keys(w.genWeeks).map(Number)){w.weekOff=s;w._wdc=null;
    for(const e of w.emps)for(let d=0;d<6;d++){
      const a=w.gS(e.id,d),b=w.gS(e.id,d+1);
      if(!a||a.t!=='work'||!b||b.t!=='work')continue;
      const fin=a.sh==='p'?w.tm(a.ae):w.tm(a.e),ini=b.sh==='p'?w.tm(b.ms):w.tm(b.s);
      const r=(1440-fin+ini)/60;
      if(r<12)out.push({sem:s,n:e.name,d,r,fin:w.ft(fin),ini:w.ft(ini)});}}
  return out;}
console.log('Equipo real, 5 semanas:');
const w=app();const v=viola(w);
console.log('  incumplimientos de las 12 h entre jornadas: '+v.length);
v.slice(0,8).forEach(x=>console.log('     S'+w.weekNumOf(x.sem).n+'  '+x.n.padEnd(10)+D[x.d]+' cierra '+x.fin+' → '+D[x.d+1]+' entra '+x.ini+'   solo '+x.r.toFixed(1)+'h'));
console.log('\nOtras configuraciones:');
for(const [nom,cfg] of [
  ['tienda 12:00–23:00',x=>{x.document.getElementById('cfg-op').value='12:00';x.document.getElementById('cfg-cl').value='23:00';}],
  ['6 personas',x=>{[5,6].forEach(n=>x.emps.push(Object.assign({},x.emps[1],{id:100+n,name:'P'+n,h:20,mhd:8})));}],
  ['nadie parte turno',x=>{x.emps.forEach(e=>e.ap=false);}],
]){const q=app(cfg);console.log('  '+nom.padEnd(22)+viola(q).length+' incumplimientos');}
process.exit(0);
