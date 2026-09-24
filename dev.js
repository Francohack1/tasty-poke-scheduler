/* ═══════════════════════════════════════════════════════════════════════════
   PRUEBAS DE DESARROLLADOR — Tasty Poke Scheduler
   ───────────────────────────────────────────────────────────────────────────
   Intenta ROMPER la app a propósito: nombres con HTML, 300 plantillas al azar,
   valores imposibles, datos guardados corruptos, 600 acciones aleatorias,
   rendimiento con equipos grandes y fechas difíciles.

   Requiere una vez:   npm install jsdom xlsx-js-style
   Luego:              node dev.js

   Complementa a pruebas.js: aquél comprueba que lo normal funciona, éste
   comprueba que lo anormal no la tumba.
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const XLSX = require('xlsx-js-style');
const path = require('path');
const ARCHIVO = path.join(__dirname, 'TastyPoke_Scheduler.html');
const html = fs.readFileSync(ARCHIVO, 'utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/, '');

let ok = 0; const fallos = [], avisos = [];
const chk = (c, d, x) => { if (c) ok++; else fallos.push(d + (x ? ' → ' + x : '')); };
const warn = (d) => avisos.push(d);
const sec = t => console.log('\n  ── ' + t + ' ──');

function app() {
  const vc = new VirtualConsole(); const errs = [];
  vc.on('jsdomError', e => errs.push(String(e.message || e)));
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc, url: 'https://local.test/' });
  const W = dom.window;
  W.XLSX = XLSX; XLSX.writeFile = () => {};
  W.fetch = async () => { throw new Error('sin red'); };
  W.confirm = () => true; W.alert = () => {}; W.print = () => {};
  return { W, D: W.document, dom, errs };
}
// Invariantes que NUNCA deben romperse, sea cual sea la entrada
function invariantes(W) {
  const malas = [];
  const opM = W.tm(W.gOP()), clM = W.tm(W.gCL());
  if (clM <= opM) return malas;                 // horario sin sentido: no aplica
  for (let di = 0; di < 7; di++) {
    for (let m = opM; m < clM; m += 15)
      if (W.cntAt(di, m) > W.allowedAt(di, m)) { malas.push('aforo ' + W.DAYS[di] + ' ' + W.ft(m)); break; }
  }
  for (const e of W.emps) {
    const w = W.empW(e);
    if (!isFinite(w.tot)) { malas.push(e.name + ': horas no numéricas'); continue; }
    if (w.tot > e.h + (e.ot ? e.mow : 0) + 0.3) malas.push(e.name + ': ' + w.tot.toFixed(1) + 'h > contrato');
    for (let di = 0; di < 7; di++) {
      const s = W.gS(e.id, di);
      if (!s || s.t !== 'work') continue;
      const h = W.shH(s);
      if (!isFinite(h) || h < 0) malas.push(e.name + ' ' + W.DAYS[di] + ': duración inválida');
      // El máximo diario es el de la jornada NORMAL. Con horas extra
      // autorizadas se puede pasar de ahí: para eso son.
      var tope = W.topeDia ? W.topeDia(e) : e.mhd;
      if (h > tope + 0.15) malas.push(e.name + ' ' + W.DAYS[di] + ': ' + h.toFixed(1) + 'h > tope ' + tope);
      if (s.sh === 'p' && W.td(s.me, s.as_) < 2) malas.push(e.name + ' ' + W.DAYS[di] + ': pausa < 2h');
      const ini = s.sh === 'p' ? s.ms : s.s, fin = s.sh === 'p' ? s.ae : s.e;
      if (!/^\d\d:\d\d$/.test(ini) || !/^\d\d:\d\d$/.test(fin)) malas.push(e.name + ' ' + W.DAYS[di] + ': hora mal formada "' + ini + '"');
      if (W.tm(ini) < opM - 0.01) malas.push(e.name + ' ' + W.DAYS[di] + ': empieza antes de abrir');
      if (W.tm(fin) > clM + 0.01) malas.push(e.name + ' ' + W.DAYS[di] + ': acaba después de cerrar');
      if (e.ud.indexOf(di) >= 0) malas.push(e.name + ': trabaja en día no disponible');
    }
  }
  return malas;
}

console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
console.log('║  PRUEBAS DE DESARROLLADOR — intentando romper la app                 ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝');

// ══════════════════════════════════════════════════════════════════════════
sec('1. Nombres hostiles (inyección de HTML)');
{
  const { W, D, dom, errs } = app();
  const hostiles = [
    '<script>window.PWNED=1</script>',
    '"><img src=x onerror="window.PWNED2=1">',
    "O'Brien \"El Jefe\"",
    '<b>negrita</b> & <i>cursiva</i>',
    'a'.repeat(300),
    '🍣👨‍🍳 Ñoño Ürdiñö',
    '</td></tr><tr><td>fila falsa'
  ];
  W.emps = hostiles.map((n, i) => ({
    id: 500 + i, name: n, role: 'camarero', h: 20, mhd: 8, es: '09:30', ap: true, ch: 9,
    ot: false, mow: 0, or_: 0, ud: [], wd: 3, canOpen: true, canClose: true,
    clr: '#333', bg: '#ccc', baja: null, start: '', startTime: '', end: '', endTime: '', blocks: []
  }));
  W.normalizeEmps();
  let rompio = null;
  try { W.doGenerateAll(); W.renderEmps(); W.renderAlerts(); W.renderCosts(); W.renderAssess(); }
  catch (e) { rompio = e.message; }
  chk(!rompio, 'los nombres raros no rompen el renderizado', rompio);
  chk(!W.PWNED && !W.PWNED2, 'no se ejecuta código inyectado desde un nombre');
  const tabla = D.getElementById('sctbl');
  chk(tabla.querySelectorAll('tbody tr').length === W.emps.length + W.peaks.length + 1,
    'la tabla mantiene su estructura pese al nombre con </td></tr>',
    tabla.querySelectorAll('tbody tr').length + ' filas');
  // ¿el <script> del nombre se ha insertado como etiqueta real?
  const scriptsEnTabla = tabla.querySelectorAll('script').length;
  chk(scriptsEnTabla === 0, 'no se crean etiquetas <script> desde un nombre', scriptsEnTabla + '');
  const negritasRaras = tabla.querySelectorAll('td b i, td i').length;
  if (negritasRaras > 0) warn('Los nombres con HTML (<b>, <i>) se interpretan como formato en la tabla, no se muestran literales. No es peligroso, pero el nombre se ve distinto a lo escrito.');
  // el modal de renombrar debe devolver el nombre intacto
  W.renameEmp(W.emps[2].id);
  const v = D.getElementById('rn-nombre').value;
  chk(v === "O'Brien \"El Jefe\"", 'el nombre con comillas vuelve intacto al editarlo', v);
  W.closeM();
  chk(errs.length === 0, 'sin excepciones internas con nombres hostiles', errs[0]);
  dom.window.close();
}

// ══════════════════════════════════════════════════════════════════════════
sec('2. Fuzzing: 300 plantillas aleatorias');
{
  const { W, dom, errs } = app();
  let rnd = 12345;
  const rand = () => (rnd = (rnd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const pick = a => a[Math.floor(rand() * a.length)];
  let excepciones = 0, rotas = 0, peor = null;
  const HORAS = ['08:00', '09:00', '09:30', '10:00', '11:00', '12:00', '16:00', '18:00'];
  for (let iter = 0; iter < 300; iter++) {
    const n = 1 + Math.floor(rand() * 6);
    W.emps = [];
    for (let i = 0; i < n; i++) {
      const h = pick([5, 10, 12, 15, 20, 25, 30, 35, 40]);
      const ud = [];
      for (let d = 0; d < 7; d++) if (rand() < 0.12) ud.push(d);
      W.emps.push({
        id: 1000 + i, name: 'F' + iter + '_' + i, role: rand() < 0.3 ? 'encargado' : 'camarero',
        h: h, mhd: pick([4, 5, 6, 8, 9, 10, 12]), es: pick(HORAS), ap: rand() < 0.7,
        ch: 9, ot: rand() < 0.3, mow: pick([2, 4, 6]), or_: 11.25, ud: ud,
        wd: 1 + Math.floor(rand() * 7), canOpen: rand() < 0.7, canClose: rand() < 0.8,
        clr: '#333', bg: '#ccc', baja: null, start: '', startTime: '', end: '', endTime: '', blocks: []
      });
    }
    W.normalizeEmps();
    // también variamos la configuración del local
    W.document.getElementById('cfg-maxsim').value = String(1 + Math.floor(rand() * 3));
    W.document.getElementById('cfg-maxsimpk').value = String(1 + Math.floor(rand() * 4));
    W.document.getElementById('cfg-rd').value = String(1 + Math.floor(rand() * 3));
    try {
      W.sched = {}; W.genWeeks = {};
      W.doGenerateWeek(W.weekOff, iter % 4);
      const malas = invariantes(W);
      if (malas.length) { rotas++; if (!peor) peor = 'iter ' + iter + ': ' + malas[0] + ' (' + n + ' personas)'; }
    } catch (e) { excepciones++; if (!peor) peor = 'iter ' + iter + ' EXCEPCIÓN: ' + e.message; }
  }
  chk(excepciones === 0, '300 plantillas aleatorias sin una sola excepción', excepciones + ' excepciones · ' + peor);
  chk(rotas === 0, 'y sin romper ninguna regla dura', rotas + ' casos · ' + peor);
  console.log('      · 300 combinaciones de 1 a 6 personas, contratos de 5 a 40h, máximos de 1 a 3');
  chk(errs.length === 0, 'sin excepciones internas durante el fuzzing', errs[0]);
  dom.window.close();
}

// ══════════════════════════════════════════════════════════════════════════
sec('3. Valores límite y números absurdos');
{
  const { W, dom } = app();
  const casos = [
    { d: 'contrato de 1h', m: e => { e.h = 1; e.wd = 1; } },
    { d: 'contrato de 40h en 1 día', m: e => { e.h = 40; e.wd = 1; e.mhd = 24; } },
    { d: 'máximo 1h al día', m: e => { e.mhd = 1; } },
    { d: '7 días de trabajo', m: e => { e.wd = 7; } },
    { d: 'entra a las 23:59', m: e => { e.es = '23:59'; } },
    { d: 'entra a las 00:00', m: e => { e.es = '00:00'; } },
    { d: 'horas negativas', m: e => { e.h = -10; } },
    { d: 'horas gigantes', m: e => { e.h = 9999; } },
    { d: 'mhd = 0', m: e => { e.mhd = 0; } },
    { d: 'wd = 0', m: e => { e.wd = 0; } },
    { d: 'días no disponibles: los 7', m: e => { e.ud = [0,1,2,3,4,5,6]; } },
    { d: 'campos a null', m: e => { e.es = null; e.ud = null; e.mhd = null; } },
    { d: 'horas como texto', m: e => { e.h = '30'; e.mhd = '8'; } },
    { d: 'NaN en las horas', m: e => { e.h = NaN; } },
  ];
  const base = JSON.parse(JSON.stringify(W.emps));
  for (const c of casos) {
    W.emps = JSON.parse(JSON.stringify(base));
    c.m(W.emps[1]);
    W.normalizeEmps();
    let err = null, malas = [];
    try { W.sched = {}; W.genWeeks = {}; W.doGenerateWeek(W.weekOff, 0); malas = invariantes(W); }
    catch (e) { err = e.message; }
    chk(!err, 'no revienta con ' + c.d, err);
    // con datos absurdos no exigimos un horario perfecto, pero sí que no mienta
    if (!err && malas.length) {
      const graves = malas.filter(x => /no numéricas|inválida|mal formada/.test(x));
      chk(graves.length === 0, 'con ' + c.d + ' no produce datos corruptos', graves[0]);
    }
  }
  dom.window.close();
}

// ══════════════════════════════════════════════════════════════════════════
sec('4. Horarios de local imposibles');
{
  const { W, dom } = app();
  const casos = [
    ['23:00', '09:00', 'cierre antes que apertura'],
    ['09:30', '09:30', 'abre y cierra a la misma hora'],
    ['00:00', '23:59', 'abierto casi 24h'],
    ['09:30', '10:00', 'abierto solo media hora'],
    ['', '', 'horas vacías'],
    ['abc', 'def', 'texto en lugar de horas'],
  ];
  for (const [op, cl, d] of casos) {
    W.document.getElementById('cfg-op').value = op;
    W.document.getElementById('cfg-cl').value = cl;
    let err = null;
    try { W.sched = {}; W.genWeeks = {}; W.doGenerateAll(); W.renderSched(); W.renderAssess(); W.getIssues(); }
    catch (e) { err = e.message; }
    chk(!err, 'aguanta "' + d + '"', err);
  }
  W.document.getElementById('cfg-op').value = '09:30';
  W.document.getElementById('cfg-cl').value = '23:30';
  dom.window.close();
}

// ══════════════════════════════════════════════════════════════════════════
sec('5. Datos guardados corruptos');
{
  const casos = [
    ['{roto', 'JSON inválido'],
    ['null', 'null'],
    ['[]', 'un array en vez de objeto'],
    ['{"emps":"no soy lista"}', 'emps no es una lista'],
    ['{"emps":[null,null]}', 'empleados nulos'],
    ['{"emps":[{}]}', 'empleado sin ningún campo'],
    ['{"emps":[{"id":1,"name":"X"}],"peaks":"mal"}', 'franjas corruptas'],
    ['{"emps":[{"id":1,"name":"X","h":20}],"festOn":123}', 'festivos corruptos'],
    ['{"settings":{"op":null,"cl":null}}', 'configuración nula'],
    ['"soy una cadena"', 'una cadena suelta'],
  ];
  for (const [raw, d] of casos) {
    const { W, dom } = app();
    W.localStorage.setItem('tpVer', '18');
    W.localStorage.setItem('tpScheduler', raw);
    let err = null;
    const logReal = W.console.log; W.console.log = () => {};
    try { W.loadConfig(); W.normalizeEmps(); W.doGenerateAll(); W.renderSched(); }
    catch (e) { err = e.message; }
    W.console.log = logReal;
    chk(!err, 'sobrevive a datos guardados con ' + d, err);
    chk(Array.isArray(W.emps), 'y el equipo sigue siendo una lista válida tras ' + d);
    dom.window.close();
  }
}

// ══════════════════════════════════════════════════════════════════════════
sec('6. Datos de la nube manipulados');
{
  const { W, dom } = app();
  const casos = [
    [null, 'null'], [undefined, 'undefined'], ['texto', 'texto'], [123, 'un número'],
    [{}, 'objeto vacío'], [{ version: 3, emps: null }, 'emps null'],
    [{ version: 3, emps: [{ id: 1 }] }, 'empleado incompleto'],
    [{ version: 3, emps: [], peaks: null, fests: null }, 'todo vacío'],
    [{ version: 99, emps: [{ id: 1, name: 'Futuro', h: 20 }] }, 'versión futura'],
    [{ version: 1, emps: [{ id: 9, name: 'Viejo', h: 20 }] }, 'versión antigua'],
  ];
  for (const [cfg, d] of casos) {
    let err = null;
    try { W.applyCloudData(cfg); } catch (e) { err = e.message; }
    chk(!err, 'la nube con ' + d + ' no rompe la app', err);
    chk(W.cloudApplying === false, 'y deja limpia la bandera de sincronización tras ' + d);
  }
  chk(W.emps.length > 0, 'nunca se queda sin equipo por culpa de la nube', W.emps.length + '');
  dom.window.close();
}

// ══════════════════════════════════════════════════════════════════════════
sec('7. Secuencias aleatorias de acciones (mono con teclado)');
{
  const { W, D, dom, errs } = app();
  let rnd = 777;
  const rand = () => (rnd = (rnd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  W.doGenerateAll();
  const acciones = [
    () => W.doGenerateAll(),
    () => W.chWk(rand() < 0.5 ? 1 : -1),
    () => { const e = W.emps[Math.floor(rand() * W.emps.length)]; if (e) W.qA(e.id, Math.floor(rand() * 7), ['ap','td','no'][Math.floor(rand()*3)]); },
    () => { const e = W.emps[Math.floor(rand() * W.emps.length)]; if (e) W.sS(e.id, Math.floor(rand() * 7), W.mkOff()); },
    () => W.doUndo(),
    () => W.doRedo(),
    () => W.togPkD(W.peaks[Math.floor(rand() * W.peaks.length)].id, Math.floor(rand() * 7)),
    () => { W.document.getElementById('cfg-maxsim').value = String(1 + Math.floor(rand() * 3)); W.doSaveAndRegenerate(); },
    () => W.renderSched(), () => W.renderAssess(), () => W.renderCosts(), () => W.renderAlerts(),
    () => W.saveConfig(),
    () => { W.marcarCambio('mono'); const e = W.emps[Math.floor(rand() * W.emps.length)]; if (e) e.h = [10,20,30,40][Math.floor(rand()*4)]; },
    () => W.getIssues(),
    () => W.doExcel(),
  ];
  let excepciones = 0, primera = null;
  for (let i = 0; i < 600; i++) {
    try { acciones[Math.floor(rand() * acciones.length)](); }
    catch (e) { excepciones++; if (!primera) primera = e.message; }
  }
  chk(excepciones === 0, '600 acciones al azar sin una excepción', excepciones + ' · ' + primera);
  chk(Array.isArray(W.emps) && W.emps.length > 0, 'el equipo sigue intacto tras el vapuleo', W.emps.length + '');
  chk(typeof W.weekOff === 'number' && isFinite(W.weekOff), 'la semana activa sigue siendo válida', String(W.weekOff));
  chk(W._undo.length <= 25 && W._redo.length <= 25, 'el historial no se desborda', W._undo.length + '/' + W._redo.length);
  let objetos = 0; for (const k in W.sched) objetos++;
  chk(objetos <= W.emps.length * 7 * 20, 'la memoria del horario no crece sin control', objetos + ' turnos guardados');
  chk(errs.length === 0, 'sin excepciones internas durante el vapuleo', errs[0]);
  dom.window.close();
}

// ══════════════════════════════════════════════════════════════════════════
sec('8. Deshacer/rehacer bajo estrés');
{
  const { W, dom } = app();
  W.doGenerateAll();
  const foto = () => W.emps.map(e => e.name + e.h + [0,1,2,3,4,5,6].map(d => JSON.stringify(W.gS(e.id, d))).join('')).join('|');
  const inicial = foto();
  // 40 cambios, 40 deshacer: debe volver exactamente al punto de partida
  for (let i = 0; i < 40; i++) {
    W.marcarCambio('cambio ' + i);
    W.sS(W.emps[i % W.emps.length].id, i % 7, W.mkOff());
  }
  for (let i = 0; i < 40; i++) W.doUndo();
  chk(W._undo.length === 0, 'el historial se vacía al deshacerlo todo', W._undo.length + '');
  // solo se guardan 25, así que no puede volver al inicio: lo importante es que no rompa
  chk(typeof foto() === 'string' && W.emps.length > 0, 'tras deshacerlo todo el estado sigue siendo coherente');
  // deshacer/rehacer alternado
  let err = null;
  try { for (let i = 0; i < 100; i++) { i % 2 ? W.doRedo() : W.doUndo(); } } catch (e) { err = e.message; }
  chk(!err, '100 deshacer/rehacer alternados sin romperse', err);
  // ciclo corto exacto
  W.doGenerateAll();
  const antes = foto();
  W.marcarCambio('uno');
  W.sS(W.emps[0].id, 0, W.mkOff());
  W.doUndo();
  chk(foto() === antes, 'un ciclo cambiar→deshacer devuelve el estado EXACTO');
  W.doRedo(); W.doUndo();
  chk(foto() === antes, 'y rehacer→deshacer también');
  dom.window.close();
}

// ══════════════════════════════════════════════════════════════════════════
sec('9. Determinismo y estabilidad');
{
  const { W, dom } = app();
  const foto = () => W.emps.map(e => [0,1,2,3,4,5,6].map(d => JSON.stringify(W.gS(e.id, d))).join('')).join('|');
  W.sched = {}; W.genWeeks = {}; W.doGenerateWeek(W.weekOff, 1);
  const a = foto();
  for (let i = 0; i < 10; i++) { W.sched = {}; W.genWeeks = {}; W.doGenerateWeek(W.weekOff, 1); }
  chk(foto() === a, 'generar 10 veces la misma semana da siempre lo mismo');
  // el orden del equipo no debe alterar el resultado de forma caótica
  W.sched = {}; W.genWeeks = {}; W.doGenerateAll();
  const claves1 = Object.keys(W.sched).length;
  for (let i = 0; i < 5; i++) W.doGenerateAll();
  chk(Object.keys(W.sched).length === claves1, 'regenerar no acumula turnos huérfanos', claves1 + ' → ' + Object.keys(W.sched).length);
  // weekOff siempre vuelve a su sitio
  const wo = W.weekOff;
  for (let i = 0; i < 20; i++) W.doGenerateWeek(W.weekOff + (i % 7), i % 4);
  chk(W.weekOff === wo, 'la semana activa nunca se descoloca', W.weekOff + ' vs ' + wo);
  dom.window.close();
}

// ══════════════════════════════════════════════════════════════════════════
sec('10. Fechas difíciles');
{
  const { W, dom } = app();
  const hitos = [
    ['2026-12-28', 'última semana del año'], ['2027-01-01', 'primer día del año'],
    ['2028-02-29', 'día bisiesto'], ['2027-03-28', 'cambio a horario de verano'],
    ['2027-10-31', 'cambio a horario de invierno'], ['2030-07-15', 'cuatro años vista'],
  ];
  const base = W.weekOff;
  for (const [fecha, d] of hitos) {
    const obj = new Date(fecha + 'T12:00:00');
    let encontrada = false;
    for (let off = -300; off <= 300 && !encontrada; off++) {
      W.weekOff = base + off; W._wdc = null;
      const dias = W.getWD();
      if (W.dStr(dias[0]) <= W.dStr(obj) && W.dStr(obj) <= W.dStr(dias[6])) {
        encontrada = true;
        const unicas = new Set(dias.map(W.dStr));
        chk(unicas.size === 7, 'la semana del ' + d + ' tiene 7 fechas distintas', unicas.size + '');
        chk(dias[0].getDay() === 1 && dias[6].getDay() === 0, 'y va de lunes a domingo (' + d + ')');
        let err = null;
        try { W.sched = {}; W.genWeeks = {}; W.doGenerateWeek(W.weekOff, 0); } catch (e) { err = e.message; }
        chk(!err, 'se puede generar la semana del ' + d, err);
      }
    }
    if (!encontrada) chk(false, 'se localiza la semana del ' + d);
  }
  W.weekOff = base; W._wdc = null;
  dom.window.close();
}

// ══════════════════════════════════════════════════════════════════════════
sec('11. Rendimiento');
{
  const { W, dom } = app();
  // equipo grande
  W.emps = [];
  for (let i = 0; i < 20; i++) W.emps.push({
    id: 2000 + i, name: 'Emp' + i, role: i === 0 ? 'encargado' : 'camarero', h: 20 + (i % 3) * 10,
    mhd: 9, es: '09:30', ap: true, ch: 9, ot: false, mow: 0, or_: 0, ud: [], wd: 4,
    canOpen: i % 2 === 0, canClose: true, clr: '#333', bg: '#ccc', baja: null,
    start: '', startTime: '', end: '', endTime: '', blocks: []
  });
  W.normalizeEmps();
  let t0 = Date.now();
  W.doGenerateAll();
  const tGen = Date.now() - t0;
  chk(tGen < 15000, 'genera 5 semanas con 20 personas en un tiempo razonable', tGen + ' ms');
  console.log('      · 20 personas × 5 semanas: ' + tGen + ' ms');
  chk(invariantes(W).length === 0, 'y el resultado con 20 personas cumple las reglas', invariantes(W)[0]);
  t0 = Date.now();
  for (let i = 0; i < 50; i++) W.renderSched();
  const tRender = Date.now() - t0;
  chk(tRender < 10000, '50 repintados de la tabla son rápidos', tRender + ' ms');
  console.log('      · 50 repintados: ' + tRender + ' ms');
  // muchas semanas navegadas
  t0 = Date.now();
  for (let i = 0; i < 100; i++) { W.weekOff++; W._wdc = null; W.renderSched(); }
  chk(Date.now() - t0 < 15000, 'navegar 100 semanas seguidas no se atasca', (Date.now() - t0) + ' ms');
  // tamaño de lo guardado
  W.saveConfig();
  const bytes = (W.localStorage.getItem('tpScheduler') || '').length;
  chk(bytes < 200000, 'lo guardado cabe de sobra en el navegador', (bytes / 1024).toFixed(0) + ' KB con 20 personas');
  console.log('      · guardado: ' + (bytes / 1024).toFixed(0) + ' KB tras navegar 100 semanas');
  // Navegar por el calendario no debe hinchar lo guardado: solo se guardan las
  // semanas generadas, no las que se han mirado de pasada.
  const g = JSON.parse(W.localStorage.getItem('tpScheduler'));
  const semanasGuardadas = new Set(Object.keys(g.sched).map(k => k.split('|')[1])).size;
  chk(semanasGuardadas <= 35, 'solo se guardan los días de las semanas generadas', semanasGuardadas + ' días distintos');
  chk(Object.values(g.sched).every(x => x.t !== 'off'), 'y los días libres no se guardan');
  console.log('      · guardado: ' + (bytes / 1024).toFixed(0) + ' KB');
  dom.window.close();
}

// ══════════════════════════════════════════════════════════════════════════
sec('12. Coherencia entre lo que se ve y lo que hay');
{
  const { W, D, dom } = app();
  W.doGenerateAll();
  // la tabla debe coincidir celda a celda con los datos
  const filas = D.getElementById('sctbl').querySelectorAll('tbody tr');
  let desajustes = 0;
  W.emps.forEach((e, i) => {
    const tds = filas[i].querySelectorAll('td');
    for (let d = 0; d < 7; d++) {
      const s = W.gS(e.id, d), txt = tds[d + 1].textContent;
      if (s.t === 'work') { const esperado = s.sh === 'p' ? s.ms : s.s; if (txt.indexOf(esperado) < 0) desajustes++; }
      else if (/\d\d:\d\d/.test(txt)) desajustes++;
    }
  });
  chk(desajustes === 0, 'cada celda de la tabla refleja el turno real', desajustes + ' desajustes');
  // las horas del pie coinciden con empW
  let horasMal = 0;
  W.emps.forEach((e, i) => {
    const t = filas[i].querySelectorAll('td')[0].textContent;
    if (t.indexOf(W.empW(e).tot.toFixed(1) + '/' + e.h) < 0) horasMal++;
  });
  chk(horasMal === 0, 'el contador de horas de cada fila es correcto', horasMal + '');
  // el Excel coincide con la pantalla
  let salida = null; XLSX.writeFile = (wb) => { salida = wb; };
  W.doExcel();
  const aoa = XLSX.utils.sheet_to_json(salida.Sheets[salida.SheetNames[0]], { header: 1, defval: '' });
  let excelMal = 0;
  W.emps.forEach((e, i) => {
    const f1 = aoa[4 + i * 2];
    if (Math.abs(f1[2] - W.empW(e).tot) > 0.05) excelMal++;
    for (let d = 0; d < 7; d++) {
      const s = W.gS(e.id, d), c = 3 + d * 2;
      if (s.t === 'work' && s.sh === 'c' && f1[c] !== s.s) excelMal++;
    }
  });
  chk(excelMal === 0, 'el Excel coincide con lo que se ve en pantalla', excelMal + ' diferencias');
  // los totales de cobertura de la tabla coinciden con cntAt
  const filaCob = filas[filas.length - 1].querySelectorAll('td');
  let cobMal = 0;
  for (let d = 0; d < 7; d++) {
    const pct = parseInt(filaCob[d + 1].textContent);
    if (Math.abs(pct - W.covPct(d)) > 1) cobMal++;
  }
  chk(cobMal === 0, 'la fila de cobertura coincide con el cálculo', cobMal + '');
  dom.window.close();
}

// ══════════════════════════════════════════════════════════════════════════
console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
console.log('║  RESULTADO                                                           ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝\n');
if (!fallos.length) console.log('  ✅  ' + ok + ' comprobaciones superadas. No he conseguido romperla.\n');
else { console.log('  ❌  ' + fallos.length + ' fallo(s) de ' + (ok + fallos.length) + ':\n'); fallos.forEach(f => console.log('      ✗ ' + f)); console.log(''); }
if (avisos.length) { console.log('  ⚠️  Observaciones (no son fallos):\n'); avisos.forEach(a => console.log('      · ' + a)); console.log(''); }
process.exit(fallos.length ? 1 : 0);
