/* ═══════════════════════════════════════════════════════════════════════════
   PRUEBAS AUTOMÁTICAS — Tasty Poke Scheduler
   ───────────────────────────────────────────────────────────────────────────
   Cómo usarlo:  abre una terminal en esta carpeta y ejecuta:

       node pruebas.js

   Lee TastyPoke_Scheduler.html, extrae su código y lo somete a ~120 pruebas.
   Si sale "TODO CORRECTO" puedes publicar el cambio con tranquilidad.
   Si algo falla, te dice exactamente qué regla se ha roto.

   Ejecútalo SIEMPRE después de tocar la app.
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path');
const ARCHIVO = path.join(__dirname, 'TastyPoke_Scheduler.html');

// ── 1. Extraer el JavaScript de la app ────────────────────────────────────
let html;
try { html = fs.readFileSync(ARCHIVO, 'utf8'); }
catch (e) { console.error('✗ No encuentro ' + ARCHIVO); process.exit(1); }
const ini = html.lastIndexOf('<script>');
const fin = html.indexOf('</script>', ini);
if (ini < 0 || fin < 0) { console.error('✗ El archivo parece incompleto: no encuentro el bloque <script>.'); process.exit(1); }
const codigo = html.slice(ini + 8, fin);

// ── 2. Simular el navegador (DOM mínimo) ──────────────────────────────────
const valores = {
  'cfg-op': '09:30', 'cfg-cl': '23:30', 'cfg-td': '13:30', 'cfg-ps': '15:30',
  'cfg-pe': '17:30', 'cfg-rd': '2', 'cfg-cov': '2', 'cfg-maxsim': '2',
  'cfg-maxsimpk': '3', 'cfg-name': 'Tasty Poke Mataró'
};
const cache = {};
function elem(id) {
  return cache[id] || (cache[id] = {
    id, checked: false, style: {}, innerHTML: '', textContent: '', dataset: {},
    get value() { return valores[id] !== undefined ? valores[id] : ''; },
    set value(v) { valores[id] = v; },
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener() {}
  });
}
const almacen = {};
const entorno = {
  document: {
    getElementById: elem,
    querySelectorAll: () => ({ forEach() {}, length: 0 }),
    addEventListener() {}, visibilityState: 'hidden'
  },
  window: { addEventListener() {}, print() {} },
  localStorage: {
    getItem: k => (almacen[k] !== undefined ? almacen[k] : null),
    setItem: (k, v) => { almacen[k] = String(v); },
    removeItem: k => { delete almacen[k]; }
  },
  fetch: async () => { throw new Error('sin red (esperado en pruebas)'); },
  alert() {}, confirm: () => true,
  XLSX: {
    utils: {
      book_new: () => ({ SheetNames: [], Sheets: {} }),
      aoa_to_sheet: a => ({ _aoa: a }),
      book_append_sheet(wb, ws, n) { wb.SheetNames.push(n); wb.Sheets[n] = ws; },
      encode_cell: c => 'R' + c.r + 'C' + c.c
    },
    writeFile(wb, fn) { entorno._excel = { wb, fn }; }
  },
  setTimeout: () => 0, setInterval: () => 0, console
};
const vm = require('vm');
const ctx = vm.createContext(entorno);
try { vm.runInContext(codigo, ctx); }
catch (e) { console.error('✗ El código de la app no se puede ejecutar:\n  ' + e.message); process.exit(1); }
const A = entorno; // atajo: A.doGenerateAll(), A.emps, ...

// ── 3. Motor de pruebas ───────────────────────────────────────────────────
let ok = 0; const fallos = [];
function comprobar(cond, desc, detalle) {
  if (cond) ok++;
  else fallos.push(desc + (detalle ? ' → ' + detalle : ''));
}
function titulo(t) { process.stdout.write('\n  ' + t + '\n'); }

const PLANTILLA = JSON.parse(JSON.stringify(A.emps));
function restaurar() {
  A.emps = JSON.parse(JSON.stringify(PLANTILLA));
  A.sched = {}; A.genWeeks = {};
  Object.assign(valores, {
    'cfg-op': '09:30', 'cfg-cl': '23:30', 'cfg-td': '13:30', 'cfg-ps': '15:30',
    'cfg-pe': '17:30', 'cfg-rd': '2', 'cfg-cov': '2', 'cfg-maxsim': '2', 'cfg-maxsimpk': '3'
  });
}

// Revisa una semana ya generada y devuelve la lista de reglas rotas
function revisarSemana(etiqueta) {
  const malas = [];
  const opM = A.tm(A.gOP()), clM = A.tm(A.gCL());
  for (let di = 0; di < 7; di++) {
    // Límite de personas simultáneas (ampliado dentro de alta demanda)
    for (let m = opM; m < clM; m += 10) {
      const c = A.cntAt(di, m), lim = A.allowedAt(di, m);
      if (c > lim) { malas.push(etiqueta + ' ' + A.DAYS[di] + ' ' + A.ft(m) + ': ' + c + ' personas (máx ' + lim + ')'); break; }
    }
    // Huecos de cobertura fuera de la pausa
    const tramos = A.getCovSegs(di);
    for (const t of tramos)
      if (t.cnt === 0 && !t.inPause) { malas.push(etiqueta + ' ' + A.DAYS[di] + ': sin nadie ' + A.ft(t.s) + '–' + A.ft(t.e)); break; }
    // Apertura y cierre cubiertos por alguien autorizado
    let abre = false, cierra = false;
    for (const e of A.emps) {
      const s = A.gS(e.id, di);
      if (!s || s.t !== 'work') continue;
      const ini = s.sh === 'p' ? A.tm(s.ms) : A.tm(s.s);
      const fin = s.sh === 'p' ? A.tm(s.ae) : A.tm(s.e);
      if (ini <= opM && e.canOpen) abre = true;
      if (fin >= clM && e.canClose !== false) cierra = true;
    }
    if (!abre) malas.push(etiqueta + ' ' + A.DAYS[di] + ': nadie autorizado abre');
    if (!cierra) malas.push(etiqueta + ' ' + A.DAYS[di] + ': nadie autorizado cierra');
  }
  // Reglas por empleado
  for (const e of A.emps) {
    const w = A.empW(e);
    const techo = e.h + (e.ot ? e.mow : 0) + 0.26;
    if (w.tot > techo) malas.push(etiqueta + ' ' + e.name + ': ' + w.tot.toFixed(1) + 'h supera su tope (' + techo.toFixed(1) + 'h)');
    let descansos = 0;
    for (let di = 0; di < 7; di++) {
      const s = A.gS(e.id, di);
      if (!s || s.t !== 'work') { descansos++; continue; }
      if (A.shH(s) > e.mhd + 0.1) malas.push(etiqueta + ' ' + e.name + ' ' + A.DAYS[di] + ': ' + A.shH(s).toFixed(1) + 'h > máx ' + e.mhd + 'h/día');
      if (s.sh === 'p' && A.td(s.me, s.as_) < 2) malas.push(etiqueta + ' ' + e.name + ' ' + A.DAYS[di] + ': pausa de partido < 2h');
      if (e.ud.indexOf(di) >= 0) malas.push(etiqueta + ' ' + e.name + ': trabaja en ' + A.DAYS[di] + ', su día no disponible');
      if (A.isOnBaja(e, A.dStr(A.getWD()[di]))) malas.push(etiqueta + ' ' + e.name + ': trabaja estando de baja');
    }
    if (!e.baja && descansos < A.gRD()) malas.push(etiqueta + ' ' + e.name + ': solo ' + descansos + ' días de descanso');
  }
  return malas;
}

console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log('║   PRUEBAS — Tasty Poke Scheduler                         ║');
console.log('╚══════════════════════════════════════════════════════════╝');

// ── Utilidades de tiempo ──────────────────────────────────────────────────
titulo('Utilidades de tiempo y reparto de horas');
comprobar(A.tm('09:30') === 570, 'tm convierte hora a minutos');
comprobar(A.ft(570) === '09:30', 'ft convierte minutos a hora');
comprobar(A.ft(1440) === '00:00', 'ft da la vuelta a medianoche');
comprobar(A.td('09:30', '17:30') === 8, 'td calcula duración');
comprobar(A.td('17:30', '09:30') === 0, 'td nunca devuelve negativo');
comprobar(A.addH('09:30', 8) === '17:30', 'addH suma horas');
comprobar(A.isoWk(new Date(2026, 0, 1)) === 1, 'isoWk acierta la semana 1');
comprobar(A.workDays({ h: 20, mhd: 6, wd: 3 }) === 4, 'workDays amplía días si no caben las horas');
comprobar(Math.abs(A.dailyH({ h: 40, mhd: 9, wd: 5 }) - 8) < 0.01, 'dailyH reparte 40h en 5 días');
comprobar(A.workDays({ h: 10, mhd: 8, wd: 0 }) >= 1, 'workDays aguanta wd = 0');

// ── Construcción de turnos ────────────────────────────────────────────────
titulo('Construcción de turnos');
restaurar();
const e40 = A.emps[0];
const ap = A.mkAp(e40, null);
comprobar(ap.s === '09:30', 'la apertura empieza al abrir el local');
comprobar(A.mkNo(e40).e === '23:30', 'el turno de noche acaba al cerrar');
const mid = A.emps.find(x => !x.canOpen && x.ap && x.h >= 30);
if (mid) {
  const pa = A.mkMidPa(mid);
  comprobar(pa && pa.sh === 'p', 'se construye el turno partido');
  comprobar(pa && A.td(pa.me, pa.as_) >= 2, 'el partido respeta la pausa mínima de 2h');
  comprobar(pa && A.shH(pa) <= mid.mhd + 0.05, 'el partido no supera el máximo diario');
}
comprobar(A.mkCont(e40, '15:00', '14:00') === null, 'un turno con salida anterior a la entrada se rechaza');
comprobar(A.mkFlexPa(e40, '11:00', '14:00', '15:00', '18:00') === null, 'un partido con pausa de 1h se rechaza');
if (mid) {
  // si las cenas empiezan demasiado pronto, el partido dejaría una pausa ilegal: hay que rechazarlo
  const guardadas = JSON.parse(JSON.stringify(A.peaks));
  A.peaks[1].start = '17:30'; A.peaks[1].end = '19:30';
  const imposible = A.mkMidPa(mid);
  comprobar(imposible === null || A.td(imposible.me, imposible.as_) >= 2,
    'si la pausa saldría menor de 2h, el partido se rechaza en vez de generarse ilegal');
  A.peaks = guardadas;
}

// ── Generación: las reglas de oro ─────────────────────────────────────────
titulo('Generación — 4 variantes × 5 semanas con la plantilla real');
restaurar();
let rotas = [];
for (let v = 0; v < 4; v++) {
  A.sched = {}; A.genWeeks = {};
  for (let w = 0; w < 5; w++) A.doGenerateWeek(A.weekOff + w, (v + w) % 4);
  for (let w = 0; w < 5; w++) {
    const guardado = A.weekOff;
    A.weekOff = guardado + w; A._wdc = null;
    rotas = rotas.concat(revisarSemana('V' + A.VNAMES[v] + '/sem' + w));
    A.weekOff = guardado; A._wdc = null;
  }
}
comprobar(rotas.length === 0, 'se cumplen todas las reglas en las 20 semanas', rotas.slice(0, 3).join(' | '));
restaurar(); A.doGenerateAll();
comprobar(A.emps.every(e => e.baja || A.empW(e).tot >= e.h - 0.5), 'todos completan sus horas de contrato',
  A.emps.filter(e => !e.baja && A.empW(e).tot < e.h - 0.5).map(e => e.name + ' ' + A.empW(e).tot.toFixed(1) + '/' + e.h).join(', '));

// ── El límite de simultáneas, que es la regla crítica ─────────────────────
titulo('Límite de personas simultáneas');
function violaciones() {
  let fuera = 0, dentro = 0, det = null;
  for (let di = 0; di < 7; di++)
    for (let m = A.tm(A.gOP()); m < A.tm(A.gCL()); m += 10) {
      const c = A.cntAt(di, m), lim = A.allowedAt(di, m);
      if (c > lim) { if (lim > A.gMAX()) dentro++; else fuera++; if (!det) det = A.DAYS[di] + ' ' + A.ft(m) + ': ' + c + 'p (máx ' + lim + ')'; }
    }
  return { fuera, dentro, det };
}
for (const n of [3, 4, 5, 6, 7]) {
  restaurar();
  while (A.emps.length > n) A.emps.pop();
  while (A.emps.length < n) {
    const i = A.emps.length;
    A.emps.push({ id: 900 + i, name: 'Prueba' + i, role: 'camarero', h: 20, mhd: 8, es: '12:00', ap: true, ch: 9, ot: false, mow: 0, or_: 0, ud: [], wd: 4, canOpen: false, canClose: true, clr: '#333', bg: '#ccc', baja: null });
  }
  A.doGenerateAll();
  const v = violaciones();
  comprobar(v.fuera === 0 && v.dentro === 0, 'con ' + n + ' empleados se respeta el límite', v.det);
}
for (const mx of [1, 2, 3, 4]) {
  restaurar(); valores['cfg-maxsim'] = String(mx); valores['cfg-maxsimpk'] = String(mx + 1);
  A.doGenerateAll();
  const v = violaciones();
  comprobar(v.fuera === 0 && v.dentro === 0, 'con máximo ' + mx + ' en tienda se respeta el límite', v.det);
}
restaurar();
comprobar(A.allowedAt(0, A.tm('14:00')) === A.gMAXPK(), 'dentro de alta demanda rige el máximo ampliado');
comprobar(A.allowedAt(0, A.tm('18:00')) === A.gMAX(), 'fuera de alta demanda rige el máximo estricto');

// ── Horarios de local distintos ───────────────────────────────────────────
titulo('Otros horarios de local');
for (const [o, c] of [['08:00', '22:00'], ['11:00', '23:59'], ['10:00', '20:00'], ['09:30', '15:30']]) {
  restaurar(); valores['cfg-op'] = o; valores['cfg-cl'] = c;
  let err = null;
  try { A.doGenerateAll(); } catch (e) { err = e.message; }
  const v = err ? null : violaciones();
  comprobar(!err && v.fuera === 0 && v.dentro === 0, 'horario ' + o + '–' + c + ' respeta el límite', err || (v && v.det));
}
restaurar();

// ── Casos límite ──────────────────────────────────────────────────────────
titulo('Casos límite');
function sinRomperse(desc, fn) {
  try { fn(); comprobar(true, desc); }
  catch (e) { comprobar(false, desc, e.message); }
}
restaurar(); A.emps = [];
sinRomperse('la app aguanta con 0 empleados', () => { A.doGenerateAll(); A.renderSched(); A.renderCosts(); A.renderAlerts(); A.getIssues(); });
restaurar(); A.emps = [PLANTILLA[0]];
sinRomperse('la app aguanta con 1 empleado', () => { A.doGenerateAll(); A.renderSched(); });
restaurar(); A.emps.forEach(e => { e.canOpen = false; });
sinRomperse('la app aguanta si nadie puede abrir', () => A.doGenerateAll());
restaurar(); A.emps.forEach(e => { e.canClose = false; });
sinRomperse('la app aguanta si nadie puede cerrar', () => A.doGenerateAll());
restaurar();
{
  const d = A.getWD();
  A.emps.forEach(e => { e.baja = { from: A.dStr(d[0]), to: A.dStr(d[6]) }; });
  A.doGenerateAll();
  let todas = true;
  for (const e of A.emps) for (let di = 0; di < 7; di++) if (A.gS(e.id, di).t !== 'baja') todas = false;
  comprobar(todas, 'con todo el equipo de baja, la semana queda marcada como baja');
}
restaurar();
{
  const d = A.getWD();
  A.emps[2].baja = { from: A.dStr(d[1]), to: A.dStr(d[3]) };
  A.doGenerateAll();
  let dentro = true, fuera = true;
  for (let di = 1; di <= 3; di++) if (A.gS(A.emps[2].id, di).t !== 'baja') dentro = false;
  for (let di = 4; di < 7; di++) if (A.gS(A.emps[2].id, di).t === 'baja') fuera = false;
  comprobar(dentro, 'los días dentro del rango de baja se marcan');
  comprobar(fuera, 'los días fuera del rango de baja NO se marcan');
}
restaurar(); A.emps[3].ud = [0, 1, 2, 3, 4, 5, 6];
A.doGenerateAll();
{
  let turnos = 0;
  for (let di = 0; di < 7; di++) if (A.gS(A.emps[3].id, di).t === 'work') turnos++;
  comprobar(turnos === 0, 'quien no está disponible ningún día no recibe turnos');
}
restaurar();

// ── Fechas ────────────────────────────────────────────────────────────────
titulo('Fechas y navegación');
A.doGenerateAll();
{
  const base = A.weekOff;
  let bien = true, detalle = null;
  for (const off of [-60, -1, 0, 1, 26, 60, 200]) {
    A.weekOff = base + off; A._wdc = null;
    const d = A.getWD();
    if (d[0].getDay() !== 1 || d[6].getDay() !== 0) { bien = false; detalle = 'semana ' + off + ' no va de lunes a domingo'; }
    const vistas = new Set(d.map(A.dStr));
    if (vistas.size !== 7) { bien = false; detalle = 'semana ' + off + ' repite fechas'; }
  }
  A.weekOff = base; A._wdc = null;
  comprobar(bien, 'las semanas van siempre de lunes a domingo, incluso a años vista', detalle);
  const d0 = A.getWD()[0];
  const local = d0.getFullYear() + '-' + ('0' + (d0.getMonth() + 1)).slice(-2) + '-' + ('0' + d0.getDate()).slice(-2);
  comprobar(A.dStr(d0) === local, 'las fechas usan el día local, no UTC (si no, los festivos se desplazan)');
}

// ── Festivos ──────────────────────────────────────────────────────────────
titulo('Festivos');
{
  const n = A.fests.length;
  elem('nfd').value = '2026-12-31'; elem('nfn').value = 'Prueba A'; elem('nft').value = 'local';
  A.addFest();
  elem('nfd').value = '2026-12-31'; elem('nfn').value = 'Prueba B'; elem('nft').value = 'futbol';
  A.addFest();
  comprobar(A.fests.length === n + 2, 'se pueden añadir dos eventos el mismo día');
  const ia = A.fests.findIndex(f => f.name === 'Prueba A');
  const ib = A.fests.findIndex(f => f.name === 'Prueba B');
  comprobar(A.festActive(A.fests[ia]) && A.festActive(A.fests[ib]), 'los eventos nuevos nacen activos');
  A.togFest(ib, false);
  comprobar(A.festActive(A.fests[ia]) && !A.festActive(A.fests[ib]), 'desactivar un evento NO desactiva el otro del mismo día');
  A.togFest(ib, true);
  comprobar(A.festActive(A.fests[ib]), 'se puede volver a activar');
  A.togFest(ib, false); A.saveConfig();
  comprobar(JSON.parse(almacen['tpScheduler']).festOn['2026-12-31|Prueba B'] === false, 'el estado desactivado se guarda');
  A.delFest(A.fests.findIndex(f => f.name === 'Prueba B'));
  A.delFest(A.fests.findIndex(f => f.name === 'Prueba A'));
  comprobar(A.fests.length === n, 'se pueden borrar');
  // migración desde el formato antiguo (indexado por fecha)
  const fb = A.fests, fob = A.festOn;
  A.fests = [{ date: '2026-05-01', name: 'Uno', type: 'nacional' }, { date: '2026-05-01', name: 'Dos', type: 'futbol' }, { date: '2026-12-25', name: 'Tres', type: 'nacional' }];
  A.festOn = { '2026-05-01': true };
  A.migrateFestOn();
  comprobar(A.festActive(A.fests[0]) && A.festActive(A.fests[1]), 'al migrar datos antiguos, los activos siguen activos');
  comprobar(!A.festActive(A.fests[2]), 'al migrar datos antiguos, los desactivados siguen desactivados');
  const antes = JSON.stringify(A.festOn); A.migrateFestOn();
  comprobar(JSON.stringify(A.festOn) === antes, 'migrar dos veces no cambia nada');
  A.fests = fb; A.festOn = fob;
}

// ── Franjas de alta demanda ───────────────────────────────────────────────
titulo('Franjas de alta demanda');
restaurar(); A.doGenerateAll();
{
  const n = A.peaks.length;
  const dias = A.peaks[1].days.slice();
  A.togPkD(A.peaks[1].id, 2);
  comprobar(A.peaks[1].days.indexOf(2) < 0, 'quitar un día de una franja funciona');
  comprobar(JSON.parse(almacen['tpScheduler']).peaks[1].days.indexOf(2) < 0, 'el cambio de días se guarda al instante');
  A.peaks[1].days = dias;
  A.addPk();
  comprobar(A.peaks.length === n + 1, 'se puede añadir una franja');
  A.delPk(A.peaks[A.peaks.length - 1].id);
  comprobar(A.peaks.length === n, 'se puede borrar una franja');
  const vacias = A.peaks[1].days.slice();
  A.peaks[1].days = [];
  sinRomperse('una franja sin días no rompe la generación', () => A.doGenerateAll());
  A.peaks[1].days = vacias;
}
restaurar();

// ── Empleados ─────────────────────────────────────────────────────────────
titulo('Alta, edición y baja de empleados');
{
  const n = A.emps.length;
  Object.assign(valores, { en: 'Prueba', er: 'camarero', eh: '20', emh: '8', ec: '10', ees: '12:00', ewd: '4', emow: '4', eor: '11.25' });
  elem('ecanopen').checked = false; elem('ecanclose').checked = true;
  elem('eap').checked = true; elem('eot').checked = false; elem('ebaja').checked = false;
  A.saveEmp(null);
  comprobar(A.emps.length === n + 1, 'se añade un empleado');
  const nuevo = A.emps[A.emps.length - 1];
  comprobar(nuevo.h === 20 && nuevo.es === '12:00' && nuevo.clr, 'los datos del empleado nuevo se guardan');
  sinRomperse('se genera el horario con el empleado nuevo', () => A.doGenerateAll());
  A.delEmp(nuevo.id);
  comprobar(A.emps.length === n, 'se borra un empleado');
  valores.en = '   ';
  A.saveEmp(null);
  comprobar(A.emps.length === n, 'un nombre vacío no crea empleado');
}
restaurar();

// ── Edición manual de turnos ──────────────────────────────────────────────
titulo('Edición manual de turnos');
A.doGenerateAll();
{
  const e = A.emps[0];
  comprobar(A.shiftProblems(e, { t: 'work', sh: 'c', s: '09:30', e: '17:30' }).length === 0, 'un turno correcto no da avisos');
  comprobar(A.shiftProblems(e, { t: 'work', sh: 'c', s: '18:00', e: '10:00' }).length > 0, 'se detecta salida anterior a la entrada');
  comprobar(A.shiftProblems(e, { t: 'work', sh: 'c', s: '09:30', e: '23:30' }).length > 0, 'se detecta exceso de horas diarias');
  comprobar(A.shiftProblems(e, { t: 'work', sh: 'c', s: '07:00', e: '13:00' }).length > 0, 'se detecta entrada antes de abrir');
  comprobar(A.shiftProblems(e, { t: 'work', sh: 'p', ms: '11:00', me: '14:00', as_: '15:00', ae: '19:00' }).length > 0, 'se detecta pausa de partido menor de 2h');
  comprobar(A.shiftProblems(e, { t: 'off' }).length === 0, 'un descanso no da avisos');
  // cancelar el aviso no debe guardar
  entorno.confirm = () => false;
  const antes = JSON.stringify(A.gS(e.id, 0));
  valores.mtype = 'work'; valores.ms = '09:30'; valores.me = '23:30';
  A.saveCell(e.id, 0);
  comprobar(JSON.stringify(A.gS(e.id, 0)) === antes, 'cancelar el aviso no guarda el turno ilegal');
  entorno.confirm = () => true;
  A.saveCell(e.id, 0);
  comprobar(A.gS(e.id, 0).e === '23:30', 'aceptar el aviso sí lo guarda');
  // plantillas rápidas
  for (const t of ['ap', 'td', 'no']) {
    A.qA(e.id, 1, t);
    comprobar(A.gS(e.id, 1).t === 'work', 'la plantilla rápida "' + t + '" asigna turno');
  }
}
restaurar();

// ── Alertas ───────────────────────────────────────────────────────────────
titulo('Alertas');
A.doGenerateAll();
{
  const limpio = A.getIssues().length;
  A.sS(A.emps[0].id, 0, { t: 'work', sh: 'c', tmpl: 'manual', s: '09:30', e: '23:30', ms: '', me: '', as_: '', ae: '' });
  const roto = A.getIssues();
  comprobar(roto.length > limpio, 'romper el horario genera más alertas');
  comprobar(roto.some(i => /h\/día|máx/.test(i.m)), 'se avisa del exceso de horas diarias');
  comprobar(roto.every(i => i.l && i.m), 'todas las alertas tienen nivel y texto');
  // las notificaciones deben explicarse, no solo enunciarse
  comprobar(roto.every(i => i.t && i.t.length > 12), 'cada aviso tiene un titular legible');
  comprobar(roto.filter(i => i.x && i.x.length > 25).length >= roto.length * 0.8,
    'la mayoría de avisos explican qué hacer');
  comprobar(!roto.some(i => /\d+\/\d+p\b|ET art|sin OT auth/.test(i.t || i.m)),
    'ya no quedan abreviaturas crípticas en los avisos');
  comprobar(roto.some(i => /lunes|martes|miércoles|jueves|viernes|sábado|domingo/.test(i.t)),
    'los avisos nombran los días completos');
  const pintado = A.pintaAvisos(roto, 0);
  comprobar(/Hay que arreglarlo|Conviene revisarlo|Para tenerlo en cuenta/.test(pintado),
    'los avisos se agrupan por gravedad');
  comprobar(A.pintaAvisos([], 0).indexOf('Todo correcto') >= 0, 'sin avisos se dice claramente');
}
restaurar();

// ── Exportación a Excel ───────────────────────────────────────────────────
titulo('Exportación a Excel');
A.doGenerateAll();
try {
  A.doExcel();
  const x = entorno._excel;
  comprobar(!!x, 'se genera el archivo');
  comprobar(/^TastyPoke_Sem\d+\.xlsx$/.test(x.fn), 'el nombre del archivo es correcto', x && x.fn);
  const filas = x.wb.Sheets[x.wb.SheetNames[0]]._aoa;
  comprobar(filas.length === 4 + A.emps.length * 2 + 2, 'el número de filas cuadra');
  comprobar(filas.every(f => f.length === 18), 'todas las filas tienen 18 columnas');
  let cuadra = true;
  for (let ei = 0; ei < A.emps.length; ei++) {
    const f1 = filas[4 + ei * 2], f2 = filas[5 + ei * 2];
    if (f1[0] !== A.emps[ei].name) cuadra = false;
    if (Math.abs(f1[2] - A.empW(A.emps[ei]).tot) > 0.05) cuadra = false;
    for (let di = 0; di < 7; di++) {
      const s = A.gS(A.emps[ei].id, di), c = 3 + di * 2;
      if (s.t === 'work' && s.sh === 'c' && (f1[c] !== s.s || f1[c + 1] !== s.e)) cuadra = false;
      if (s.t === 'work' && s.sh === 'p' && (f1[c] !== s.ms || f2[c] !== s.as_)) cuadra = false;
    }
  }
  comprobar(cuadra, 'las horas del Excel coinciden con las del horario en pantalla');
} catch (e) { comprobar(false, 'la exportación a Excel funciona', e.message); }

// ── Guardado y recuperación ───────────────────────────────────────────────
titulo('Guardado y recuperación');
{
  A.saveConfig();
  const guardado = JSON.parse(almacen['tpScheduler']);
  comprobar(guardado.emps.length === A.emps.length, 'se guardan los empleados');
  comprobar(!!guardado.peaks && !!guardado.fests && !!guardado.settings, 'se guardan franjas, festivos y configuración');
  comprobar(guardado.settings.maxsimpk !== undefined, 'se guarda el máximo de alta demanda');
  comprobar(guardado.sched === undefined, 'el horario NO se guarda: siempre se regenera');
  almacen['tpVer'] = '18';
  comprobar(A.loadConfig() === true, 'se recupera lo guardado');
  almacen['tpVer'] = '17';
  comprobar(A.loadConfig() === false, 'una versión antigua se descarta');
  almacen['tpVer'] = '18'; almacen['tpScheduler'] = '{roto';
  const logReal = console.log; console.log = () => {};   // la app avisa por consola: es lo esperado
  const resultado = A.loadConfig();
  console.log = logReal;
  comprobar(resultado === false, 'unos datos corruptos no rompen la app');
  almacen['tpScheduler'] = JSON.stringify({ emps: [{ id: 1, name: 'Viejo', role: 'camarero', h: 20, mhd: 8, es: '10:00', ap: true, ch: 9, ot: false, mow: 0, or_: 0, ud: [] }], settings: { op: '09:30', cl: '23:30' } });
  A.loadConfig();
  comprobar(A.emps[0].wd !== undefined && A.emps[0].canOpen !== undefined && A.emps[0].baja === null, 'a los datos antiguos se les rellenan los campos nuevos');
  comprobar(A.emps[0].start === '' && Array.isArray(A.emps[0].blocks), 'y también los campos de incorporación y bloqueos');
  delete almacen['tpHelpSeen'];
  A.openHelp();
  comprobar(almacen['tpHelpSeen'] === '1', 'la guía se marca como vista al abrirla');
  const guia = elem('modal').innerHTML;
  comprobar(/incorpora/i.test(guia), 'la guía explica la incorporación');
  comprobar(/puntual/i.test(guia), 'la guía explica los bloqueos puntuales');
  comprobar(/captura/i.test(guia), 'la guía explica la importación por captura');
  comprobar(/propuestas/i.test(guia), 'la guía explica el panel de propuestas');
  comprobar(/clic en el nombre/i.test(guia), 'la guía explica el renombrado rápido');
  comprobar(/deshac/i.test(guia), 'la guía explica el botón de deshacer');
}

// ── Deshacer / rehacer ──────────────────────────────────────────────────────
titulo('Deshacer y rehacer');
restaurar();
{
  A._undo = []; A._redo = [];
  const firma = () => A.emps.map(e => e.name + ':' + [0,1,2,3,4,5,6].map(d => JSON.stringify(A.gS(e.id, d))).join('')).join('|');
  const antes = firma();
  A.marcarCambio('prueba');
  A.sS(A.emps[0].id, 1, { t: 'work', sh: 'c', tmpl: 'manual', s: '10:00', e: '18:00', ms: '', me: '', as_: '', ae: '' });
  comprobar(firma() !== antes, 'el cambio se aplica');
  A.doUndo();
  comprobar(firma() === antes, 'deshacer restaura el horario exacto');
  A.doRedo();
  comprobar(firma() !== antes, 'rehacer vuelve a aplicarlo');
  A.doUndo();
  // recuperar un empleado borrado
  const n = A.emps.length, nombre = A.emps[n - 1].name;
  A.marcarCambio('baja');
  A.emps = A.emps.filter(x => x.name !== nombre);
  A.doUndo();
  comprobar(A.emps.length === n && A.emps.some(e => e.name === nombre), 'deshacer recupera a un empleado borrado');
  // tope del historial y ramas
  A._undo = []; A._redo = [];
  for (let i = 0; i < 30; i++) A.marcarCambio('c' + i);
  comprobar(A._undo.length === 25, 'el historial se limita a 25 pasos', A._undo.length + '');
  A.doUndo();
  comprobar(A._redo.length === 1, 'deshacer alimenta la pila de rehacer');
  A.marcarCambio('rama nueva');
  comprobar(A._redo.length === 0, 'un cambio nuevo descarta lo que había para rehacer');
  A._undo = []; A._redo = [];
  let rompio = false;
  try { A.doUndo(); A.doRedo(); } catch (e) { rompio = true; }
  comprobar(!rompio, 'deshacer sin historial no rompe nada');
}
restaurar();
restaurar();

// ── Funcionalidades nuevas: reglas que no deben perderse ────────────────────
titulo('Disponibilidad: incorporación y bloqueos');
restaurar();
{
  const f = A.getWD();
  const e = A.emps[3];
  e.start = A.dStr(f[3]);
  A.sched = {}; A.genWeeks = {}; A.doGenerateAll();
  let antes = 0;
  for (let di = 0; di < 3; di++) { const s = A.gS(e.id, di); if (s && s.t === 'work') antes++; }
  comprobar(antes === 0, 'nadie trabaja antes de su fecha de incorporación', antes + ' turnos');
  e.startTime = '18:00';
  A.sched = {}; A.genWeeks = {}; A.doGenerateAll();
  const seg = A.shSegs(A.gS(e.id, 3));
  comprobar(seg.length === 0 || seg.every(x => x.a >= A.tm('18:00')), 'el primer día respeta la hora de arranque');
  e.start = ''; e.startTime = '';
  // ── hasta cuándo puede trabajar ──
  e.end = A.dStr(f[3]);
  A.sched = {}; A.genWeeks = {}; A.doGenerateAll();
  let despues = 0;
  for (let di = 4; di < 7; di++) { const s = A.gS(e.id, di); if (s && s.t === 'work') despues++; }
  comprobar(despues === 0, 'nadie trabaja después de su último día', despues + ' turnos');
  let hasta = 0;
  for (let di = 0; di <= 3; di++) { const s = A.gS(e.id, di); if (s && s.t === 'work') hasta++; }
  comprobar(hasta > 0, 'sí puede trabajar hasta ese día incluido', hasta + ' turnos');
  e.endTime = '20:00';
  A.sched = {}; A.genWeeks = {}; A.doGenerateAll();
  const segF = A.shSegs(A.gS(e.id, 3));
  comprobar(segF.length === 0 || segF.every(x => x.b <= A.tm('20:00')), 'el último día respeta la hora de salida',
    segF.map(x => A.ft(x.a) + '-' + A.ft(x.b)).join(' '));
  comprobar(A.latestMin(e, A.dStr(f[3])) === A.tm('20:00'), 'latestMin aplica la hora de salida');
  comprobar(A.latestMin(e, A.dStr(f[2])) === A.tm(A.gCL()), 'los demás días se cierra a la hora normal');
  comprobar(!A.enPlantilla(e, A.dStr(f[5])), 'fuera del periodo ya no está en plantilla');
  comprobar(A.enPlantilla(e, A.dStr(f[2])), 'dentro del periodo sí lo está');
  comprobar(A.getIssues().some(i => /termina/.test(i.m)), 'se avisa de la fecha de salida');
  e.end = ''; e.endTime = '';
}
restaurar();
{
  const f = A.getWD();
  const e = A.emps[0];
  e.blocks = [{ d: A.dStr(f[2]), a: '', b: '' }];
  A.sched = {}; A.genWeeks = {}; A.doGenerateAll();
  const s = A.gS(e.id, 2);
  comprobar(!s || s.t !== 'work', 'un bloqueo de día completo deja libre ese día');
  e.blocks = [{ d: A.dStr(f[1]), a: '09:00', b: '14:00' }];
  A.sched = {}; A.genWeeks = {}; A.doGenerateAll();
  const seg = A.shSegs(A.gS(e.id, 1));
  comprobar(!seg.some(x => x.a < A.tm('14:00') && x.b > A.tm('09:00')), 'un bloqueo de horas no se pisa',
    seg.map(x => A.ft(x.a) + '-' + A.ft(x.b)).join(' '));
  // caducidad
  const ayer = new Date(); ayer.setDate(ayer.getDate() - 1);
  const manana = new Date(); manana.setDate(manana.getDate() + 1);
  e.blocks = [{ d: A.dStr(ayer), a: '', b: '' }, { d: A.dStr(manana), a: '', b: '' }];
  A.purgeBlocks();
  comprobar(e.blocks.length === 1 && e.blocks[0].d === A.dStr(manana), 'los bloqueos pasados se borran solos');
  e.blocks = [];
}
restaurar();

titulo('Semana de inicio, renombrado y propuestas');
{
  comprobar(typeof A.genFromOff === 'function' && typeof A.weekNumOf === 'function', 'existe la selección de semana de inicio');
  const destino = A.initWeekOff() + 2;
  valores['genfrom'] = String(destino);
  A.doGenerateAll();
  const gen = Object.keys(A.genWeeks).map(Number).sort((a, b) => a - b);
  comprobar(gen[0] === destino && gen.length === 5, 'genera 5 semanas desde la elegida', 'desde S' + A.weekNumOf(gen[0]).n);
  valores['genfrom'] = String(A.initWeekOff());
  A.doGenerateAll();
}
{
  const antes = A.emps[0].name;
  const turnos = JSON.stringify([0,1,2,3,4,5,6].map(d => A.gS(A.emps[0].id, d)));
  A.renameEmp(A.emps[0].id);
  valores['rn-nombre'] = 'Nombre Nuevo';
  A.saveRename(A.emps[0].id);
  comprobar(A.emps[0].name === 'Nombre Nuevo', 'se puede renombrar desde el horario');
  comprobar(JSON.stringify([0,1,2,3,4,5,6].map(d => A.gS(A.emps[0].id, d))) === turnos, 'renombrar no altera los turnos');
  A.renameEmp(A.emps[0].id);
  valores['rn-nombre'] = '   ';
  A.saveRename(A.emps[0].id);
  comprobar(A.emps[0].name === 'Nombre Nuevo', 'un nombre vacío no se acepta');
  A.emps[0].name = antes;
}
{
  const firma = () => A.emps.map(e => [0,1,2,3,4,5,6].map(d => JSON.stringify(A.gS(e.id, d))).join('')).join('');
  const estado = A.emps.map(e => e.ap + '|' + e.ot).join(',');
  const f1 = firma();
  A.sugerirCoberturas();
  comprobar(firma() === f1, 'evaluar propuestas no cambia el horario');
  comprobar(A.emps.map(e => e.ap + '|' + e.ot).join(',') === estado, 'evaluar propuestas no activa nada por su cuenta');
  comprobar(A._sugerencias.every(s => s.mejora > 0 || s.mejoraH >= 0.5), 'solo se proponen ajustes que mejoran');
}
restaurar();

titulo('Las horas de contrato se respetan aunque cambien los días');
restaurar();
{
  // una sola persona: el motor la necesita los 7 días para poder abrir, pero su
  // contrato manda: debe repartir sus horas, no inventarlas
  A.emps = [PLANTILLA[0]];
  A.doGenerateAll();
  const w = A.empW(A.emps[0]);
  comprobar(w.tot <= A.emps[0].h + 0.26, 'con una sola persona no se le hacen horas de más',
    w.tot.toFixed(1) + 'h de un contrato de ' + A.emps[0].h + 'h');
  let dias = 0;
  for (let d = 0; d < 7; d++) { const s = A.gS(A.emps[0].id, d); if (s && s.t === 'work') dias++; }
  comprobar(dias >= 5, 'trabaja los días que hagan falta para abrir', dias + ' días');
}
restaurar();
{
  // si solo una persona puede abrir, tendrá que estar todos los días: sus horas
  // diarias deben bajar en consecuencia
  A.emps.forEach((e, i) => { e.canOpen = i === 0; e.es = i === 0 ? '09:30' : '11:00'; });
  A.doGenerateAll();
  const excedidos = A.emps.filter(e => A.empW(e).tot > e.h + (e.ot ? e.mow : 0) + 0.26);
  comprobar(excedidos.length === 0, 'si solo una persona abre, nadie acaba con horas de más',
    excedidos.map(e => e.name + ' ' + A.empW(e).tot.toFixed(1) + '/' + e.h).join(', '));
}
restaurar();

titulo('Resistencia a datos raros y nombres hostiles');
{
  // nombres que podrían romper la página si no se escapan
  const guardadas = JSON.parse(JSON.stringify(A.emps));
  A.emps[0].name = '</td></tr><tr><td>fila falsa';
  A.emps[1].name = '<script>PWNED=1</script>';
  A.emps[2].name = 'O\'Brien "El Jefe" & Cía';
  let err = null;
  try { A.doGenerateAll(); A.renderSched(); A.renderEmps(); A.renderCosts(); } catch (e) { err = e.message; }
  comprobar(!err, 'los nombres con HTML no rompen el renderizado', err);
  const pintado = elem('sctbl').innerHTML;
  comprobar(pintado.indexOf('<script>') < 0, 'un nombre no puede inyectar una etiqueta <script>');
  comprobar(pintado.indexOf('fila falsa</td>') < 0 || pintado.indexOf('&lt;/td&gt;') >= 0,
    'un nombre no puede cerrar la tabla a mitad');
  comprobar(/&amp;|&quot;|&#39;/.test(pintado), 'los caracteres especiales se escapan');
  A.emps = guardadas;
}
restaurar();
{
  // datos guardados que no tienen ni pies ni cabeza
  const basura = ['{"emps":"no soy lista"}', '{"emps":[null,null]}', '{"emps":[{}]}',
    '{"emps":[{"id":1,"name":"X","h":20}],"peaks":"mal"}', '{"emps":[{"id":1}],"festOn":123}'];
  let rotos = 0;
  for (const raw of basura) {
    almacen['tpVer'] = '18'; almacen['tpScheduler'] = raw;
    const logReal = console.log; console.log = () => {};
    try { A.loadConfig(); A.normalizeEmps(); A.normalizeResto(); A.doGenerateAll(); }
    catch (e) { rotos++; }
    console.log = logReal;
    if (!Array.isArray(A.emps)) rotos++;
  }
  comprobar(rotos === 0, 'sobrevive a 5 formas distintas de datos corruptos', rotos + ' fallos');
  restaurar();
  // valores imposibles en una ficha
  A.emps[1].h = -5; A.emps[1].mhd = 0; A.emps[1].wd = 99; A.emps[1].es = 'nunca'; A.emps[1].ud = null;
  A.normalizeEmps();
  comprobar(A.emps[1].h > 0 && A.emps[1].mhd > 0 && A.emps[1].wd <= 7 && /^\d\d:\d\d$/.test(A.emps[1].es) && Array.isArray(A.emps[1].ud),
    'una ficha con valores imposibles se sanea sola');
  let err2 = null;
  try { A.doGenerateAll(); } catch (e) { err2 = e.message; }
  comprobar(!err2, 'y después se puede generar igualmente', err2);
}
restaurar();

titulo('El máximo de personas es una garantía, pase lo que pase');
{
  // plantilla absurdamente grande: el aforo debe seguir respetándose
  A.emps = [];
  for (let i = 0; i < 14; i++) A.emps.push({ id: 700 + i, name: 'P' + i, role: i === 0 ? 'encargado' : 'camarero',
    h: 20 + (i % 3) * 10, mhd: 9, es: '09:30', ap: true, ch: 9, ot: false, mow: 0, or_: 0, ud: [], wd: 4,
    canOpen: i % 2 === 0, canClose: true, clr: '#333', bg: '#ccc', baja: null,
    start: '', startTime: '', end: '', endTime: '', blocks: [] });
  A.normalizeEmps();
  const t0 = Date.now();
  A.doGenerateAll();
  const tardo = Date.now() - t0;
  let excesos = 0, peor = null;
  for (let di = 0; di < 7; di++)
    for (let m = A.tm(A.gOP()); m < A.tm(A.gCL()); m += 15) {
      const c = A.cntAt(di, m), l = A.allowedAt(di, m);
      if (c > l) { excesos++; if (!peor) peor = A.DIAS_NOMBRE[di] + ' ' + A.ft(m) + ': ' + c + 'p (máx ' + l + ')'; }
    }
  comprobar(excesos === 0, 'con 14 personas no se supera el aforo ni una vez', peor);
  comprobar(tardo < 30000, 'y generar no tarda una eternidad', tardo + ' ms');
  const pasados = A.emps.filter(e => A.empW(e).tot > e.h + 0.3);
  comprobar(pasados.length === 0, 'nadie hace más horas que su contrato',
    pasados.map(e => e.name + ' ' + A.empW(e).tot.toFixed(1) + '/' + e.h).join(', '));
}
restaurar();
{
  // un turno partido nunca debe darle a nadie más horas de las que le tocan
  A.emps.forEach(e => { e.h = 10; e.wd = 5; e.mhd = 8; });
  A.normalizeEmps();
  A.doGenerateAll();
  let largos = [];
  for (const e of A.emps) for (let d = 0; d < 7; d++) {
    const s = A.gS(e.id, d);
    if (s && s.t === 'work' && A.shH(s) > A.dailyH(e) + 0.1) largos.push(e.name + ' ' + A.DAYS[d] + ' ' + A.shH(s).toFixed(1) + 'h');
  }
  comprobar(largos.length === 0, 'ningún turno supera las horas diarias que le corresponden', largos[0]);
}
restaurar();

titulo('Avisos de configuración imposible');
{
  // local que abre antes de que nadie pueda entrar
  valores['cfg-op'] = '08:00';
  A.doGenerateAll();
  const iss = A.getIssues();
  comprobar(iss.some(i => /nadie puede entrar/i.test(i.t)), 'avisa si el local abre antes de que nadie pueda entrar');
  const aviso = iss.find(i => /nadie puede entrar/i.test(i.t));
  comprobar(aviso && /puede trabajar desde/.test(aviso.x), 'y dice exactamente dónde cambiarlo');
  valores['cfg-op'] = '09:30';
  // nadie con permiso para abrir
  A.emps.forEach(e => { e.canOpen = false; });
  A.doGenerateAll();
  comprobar(A.getIssues().some(i => /Nadie tiene permiso para abrir/i.test(i.t)), 'avisa si nadie puede abrir');
  restaurar();
  A.emps.forEach(e => { e.canClose = false; });
  A.doGenerateAll();
  comprobar(A.getIssues().some(i => /Nadie tiene permiso para cerrar/i.test(i.t)), 'avisa si nadie puede cerrar');
  restaurar();
  // equipo que no suma horas
  A.emps = [PLANTILLA[0]];
  A.doGenerateAll();
  const falta = A.getIssues().find(i => /no suma horas/i.test(i.t));
  comprobar(!!falta, 'avisa si el equipo no da para el horario de apertura');
  comprobar(falta && /Faltan \d+ h/.test(falta.x), 'y dice cuántas horas faltan', falta && falta.x.slice(0, 60));
}
restaurar();

titulo('Detección exacta de excesos y reparto justo de descansos');
restaurar();
{
  // Los turnos pueden acabar en minutos "raros" (las horas diarias salen de
  // dividir el contrato). El control de aforo debe mirar los tramos reales,
  // no muestrear cada X minutos, o un exceso corto pasa desapercibido.
  A.emps = [
    { id: 1, name: 'A', role: 'camarero', h: 35, mhd: 6, es: '12:00', ap: true, ch: 9, ot: false, mow: 0, or_: 0, ud: [], wd: 2, canOpen: true, canClose: true, clr: '#333', bg: '#ccc', baja: null, start: '', startTime: '', end: '', endTime: '', blocks: [] },
    { id: 2, name: 'B', role: 'camarero', h: 5, mhd: 5, es: '09:30', ap: true, ch: 9, ot: false, mow: 0, or_: 0, ud: [], wd: 6, canOpen: true, canClose: true, clr: '#333', bg: '#ccc', baja: null, start: '', startTime: '', end: '', endTime: '', blocks: [] },
    { id: 3, name: 'C', role: 'camarero', h: 40, mhd: 10, es: '12:00', ap: true, ch: 9, ot: false, mow: 0, or_: 0, ud: [], wd: 2, canOpen: true, canClose: true, clr: '#333', bg: '#ccc', baja: null, start: '', startTime: '', end: '', endTime: '', blocks: [] },
    { id: 4, name: 'D', role: 'camarero', h: 35, mhd: 4, es: '12:00', ap: true, ch: 9, ot: false, mow: 0, or_: 0, ud: [], wd: 5, canOpen: true, canClose: true, clr: '#333', bg: '#ccc', baja: null, start: '', startTime: '', end: '', endTime: '', blocks: [] },
    { id: 5, name: 'E', role: 'camarero', h: 30, mhd: 8, es: '12:00', ap: true, ch: 9, ot: false, mow: 0, or_: 0, ud: [], wd: 4, canOpen: true, canClose: true, clr: '#333', bg: '#ccc', baja: null, start: '', startTime: '', end: '', endTime: '', blocks: [] }
  ];
  A.normalizeEmps();
  valores['cfg-maxsim'] = '1'; valores['cfg-maxsimpk'] = '2';
  A.sched = {}; A.genWeeks = {}; A.doGenerateWeek(A.weekOff, 3);
  // se comprueba con los tramos reales, que es donde se escondía el fallo
  let colado = null;
  for (let di = 0; di < 7 && !colado; di++)
    for (const g of A.getCovSegs(di)) {
      const lim = A.allowedAt(di, (g.s + g.e) / 2);
      if (g.cnt > lim) { colado = A.DIAS_NOMBRE[di] + ' ' + A.ft(g.s) + '-' + A.ft(g.e) + ': ' + g.cnt + 'p (máx ' + lim + ')'; break; }
    }
  comprobar(!colado, 'un exceso de pocos minutos entre dos turnos no se escapa', colado);
  comprobar(typeof A.tramoConExceso === 'function', 'el aforo se busca por tramos reales, no muestreando');
  comprobar(A.excesoDia(0) === 0 || colado, 'la medida del exceso coincide con lo que se ve');
  valores['cfg-maxsim'] = '2'; valores['cfg-maxsimpk'] = '3';
}
restaurar();
{
  // Cada persona elige sus descansos sin ver los del resto: sin una pasada de
  // reparación se acumulaban y dejaban un día con una sola persona.
  A.emps = [
    { id: 1, name: 'Jefa', role: 'encargado', h: 40, mhd: 9, es: '09:30', ap: true, ch: 11, ot: false, mow: 0, or_: 0, ud: [], wd: 5, canOpen: true, canClose: true, clr: '#333', bg: '#ccc', baja: null, start: '', startTime: '', end: '', endTime: '', blocks: [] },
    { id: 2, name: 'M1', role: 'camarero', h: 30, mhd: 9, es: '11:00', ap: true, ch: 9, ot: false, mow: 0, or_: 0, ud: [], wd: 4, canOpen: false, canClose: true, clr: '#333', bg: '#ccc', baja: null, start: '', startTime: '', end: '', endTime: '', blocks: [] },
    { id: 3, name: 'M2', role: 'camarero', h: 25, mhd: 9, es: '11:00', ap: true, ch: 9, ot: false, mow: 0, or_: 0, ud: [], wd: 4, canOpen: false, canClose: true, clr: '#333', bg: '#ccc', baja: null, start: '', startTime: '', end: '', endTime: '', blocks: [] },
    { id: 4, name: 'M3', role: 'camarero', h: 20, mhd: 9, es: '11:00', ap: true, ch: 9, ot: false, mow: 0, or_: 0, ud: [], wd: 3, canOpen: false, canClose: true, clr: '#333', bg: '#ccc', baja: null, start: '', startTime: '', end: '', endTime: '', blocks: [] }
  ];
  A.normalizeEmps(); A.doGenerateAll();
  // Con una sola persona capaz de abrir, sus días libres dejan la tienda sin
  // apertura: es una limitación real de la plantilla, no un fallo. Lo que SÍ
  // exigimos es que nadie pierda su descanso ni haga horas de más por taparlo,
  // y que los únicos huecos sean ésos, al principio del día.
  const gaps = [];
  for (let di = 0; di < 7; di++)
    for (const g of A.getCovSegs(di))
      if (g.cnt === 0 && !g.inPause && (g.e - g.s) > 30)
        gaps.push({ d: di, s: g.s, e: g.e });
  const fueraDeApertura = gaps.filter(g => g.s > A.tm('11:30'));
  comprobar(fueraDeApertura.length === 0, 'los únicos huecos largos son los de la apertura sin encargada',
    fueraDeApertura.map(g => A.DIAS_NOMBRE[g.d] + ' ' + A.ft(g.s)).join(', '));
  const sinDescanso = A.emps.filter(e => {
    let d = 0;
    for (let di = 0; di < 7; di++) { const s = A.gS(e.id, di); if (!s || s.t !== 'work') d++; }
    return d < A.gRD();
  });
  comprobar(sinDescanso.length === 0, 'nadie pierde su descanso mínimo para cubrir la apertura',
    sinDescanso.map(e => e.name).join(', '));
  const pasados = A.emps.filter(e => A.empW(e).tot > e.h + 0.3);
  comprobar(pasados.length === 0, 'ni hace horas de más', pasados.map(e => e.name).join(', '));
  if (gaps.length) comprobar(A.getIssues().some(i => /no hay nadie/i.test(i.t)), 'y el hueco se avisa con claridad');
}
restaurar();

titulo('Huecos que se tapan juntando un turno partido');
restaurar();
{
  // equipo sin nadie que entre por la tarde: antes quedaba la franja previa a
  // cenas sin cubrir porque los de mediodía estaban en su pausa
  A.emps = A.emps.filter(e => A.tm(e.es || '09:30') < A.tm('15:30'));
  A.emps.push({ id: 880, name: 'Media', role: 'camarero', h: 25, mhd: 8, es: '11:00', ap: true, ch: 10,
    ot: false, mow: 0, or_: 0, ud: [], wd: 4, canOpen: false, canClose: true, clr: '#333', bg: '#ccc',
    baja: null, start: '', startTime: '', end: '', endTime: '', blocks: [] });
  A.doGenerateAll();
  let huecos = [];
  for (let di = 0; di < 7; di++)
    for (const s of A.getCovSegs(di))
      if (s.cnt === 0 && !s.inPause) { huecos.push(A.DIAS_NOMBRE[di] + ' ' + A.ft(s.s)); break; }
  comprobar(huecos.length === 0, 'sin nadie de tarde, el motor junta un partido para tapar el hueco',
    huecos.join(' · '));
  comprobar(typeof A.taparHuecosConPartidos === 'function', 'existe la función que lo hace');
  // y al juntarlo no debe inventar horas ni saltarse el máximo diario
  let malas = 0;
  for (const e of A.emps) for (let di = 0; di < 7; di++) {
    const s = A.gS(e.id, di);
    if (s && s.t === 'work' && A.shH(s) > e.mhd + 0.1) malas++;
  }
  comprobar(malas === 0, 'juntar el turno no supera el máximo diario de nadie', malas + '');
  let excesos = 0;
  for (let di = 0; di < 7; di++)
    for (let m = A.tm(A.gOP()); m < A.tm(A.gCL()); m += 10)
      if (A.cntAt(di, m) > A.allowedAt(di, m)) { excesos++; break; }
  comprobar(excesos === 0, 'ni rompe el límite de personas simultáneas', excesos + '');
}
restaurar();

titulo('Lectura de capturas');
{
  comprobar(typeof A.parseCaptura === 'function' && typeof A.leerCelda === 'function', 'existe el lector de capturas');
  comprobar(A.leerCelda('09:30-17:30').sh === 'c', 'entiende un turno continuo escrito a mano');
  comprobar(A.leerCelda('11:00-15:30 / 20:00-23:00').sh === 'p', 'entiende un partido escrito a mano');
  comprobar(A.leerCelda('17:30-09:30') === null, 'rechaza horas incoherentes');
  comprobar(A.leerCelda('').t === 'off', 'una celda vacía es descanso');
  comprobar(A.parecido('Stephie', 'Stephle') > 0.8, 'tolera erratas típicas del OCR');
  comprobar(A.parecido('Stephie', 'Tarik') < 0.5, 'no confunde nombres distintos');
  // el lector de imágenes no debe cargarse solo
  comprobar(html.slice(0, html.indexOf('</head>')).toLowerCase().indexOf('tesseract') < 0,
    'el lector de imágenes NO se descarga al abrir la app');
  comprobar((html.match(/<script src=/g) || []).length === 1,
    'la app sigue teniendo un único script externo fijo (funciona igual en GitHub Pages)');
}
restaurar();

// ── Nube ──────────────────────────────────────────────────────────────────
titulo('Sincronización en la nube (sin conexión)');
(async () => {
  for (const [nombre, fn] of [['probar', A.cloudTest], ['descargar', A.cloudPull], ['subir', A.cloudPush], ['comprobar', A.cloudCheck]]) {
    try { await fn(); comprobar(true, 'sin conexión, "' + nombre + '" no rompe la app'); }
    catch (e) { comprobar(false, 'sin conexión, "' + nombre + '" no rompe la app', e.message); }
  }
  comprobar(A.applyCloudData(null) === false, 'se rechazan datos de nube nulos');
  comprobar(A.applyCloudData('texto') === false, 'se rechazan datos de nube con formato inválido');
  const n = A.emps.length;
  A.applyCloudData({ emps: [] });
  comprobar(A.emps.length === n, 'una nube vacía no borra los empleados');
  // el bucle descargar→subir no debe producirse
  let subidas = 0;
  const real = A.cloudPush;
  A.cloudPush = () => { subidas++; };
  A.cloudApplying = true; A.saveConfig();
  comprobar(subidas === 0, 'guardar mientras se descarga NO vuelve a subir (evita el bucle)');
  A.cloudApplying = false; A.saveConfig();
  comprobar(subidas === 1, 'guardar normalmente sí sube');
  A.cloudPush = real;

  // ── Estado interno ──────────────────────────────────────────────────────
  titulo('Estado interno');
  restaurar(); A.doGenerateAll();
  {
    const base = A.weekOff, realCnt = A.cntAt;
    A.cntAt = () => { throw new Error('fallo simulado'); };
    try { A.doGenerateWeek(base + 3, 1); } catch (e) { /* esperado */ }
    A.cntAt = realCnt;
    comprobar(A.weekOff === base, 'si la generación falla, la semana activa no se descoloca');
    comprobar(A._wdc === null, 'si la generación falla, la caché de fechas se limpia');
  }
  restaurar();
  {
    A.sched = {}; A.genWeeks = {}; A.doGenerateWeek(A.weekOff, 0);
    const firma = () => A.emps.map(e => [0, 1, 2, 3, 4, 5, 6].map(d => JSON.stringify(A.gS(e.id, d))).join('')).join('');
    const f1 = firma();
    A.sched = {}; A.genWeeks = {}; A.doGenerateWeek(A.weekOff, 0);
    comprobar(firma() === f1, 'generar dos veces da exactamente el mismo horario');
    A.sched = {}; A.genWeeks = {}; A.doGenerateAll();
    const claves = Object.keys(A.sched).length;
    A.doGenerateAll();
    comprobar(Object.keys(A.sched).length === claves, 'regenerar no acumula turnos viejos');
  }

  // ── Pantallas ───────────────────────────────────────────────────────────
  titulo('Pantallas');
  restaurar(); A.doGenerateAll();
  for (const r of ['renderSched', 'renderAssess', 'renderCovBars', 'renderEmps', 'renderAlerts', 'renderCosts', 'renderFests', 'renderPkCfg', 'renderWkDots', 'updPP'])
    sinRomperse('la vista ' + r + ' se dibuja', () => A[r]());
  // En móvil las tablas deben poder desplazarse: si una tabla queda fuera de un
  // contenedor .ov, hereda min-width:580px y descuadra la pantalla del teléfono.
  {
    const conTabla = [['sctbl', elem('sctbl').innerHTML], ['cbreak', elem('cbreak').innerHTML]];
    comprobar(/<div class="ov">[\s\S]*<table/.test(html.slice(html.indexOf('id="tab-horario"'), html.indexOf('id="tab-empleados"'))),
      'la tabla del horario está dentro de un contenedor con scroll');
    const codigoCostes = codigo.slice(codigo.indexOf('function renderCosts'), codigo.indexOf('function renderCosts') + 700);
    comprobar(codigoCostes.indexOf('<div class="ov">') >= 0,
      'la tabla de costes está dentro de un contenedor con scroll (si no, se desborda en móvil)');
  }
  for (const t of ['horario', 'empleados', 'config', 'festivos', 'alertas', 'costes'])
    sinRomperse('la pestaña ' + t + ' se abre', () => A.goTab(t, { classList: { add() {}, remove() {} } }));
  sinRomperse('la vista de impresión funciona', () => A.doPrint());
  sinRomperse('la guía de ayuda se abre', () => A.openHelp());

  // ── Resultado ───────────────────────────────────────────────────────────
  console.log('\n──────────────────────────────────────────────────────────');
  if (fallos.length === 0) {
    console.log('  ✅  TODO CORRECTO — ' + ok + ' pruebas superadas.');
    console.log('      El cambio es seguro.\n');
    process.exit(0);
  } else {
    console.log('  ❌  ' + fallos.length + ' PRUEBA(S) FALLIDA(S) de ' + (ok + fallos.length) + ':\n');
    fallos.forEach(f => console.log('      ✗ ' + f));
    console.log('\n      Revisa esos puntos antes de dar el cambio por bueno.\n');
    process.exit(1);
  }
})();
