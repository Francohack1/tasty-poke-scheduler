// Reglas que la app NUNCA debe romper en silencio, y el chequeo de integridad
// del estado. Se usa desde los demás scripts de QA.
const D=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
function reglasRotas(w){
  const f=[];
  const opM=w.tm(w.gOP()),clM=w.tm(w.gCL()),rd=w.gRD();
  if(clM<=opM)return f;                       // horario de local inválido: caso aparte
  for(const s of Object.keys(w.genWeeks).map(Number)){
    w.weekOff=s;w._wdc=null;
    const fechas=w.getWD().map(d=>w.dStr(d));
    for(const e of w.emps){
      let dias=0,semH=0;
      for(let d=0;d<7;d++){
        const x=w.gS(e.id,d);
        if(!x||x.t!=='work')continue;
        dias++;const h=w.shH(x);semH+=h;
        const tope=w.topeDia(e);
        if(h>tope+0.15)f.push([e.name,'S'+s,D[d],'jornada '+h.toFixed(1)+'h > tope '+tope]);
        const campos=x.sh==='p'?[x.ms,x.me,x.as_,x.ae]:[x.s,x.e];
        for(const t of campos){
          if(!/^\d\d:\d\d$/.test(t)){f.push([e.name,'S'+s,D[d],'hora inválida "'+t+'"']);continue;}
          const m=w.tm(t);
          if(m<opM-0.1||m>clM+0.1)f.push([e.name,'S'+s,D[d],'fuera del horario del local '+t]);
          if(m%30!==0&&m!==opM&&m!==clM)f.push([e.name,'S'+s,D[d],'hora no redonda '+t]);
        }
        if(x.sh==='p'){
          if(w.tm(x.me)<=w.tm(x.ms)||w.tm(x.ae)<=w.tm(x.as_))f.push([e.name,'S'+s,D[d],'partido al revés']);
          if(w.tm(x.as_)-w.tm(x.me)<120)f.push([e.name,'S'+s,D[d],'pausa < 2h']);
        }else if(w.tm(x.e)<=w.tm(x.s))f.push([e.name,'S'+s,D[d],'turno al revés']);
        if(w.isOnBaja(e,fechas[d]))f.push([e.name,'S'+s,D[d],'trabaja estando de baja']);
        if(!w.enPlantilla(e,fechas[d]))f.push([e.name,'S'+s,D[d],'trabaja fuera de plantilla']);
        if(w.blockedAllDay(e,fechas[d]))f.push([e.name,'S'+s,D[d],'trabaja un día bloqueado']);
        if(d>0&&w.descansoEntre(w.gS(e.id,d-1),x)<12)f.push([e.name,'S'+s,D[d],'menos de 12h desde ayer']);
        const md=w.modoDia(e,d);
        if(md==='p'&&x.sh!=='p')f.push([e.name,'S'+s,D[d],'marcado P pero sale corrido']);
        if(md==='c'&&x.sh==='p')f.push([e.name,'S'+s,D[d],'marcado C pero sale partido']);
      }
      const deBaja=fechas.filter(q=>w.isOnBaja(e,q)).length;
      if(dias>0&&deBaja===0&&(7-dias)<rd)f.push([e.name,'S'+s,'','solo '+(7-dias)+' días libres']);
      const topeSem=e.h+(e.ot?e.mow:0);
      if(semH>topeSem+0.3)f.push([e.name,'S'+s,'',semH.toFixed(1)+'h > '+topeSem+'h (contrato+extras)']);
    }
    for(let d=0;d<7;d++)for(const g of w.getCovSegs(d))
      if(g.cnt>w.allowedAt(d,g.s))f.push(['—','S'+s,D[d],g.cnt+' a la vez, máx '+w.allowedAt(d,g.s)]);
  }
  return f;
}
// O se cumple, o la app lo dice en Alertas como error. Callárselo no vale.
function rotasEnSilencio(w){
  const f=reglasRotas(w),mudas=[];
  for(const v of f){
    const sem=parseInt(String(v[1]).replace('S',''),10);
    w.weekOff=sem;w._wdc=null;
    const graves=w.getIssues().filter(i=>i.l==='e').map(i=>i.t+' '+i.x).join(' | ');
    // Las reglas legales exigen aviso GRAVE. Que no se haya podido respetar lo
    // que pediste en la tabla es un aviso normal, pero tiene que estar.
    const esInstruccion=/marcado [PC]/.test(v[3]);
    const todos=w.getIssues().map(i=>i.t+' '+i.x).join(' | ');
    if(v[0]==='—'){
      // Exceso de gente a la vez: el aviso habla de "coinciden N personas"
      if(!/coinciden/.test(graves))mudas.push(v.join(' '));
    }else if((esInstruccion?todos:graves).indexOf(v[0])<0)mudas.push(v.join(' '));
  }
  return mudas;
}
function estadoSano(w){
  const p=[];
  if(!Array.isArray(w.emps))p.push('emps no es lista');
  const ids={};
  for(const e of w.emps){
    if(ids[e.id])p.push('id repetido '+e.id);ids[e.id]=1;
    if(!(e.h>0))p.push(e.name+': horas '+e.h);
    if(!(e.mhd>0))p.push(e.name+': máx diario '+e.mhd);
    if(!Array.isArray(e.ud))p.push(e.name+': ud no es lista');
    if(!Array.isArray(e.blocks))p.push(e.name+': blocks no es lista');
    if(typeof e.md!=='string'||e.md.length!==7||/[^apc]/.test(e.md))p.push(e.name+': md inválido "'+e.md+'"');
    if(typeof e.name!=='string'||!e.name)p.push('empleado sin nombre');
  }
  for(const k in w.sched){
    const v=w.sched[k];
    if(!v||typeof v!=='object')p.push('turno corrupto en '+k);
    else if(['work','off','vac','baja'].indexOf(v.t)<0)p.push('tipo raro "'+v.t+'" en '+k);
  }
  if(!Array.isArray(w.fests))p.push('fests no es lista');
  if(!w.peaks||!Array.isArray(w.peaks))p.push('peaks no es lista');
  return p;
}
module.exports={reglasRotas,rotasEnSilencio,estadoSano,D};
