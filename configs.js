/* ═══════════════════════════════════════════════════════════════════════════
   PROBAR CONFIGURACIONES DE EQUIPO — Tasty Poke Scheduler
   ───────────────────────────────────────────────────────────────────────────
   Responde a "¿y si cambio la plantilla?" sin tocar la app de verdad.

   Requiere jsdom una sola vez:
       npm install jsdom xlsx-js-style

   Luego:
       node configs.js

   Prueba ~20 plantillas distintas con 3 horarios de local, genera 12 semanas
   con cada una y te dice:
       ✅ OK      el horario sale correcto
       ⚠️ HORAS   sale sin huecos pero sobran horas de contrato sin usar
       📉 NO DA   esa plantilla NO puede cubrir la tienda (falta personal)
       🐞 FALLO   había personal suficiente pero el programa no lo repartió bien

   Para probar TU caso: añade una línea a CONFIGS más abajo.
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const XLSX = require('xlsx-js-style');
const path = require('path');
const ARCHIVO = path.join(__dirname, 'TastyPoke_Scheduler.html');
const html = fs.readFileSync(ARCHIVO, 'utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/, '');

function nuevaApp() {
  const vc = new VirtualConsole(); const errs = [];
  vc.on('jsdomError', e => errs.push(e.message));
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc, url: 'https://local.test/' });
  const W = dom.window;
  W.XLSX = XLSX; XLSX.writeFile = () => {};
  W.fetch = async () => { throw new Error('sin red'); };
  W.confirm = () => true; W.alert = () => {}; W.print = () => {};
  return { W, dom, errs };
}
// Plantilla de persona con valores por defecto sensatos
let _id = 100;
function p(nombre, horas, opts) {
  opts = opts || {};
  return Object.assign({
    id: ++_id, name: nombre, role: opts.rol || 'camarero', h: horas,
    mhd: opts.mhd || 9, es: opts.es || '09:30', ap: opts.ap !== false,
    ch: opts.ch || 9, ot: !!opts.ot, mow: opts.ot ? (opts.mow || 4) : 0, or_: 11.25,
    ud: opts.ud || [], wd: opts.wd || (horas >= 40 ? 5 : horas >= 30 ? 4 : 3),
    canOpen: opts.abre !== false, canClose: opts.cierra !== false,
    clr: '#333', bg: '#ccc', baja: null,
    start: '', startTime: '', end: '', endTime: '', blocks: []
  });
}

// ── Configuraciones a probar ──────────────────────────────────────────────
const CONFIGS = [
  { n: 'Equipo actual (referencia)', e: () => null },   // usa el precargado
  { n: '5 personas: + una de 25h', e: W => W.emps.concat([p('Nueva', 25, { wd: 4 })]) },
  { n: '3 personas: baja una de 20h', e: W => W.emps.filter(x => x.name !== 'Cesar') },
  { n: '2 personas: 40h + 30h', e: () => [p('Jefa', 40, { rol: 'encargado', wd: 5 }), p('Ayte', 30, { wd: 4 })] },
  { n: 'Todos a tiempo parcial (5×20h)', e: () => [1,2,3,4,5].map(i => p('Parcial' + i, 20, { wd: 3 })) },
  { n: 'Una de 40h + tres de 15h', e: () => [p('Jefa', 40, { rol: 'encargado', wd: 5 }), p('A', 15, { wd: 2 }), p('B', 15, { wd: 2 }), p('C', 15, { wd: 2 })] },
  { n: 'Dos de 40h + dos de 20h', e: () => [p('J1', 40, { rol: 'encargado', wd: 5 }), p('J2', 40, { wd: 5 }), p('P1', 20, { wd: 3 }), p('P2', 20, { wd: 3 })] },
  { n: 'Solo la encargada puede ABRIR', e: W => W.emps.map((x, i) => Object.assign({}, x, { canOpen: i === 0, es: i === 0 ? '09:30' : '11:00' })) },
  { n: 'Solo la encargada puede CERRAR', e: W => W.emps.map((x, i) => Object.assign({}, x, { canClose: i === 0 })) },
  { n: 'Nadie acepta turno partido', e: W => W.emps.map(x => Object.assign({}, x, { ap: false })) },
  { n: 'Todos con horas extra (4h)', e: W => W.emps.map(x => Object.assign({}, x, { ot: true, mow: 4 })) },
  { n: 'Una libra findes (sáb+dom)', e: W => W.emps.map((x, i) => i === 1 ? Object.assign({}, x, { ud: [5, 6] }) : x) },
  { n: 'Dos libran el mismo día', e: W => W.emps.map((x, i) => (i === 1 || i === 2) ? Object.assign({}, x, { ud: [6] }) : x) },
  { n: 'Máx. 4h/día para las parciales', e: W => W.emps.map(x => x.h <= 20 ? Object.assign({}, x, { mhd: 4, wd: 5 }) : x) },
  { n: 'Turnos largos: máx. 10h/día', e: W => W.emps.map(x => Object.assign({}, x, { mhd: 10 })) },
  { n: 'Parciales a 4 días (turnos 5h)', e: W => W.emps.map(x => x.h <= 20 ? Object.assign({}, x, { wd: 4 }) : x) },
  { n: 'Parciales a 2 días (turnos 10h)', e: W => W.emps.map(x => x.h <= 20 ? Object.assign({}, x, { wd: 2, mhd: 10 }) : x) },
  { n: 'Plantilla holgada (6 personas)', e: W => W.emps.concat([p('Ex1', 25, { wd: 4 }), p('Ex2', 25, { wd: 4 })]) },
  { n: 'Equipo mínimo: 1 persona 40h', e: () => [p('Sola', 40, { rol: 'encargado', wd: 5 })] },
  { n: 'Sin encargada (todas camareras)', e: W => W.emps.map(x => Object.assign({}, x, { role: 'camarero' })) },
];
// Variantes de horario del local que también conviene probar
const HORARIOS = [
  { n: '09:30–23:30 (actual)', op: '09:30', cl: '23:30' },
  { n: '12:00–23:00 (solo comidas y cenas)', op: '12:00', cl: '23:00' },
  { n: '08:00–22:00 (desayunos)', op: '08:00', cl: '22:00' },
];

function medir(W, semanas) {
  semanas = semanas || 3;
  let huecos = 0, excesos = 0, mhdMal = 0, pausaMal = 0, descansoMal = 0, pasadas = 0;
  const cortas = {};
  let detalleHueco = null, detalleExceso = null;
  for (let v = 0; v < 4; v++) {
    W.sched = {}; W.genWeeks = {};
    for (let w = 0; w < semanas; w++) W.doGenerateWeek(W.weekOff + w, (v + w) % 4);
    for (let w = 0; w < semanas; w++) {
      const sv = W.weekOff; W.weekOff = sv + w; W._wdc = null;
      for (let d = 0; d < 7; d++) {
        for (const g of W.getCovSegs(d)) if (g.cnt === 0 && !g.inPause) {
          huecos++; if (!detalleHueco) detalleHueco = W.DIAS_NOMBRE[d] + ' ' + W.ft(g.s) + '-' + W.ft(g.e); break;
        }
        for (let m = W.tm(W.gOP()); m < W.tm(W.gCL()); m += 10) {
          const c = W.cntAt(d, m), l = W.allowedAt(d, m);
          if (c > l) { excesos++; if (!detalleExceso) detalleExceso = W.DIAS_NOMBRE[d] + ' ' + W.ft(m) + ': ' + c + 'p (máx ' + l + ')'; break; }
        }
      }
      for (const e of W.emps) {
        const t = W.empW(e).tot, techo = e.h + (e.ot ? e.mow : 0);
        if (t > techo + 0.26) pasadas++;
        if (t < e.h - 0.5 && !e.baja) cortas[e.name] = Math.max(cortas[e.name] || 0, e.h - t);
        let desc = 0;
        for (let d = 0; d < 7; d++) {
          const s = W.gS(e.id, d);
          if (!s || s.t !== 'work') { desc++; continue; }
          if (W.shH(s) > e.mhd + 0.1) mhdMal++;
          if (s.sh === 'p' && W.td(s.me, s.as_) < 2) pausaMal++;
        }
        if (desc < W.gRD()) descansoMal++;
      }
      W.weekOff = sv; W._wdc = null;
    }
  }
  return { huecos, excesos, mhdMal, pausaMal, descansoMal, pasadas, cortas, detalleHueco, detalleExceso };
}

// ¿Esta plantilla PUEDE cubrir la tienda? Además de sumar horas, hay que poder
// repartirlas: se simula día a día, cogiendo a quien más horas aporte, hasta
// llegar a las horas que abre el local. Si la simulación no llega, no da de sí.
function factible(W) {
  const opM = W.tm(W.gOP()), clM = W.tm(W.gCL());
  const horasLocal = (clM - opM) / 60;
  const razones = [];
  // ¿alguien puede entrar a la hora de apertura?
  if (!W.emps.some(e => W.tm(e.es || W.gOP()) <= opM))
    razones.push('nadie puede entrar a las ' + W.gOP() + ' (su "puede trabajar desde" es más tarde)');
  // horas totales
  const disponibles = W.emps.reduce((s, e) => s + e.h + (e.ot ? e.mow : 0), 0);
  if (disponibles < horasLocal * 7)
    razones.push('faltan horas: ' + disponibles + 'h de contrato para ' + (horasLocal * 7) + 'h de tienda');
  // permisos
  for (let d = 0; d < 7; d++) {
    const libres = W.emps.filter(e => e.ud.indexOf(d) < 0);
    if (!libres.some(e => e.canOpen)) razones.push('el ' + W.DIAS_NOMBRE[d] + ' nadie puede abrir');
    if (!libres.some(e => e.canClose)) razones.push('el ' + W.DIAS_NOMBRE[d] + ' nadie puede cerrar');
  }
  // reparto: ¿se pueden juntar cada día las horas necesarias sin partir a nadie?
  const jornadas = {}, porDia = {};
  W.emps.forEach(e => { jornadas[e.id] = W.workDays(e); porDia[e.id] = Math.min(e.mhd, W.dailyH(e)); });
  for (let d = 0; d < 7; d++) {
    const cand = W.emps.filter(e => e.ud.indexOf(d) < 0 && jornadas[e.id] > 0)
                       .sort((a, b) => porDia[b.id] - porDia[a.id]);
    let suma = 0;
    for (const e of cand) { if (suma >= horasLocal) break; suma += porDia[e.id]; jornadas[e.id]--; }
    if (suma < horasLocal - 0.01) {
      razones.push('el ' + W.DIAS_NOMBRE[d] + ' no se llegan a juntar las ' + horasLocal + 'h que abre (máximo ' + suma.toFixed(1) + 'h)');
      break;
    }
  }
  return { ok: razones.length === 0, razones: razones };
}

console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
console.log('║  BARRIDO DE CONFIGURACIONES DE EQUIPO                                ║');
console.log('║  12 semanas generadas con cada una (4 variantes × 3 semanas)         ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝');

const fallosApp = [], limitaciones = [], erroresJS = [];

for (const horario of HORARIOS) {
  console.log('\n\n━━━ HORARIO DEL LOCAL: ' + horario.n + ' ━━━');
  const horasLocal = ((parseInt(horario.cl) * 60 + parseInt(horario.cl.slice(3))) - (parseInt(horario.op) * 60 + parseInt(horario.op.slice(3)))) / 60;
  console.log('    (' + (horasLocal * 7) + 'h de tienda a la semana)\n');
  for (const cfg of CONFIGS) {
    // en horarios alternativos probamos solo un subconjunto representativo
    if (horario.op !== '09:30' && ['Equipo actual (referencia)', '5 personas: + una de 25h', 'Todos a tiempo parcial (5×20h)',
      'Solo la encargada puede ABRIR', 'Nadie acepta turno partido', 'Equipo mínimo: 1 persona 40h'].indexOf(cfg.n) < 0) continue;
    const { W, dom, errs } = nuevaApp();
    W.valoresOriginales = null;
    const opEl = W.document.getElementById('cfg-op'), clEl = W.document.getElementById('cfg-cl');
    opEl.value = horario.op; clEl.value = horario.cl;
    const nuevos = cfg.e(W);
    if (nuevos) { W.emps = nuevos; W.normalizeEmps(); }
    let r = null, err = null;
    try { r = medir(W); } catch (e) { err = e.message; }
    const fact = factible(W);
    const equipo = W.emps.length + 'p/' + W.emps.reduce((s, e) => s + e.h, 0) + 'h';
    let veredicto, nota = '';
    if (err) { veredicto = '💥 ERROR'; nota = err; erroresJS.push(cfg.n + ' @' + horario.n + ': ' + err); }
    else if (r.excesos || r.mhdMal || r.pausaMal || r.pasadas) {
      veredicto = '🐞 FALLO';
      const p2 = [];
      if (r.excesos) p2.push(r.excesos + ' excesos de aforo (' + r.detalleExceso + ')');
      if (r.mhdMal) p2.push(r.mhdMal + ' turnos pasan del máx. diario');
      if (r.pausaMal) p2.push(r.pausaMal + ' pausas de partido ilegales');
      if (r.pasadas) p2.push(r.pasadas + ' veces alguien pasa de su contrato');
      nota = p2.join(' · ');
      fallosApp.push(cfg.n + ' @' + horario.n + ': ' + nota);
    }
    else if (r.huecos) {
      if (fact.ok) { veredicto = '🐞 FALLO'; nota = r.huecos + ' huecos (' + r.detalleHueco + ') pese a que la plantilla da de sí';
        fallosApp.push(cfg.n + ' @' + horario.n + ': ' + nota); }
      else { veredicto = '📉 NO DA'; nota = r.huecos + ' huecos · ' + fact.razones[0];
        limitaciones.push(cfg.n + ' @' + horario.n + ': ' + fact.razones[0]); }
    }
    else if (Object.keys(r.cortas).length) {
      veredicto = '⚠️ HORAS';
      nota = 'sin huecos, pero sobran horas de contrato: ' + Object.keys(r.cortas).map(k => k + ' −' + r.cortas[k].toFixed(1) + 'h').join(', ');
    }
    else veredicto = '✅ OK';
    console.log('  ' + veredicto + '  ' + cfg.n.padEnd(34) + equipo.padEnd(10) + nota);
    dom.window.close();
    if (errs.length) erroresJS.push(cfg.n + ': ' + errs[0]);
  }
}

console.log('\n\n╔══════════════════════════════════════════════════════════════════════╗');
console.log('║  RESUMEN                                                             ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝\n');
if (erroresJS.length) { console.log('  💥 ERRORES DE LA APP (' + erroresJS.length + '):'); erroresJS.forEach(x => console.log('     · ' + x)); console.log(''); }
if (fallosApp.length) { console.log('  🐞 FALLOS A CORREGIR (' + fallosApp.length + '):'); fallosApp.forEach(x => console.log('     · ' + x)); console.log(''); }
else console.log('  ✅ Ningún fallo del programa: siempre que la plantilla daba de sí, el horario salió correcto.\n');
if (limitaciones.length) {
  console.log('  📉 PLANTILLAS QUE NO DAN DE SÍ (' + limitaciones.length + ') — no es un fallo, es falta de personal:');
  limitaciones.forEach(x => console.log('     · ' + x));
  console.log('');
}
process.exit(fallosApp.length + erroresJS.length > 0 ? 1 : 0);
