/* ═══════════════════════════════════════════════════════════════════════════
   CERTIFICACIÓN — Tasty Poke Scheduler
   ───────────────────────────────────────────────────────────────────────────
   Repasa uno por uno los 38 fallos encontrados durante la revisión y comprueba
   que ninguno ha vuelto. Cada caso reproduce la situación exacta que lo
   destapó, así que si algo se rompe otra vez, saltará aquí con nombre.

   Requiere una vez:   npm install jsdom xlsx-js-style
   Luego:              node certificacion.js

   Las cuatro herramientas, por orden de uso:
     pruebas.js        → lo normal funciona           (rápida, úsala siempre)
     certificacion.js  → los fallos viejos no vuelven
     dev.js            → lo anormal no la tumba       (fuzzing, datos corruptos)
     configs.js        → ¿aguantará esta plantilla?   (antes de contratar)
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const XLSX = require('xlsx-js-style');
const path = require('path');
const ARCHIVO = path.join(__dirname, 'TastyPoke_Scheduler.html');
const htmlOriginal = fs.readFileSync(ARCHIVO, 'utf8');
const html = htmlOriginal.replace(/<script src="https:\/\/cdn[^"]*"><\/script>/, '');

let n = 0; const fallos = [];
function caso(num, titulo, fn) {
  n++;
  const { W, D, dom, errs } = nueva();
  let err = null, detalle = null;
  try { detalle = fn(W, D); } catch (e) { err = e.message; }
  dom.window.close();
  const mal = err || detalle || (errs.length ? 'excepción interna: ' + errs[0] : null);
  if (mal) { fallos.push('#' + num + ' ' + titulo + ' → ' + mal); console.log('  ✗ ' + String(num).padStart(2) + '. ' + titulo + '  → ' + mal); }
  else console.log('  ✓ ' + String(num).padStart(2) + '. ' + titulo);
}
function nueva() {
  const vc = new VirtualConsole(); const errs = [];
  vc.on('jsdomError', e => errs.push(String(e.message || e)));
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc, url: 'https://local.test/' });
  const W = dom.window;
  W.XLSX = XLSX; XLSX.writeFile = () => {};
  W.fetch = async () => { throw new Error('sin red'); };
  W.confirm = () => true; W.alert = () => {}; W.print = () => {};
  return { W, D: W.document, dom, errs };
}
const persona = (id, nombre, h, o) => Object.assign({
  id: id, name: nombre, role: 'camarero', h: h, mhd: 9, es: '09:30', ap: true, ch: 9,
  ot: false, mow: 0, or_: 11.25, ud: [], wd: h >= 40 ? 5 : h >= 30 ? 4 : 3,
  canOpen: true, canClose: true, clr: '#333', bg: '#ccc', baja: null,
  start: '', startTime: '', end: '', endTime: '', blocks: []
}, o || {});
function excesos(W) {
  const r = [];
  for (let d = 0; d < 7; d++)
    for (let m = W.tm(W.gOP()); m < W.tm(W.gCL()); m += 10) {
      const c = W.cntAt(d, m), l = W.allowedAt(d, m);
      if (c > l) { r.push(W.DIAS_NOMBRE[d] + ' ' + W.ft(m) + ': ' + c + 'p (máx ' + l + ')'); break; }
    }
  return r;
}
function huecos(W) {
  const r = [];
  for (let d = 0; d < 7; d++)
    for (const g of W.getCovSegs(d)) if (g.cnt === 0 && !g.inPause) { r.push(W.DIAS_NOMBRE[d] + ' ' + W.ft(g.s)); break; }
  return r;
}

console.log('\n╔═══════════════════════════════════════════════════════════════════════╗');
console.log('║  CERTIFICACIÓN FINAL — ¿siguen arreglados todos los fallos?          ║');
console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');
console.log('  FECHAS Y CALENDARIO');

caso(1, 'Las fechas usan el día local, no UTC (festivos no se desplazan)', W => {
  const d = W.getWD()[0];
  const local = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  if (W.dStr(d) !== local) return 'dStr=' + W.dStr(d) + ' vs local=' + local;
  // y el festivo cae en su día
  const base = W.weekOff;
  for (let off = -60; off < 60; off++) {
    W.weekOff = base + off; W._wdc = null;
    const dias = W.getWD();
    for (let i = 0; i < 7; i++) if (W.dStr(dias[i]) === '2026-07-27') {
      if (dias[i].getDay() !== 1) return 'Les Santes (lunes 27 jul) cae en día ' + dias[i].getDay();
      return null;
    }
  }
  return null;
});

caso(2, 'Las semanas van de lunes a domingo incluso a 4 años vista', W => {
  const base = W.weekOff;
  for (const off of [-200, -1, 0, 1, 52, 200]) {
    W.weekOff = base + off; W._wdc = null;
    const d = W.getWD();
    if (d[0].getDay() !== 1 || d[6].getDay() !== 0) return 'semana ' + off + ' descolocada';
    if (new Set(d.map(W.dStr)).size !== 7) return 'semana ' + off + ' repite fechas';
  }
  return null;
});

console.log('\n  AFORO — la regla que no se puede romper');

caso(3, 'El máximo se respeta con 3, 5, 7 y 14 personas', W => {
  for (const total of [3, 5, 7, 14]) {
    W.emps = [];
    for (let i = 0; i < total; i++) W.emps.push(persona(600 + i, 'P' + i, 20 + (i % 3) * 10, { canOpen: i % 2 === 0, wd: 4 }));
    W.normalizeEmps(); W.doGenerateAll();
    const e = excesos(W);
    if (e.length) return 'con ' + total + ' personas: ' + e[0];
  }
  return null;
});

caso(4, 'Se respeta con el máximo puesto en 1, 2, 3 y 4', W => {
  for (const mx of [1, 2, 3, 4]) {
    W.document.getElementById('cfg-maxsim').value = String(mx);
    W.document.getElementById('cfg-maxsimpk').value = String(mx + 1);
    W.doGenerateAll();
    const e = excesos(W);
    if (e.length) return 'con máximo ' + mx + ': ' + e[0];
  }
  return null;
});

caso(5, 'Se respeta con otros horarios del local', W => {
  for (const [op, cl] of [['08:00', '22:00'], ['11:00', '23:59'], ['10:00', '20:00'], ['12:00', '23:00']]) {
    W.document.getElementById('cfg-op').value = op;
    W.document.getElementById('cfg-cl').value = cl;
    W.emps.forEach(e => { e.es = op; });
    W.doGenerateAll();
    const e = excesos(W);
    if (e.length) return 'con ' + op + '-' + cl + ': ' + e[0];
  }
  return null;
});

caso(6, 'Ni las horas extra ni los partidos se saltan el máximo', W => {
  W.emps.forEach(e => { e.ot = true; e.mow = 6; e.ap = true; });
  W.doGenerateAll();
  const e = excesos(W);
  return e.length ? e[0] : null;
});

caso(7, 'Con exceso grande retira sesiones en vez de desplazar el problema', W => {
  W.emps = [];
  for (let i = 0; i < 16; i++) W.emps.push(persona(700 + i, 'P' + i, 30, { canOpen: i % 2 === 0, wd: 4 }));
  W.normalizeEmps();
  const t0 = Date.now(); W.doGenerateAll(); const t = Date.now() - t0;
  const e = excesos(W);
  if (e.length) return e[0];
  if (t > 30000) return 'tardó ' + t + ' ms';
  return null;
});

console.log('\n  HORAS DE CONTRATO');

caso(8, 'Nadie hace más horas de las contratadas, aunque trabaje más días', W => {
  W.emps = [persona(1, 'Sola', 40, { role: 'encargado', wd: 5 })];
  W.normalizeEmps(); W.doGenerateAll();
  const w = W.empW(W.emps[0]);
  if (w.tot > 40.3) return 'una sola persona hace ' + w.tot.toFixed(1) + 'h de 40h';
  return null;
});

caso(9, 'Si solo una persona puede abrir, tampoco se le hacen horas de más', W => {
  W.emps.forEach((e, i) => { e.canOpen = i === 0; e.es = i === 0 ? '09:30' : '11:00'; });
  W.doGenerateAll();
  const malos = W.emps.filter(e => W.empW(e).tot > e.h + (e.ot ? e.mow : 0) + 0.3);
  return malos.length ? malos[0].name + ' hace ' + W.empW(malos[0]).tot.toFixed(1) + 'h de ' + malos[0].h : null;
});

caso(10, 'Un turno partido nunca supera las horas del día', W => {
  W.emps.forEach(e => { e.h = 10; e.wd = 5; e.mhd = 8; e.ap = true; });
  W.normalizeEmps(); W.doGenerateAll();
  for (const e of W.emps) for (let d = 0; d < 7; d++) {
    const s = W.gS(e.id, d);
    if (s && s.t === 'work' && W.shH(s) > W.dailyH(e) + 0.1)
      return e.name + ' ' + W.DAYS[d] + ': ' + W.shH(s).toFixed(1) + 'h (le tocan ' + W.dailyH(e).toFixed(1) + 'h)';
  }
  return null;
});

caso(11, 'Nunca se supera el máximo diario de nadie', W => {
  W.emps = [persona(1, 'A', 30, { mhd: 4, wd: 7 }), persona(2, 'B', 20, { mhd: 5, wd: 4 }),
            persona(3, 'C', 40, { mhd: 6, wd: 7 }), persona(4, 'D', 15, { mhd: 4, wd: 4 })];
  W.normalizeEmps(); W.doGenerateAll();
  for (const e of W.emps) for (let d = 0; d < 7; d++) {
    const s = W.gS(e.id, d);
    if (s && s.t === 'work' && W.shH(s) > e.mhd + 0.15)
      return e.name + ' ' + W.DAYS[d] + ': ' + W.shH(s).toFixed(1) + 'h > máx ' + e.mhd;
  }
  return null;
});

console.log('\n  COBERTURA');

caso(12, 'Sin nadie de tarde, junta un partido para tapar el hueco', W => {
  // dos personas que abren y dos de mediodía: antes, ambas de mediodía hacían
  // partido y nadie cubría la franja previa a las cenas
  W.emps = [persona(1, 'Jefa', 40, { role: 'encargado', wd: 5 }), persona(2, 'Segunda', 30, { wd: 4 }),
            persona(3, 'Media1', 25, { es: '11:00', canOpen: false, wd: 4 }),
            persona(4, 'Media2', 20, { es: '11:00', canOpen: false, wd: 3 })];
  W.normalizeEmps(); W.doGenerateAll();
  const h = huecos(W);
  return h.length ? h[0] : null;
});

caso(13, 'El descanso no se da si con quien queda no se cubre el día', W => {
  // alguien sin domingos obliga a que el resto sume horas ese día
  W.emps[1].ud = [6];
  W.doGenerateAll();
  const h = huecos(W);
  return h.length ? h[0] : null;
});

caso(14, 'El equipo real de 4 personas sale sin un solo problema', W => {
  W.doGenerateAll();
  const e = excesos(W), h = huecos(W);
  if (e.length) return e[0];
  if (h.length) return h[0];
  const cortos = W.emps.filter(x => W.empW(x).tot < x.h - 0.5);
  if (cortos.length) return cortos[0].name + ' solo llega a ' + W.empW(cortos[0]).tot.toFixed(1) + 'h';
  return null;
});

console.log('\n  DISPONIBILIDAD DEL EQUIPO');

caso(15, 'Días no disponibles, bajas, altas y fechas de salida se respetan', W => {
  const f = W.getWD();
  W.emps[0].ud = [0, 3];
  W.emps[1].baja = { from: W.dStr(f[1]), to: W.dStr(f[2]) };
  W.emps[2].start = W.dStr(f[4]);
  W.emps[3].end = W.dStr(f[2]);
  W.doGenerateAll();
  for (let d = 0; d < 7; d++) {
    if (W.emps[0].ud.indexOf(d) >= 0 && W.gS(W.emps[0].id, d).t === 'work') return 'trabaja en su día libre';
    if (d >= 1 && d <= 2 && W.gS(W.emps[1].id, d).t === 'work') return 'trabaja estando de baja';
    if (d < 4 && W.gS(W.emps[2].id, d).t === 'work') return 'trabaja antes de incorporarse';
    if (d > 2 && W.gS(W.emps[3].id, d).t === 'work') return 'trabaja después de su último día';
  }
  return null;
});

caso(16, 'Un bloqueo de horas concretas no se pisa, y caduca solo', W => {
  const f = W.getWD();
  W.emps[0].blocks = [{ d: W.dStr(f[2]), a: '09:00', b: '14:00' }];
  W.doGenerateAll();
  for (const s of W.shSegs(W.gS(W.emps[0].id, 2)))
    if (s.a < W.tm('14:00') && s.b > W.tm('09:00')) return 'le han puesto turno dentro del bloqueo';
  const ayer = new Date(); ayer.setDate(ayer.getDate() - 1);
  W.emps[0].blocks.push({ d: W.dStr(ayer), a: '', b: '' });
  W.purgeBlocks();
  if (W.emps[0].blocks.some(b => b.d === W.dStr(ayer))) return 'el bloqueo de ayer no se borró solo';
  return null;
});

caso(17, 'La hora de entrada del primer día y la de salida del último se cumplen', W => {
  const f = W.getWD();
  W.emps[0].start = W.dStr(f[2]); W.emps[0].startTime = '18:00';
  W.emps[1].end = W.dStr(f[4]); W.emps[1].endTime = '15:00';
  W.doGenerateAll();
  for (const s of W.shSegs(W.gS(W.emps[0].id, 2))) if (s.a < W.tm('18:00')) return 'entra antes de las 18:00 su primer día';
  for (const s of W.shSegs(W.gS(W.emps[1].id, 4))) if (s.b > W.tm('15:00')) return 'se queda después de las 15:00 su último día';
  return null;
});

console.log('\n  DATOS Y SEGURIDAD');

caso(18, 'Un nombre con HTML no rompe la tabla ni inyecta etiquetas', (W, D) => {
  W.emps[0].name = '</td></tr><tr><td>falsa';
  W.emps[1].name = '<script>W.PWNED=1</script>';
  W.emps[2].name = 'O\'Brien "Jefe" & Cía';
  W.doGenerateAll(); W.renderEmps(); W.renderCosts(); W.renderAlerts();
  const t = D.getElementById('sctbl');
  if (t.querySelectorAll('script').length) return 'se creó una etiqueta <script>';
  if (t.querySelectorAll('tbody tr').length !== W.emps.length + W.peaks.length + 1) return 'la tabla se descuadró';
  if (W.PWNED) return 'se ejecutó código inyectado';
  return null;
});

caso(19, 'Datos guardados corruptos no impiden abrir la app', W => {
  const basura = ['{roto', 'null', '[]', '{"emps":"texto"}', '{"emps":[null]}', '{"emps":[{}]}',
                  '{"emps":[{"id":1,"name":"X"}],"peaks":"mal"}', '{"emps":[{"id":1}],"festOn":9}'];
  const logReal = W.console.log; W.console.log = () => {};
  for (const raw of basura) {
    W.localStorage.setItem('tpVer', '18');
    W.localStorage.setItem('tpScheduler', raw);
    try { W.loadConfig(); W.normalizeEmps(); W.normalizeResto(); W.doGenerateAll(); }
    catch (e) { W.console.log = logReal; return 'revienta con ' + raw.slice(0, 22) + ': ' + e.message; }
    if (!Array.isArray(W.emps)) { W.console.log = logReal; return 'el equipo deja de ser una lista con ' + raw.slice(0, 22); }
  }
  W.console.log = logReal;
  return null;
});

caso(20, 'Datos de la nube manipulados tampoco la tumban', W => {
  for (const cfg of [null, 'texto', 123, {}, { version: 3, emps: null }, { version: 3, emps: [{ id: 1 }] },
                     { version: 1, emps: [{ id: 9, name: 'Viejo', h: 20 }] }]) {
    try { W.applyCloudData(cfg); } catch (e) { return 'revienta con ' + JSON.stringify(cfg).slice(0, 30) + ': ' + e.message; }
    if (W.cloudApplying !== false) return 'deja colgada la bandera de sincronización';
  }
  if (!W.emps.length) return 'se quedó sin equipo';
  return null;
});

caso(21, 'Una ficha con valores imposibles se sanea sola', W => {
  W.emps[1].h = -5; W.emps[1].mhd = 0; W.emps[1].wd = 99; W.emps[1].es = 'nunca';
  W.emps[1].ud = null; W.emps[1].blocks = 'no'; W.emps[1].baja = 'mal';
  W.normalizeEmps();
  const e = W.emps[1];
  if (!(e.h > 0 && e.mhd > 0 && e.wd <= 7 && /^\d\d:\d\d$/.test(e.es) && Array.isArray(e.ud) && Array.isArray(e.blocks) && e.baja === null))
    return 'no quedó saneada: ' + JSON.stringify({ h: e.h, mhd: e.mhd, wd: e.wd, es: e.es });
  W.doGenerateAll();
  return null;
});

console.log('\n  FUNCIONES DE LA APP');

caso(22, 'Dos eventos el mismo día tienen interruptores independientes', W => {
  W.fests = [{ date: '2026-05-01', name: 'Festivo', type: 'nacional' }, { date: '2026-05-01', name: 'Partido', type: 'futbol' }];
  W.festOn = {}; W.migrateFestOn();
  W.togFest(1, false);
  if (!W.festActive(W.fests[0])) return 'apagar uno apagó el otro';
  if (W.festActive(W.fests[1])) return 'no se apagó el que tocaba';
  return null;
});

caso(23, 'Cambiar una franja de alta demanda guarda y regenera', W => {
  W.doGenerateAll();
  const dias = W.peaks[1].days.slice();
  W.togPkD(W.peaks[1].id, 3);
  const guardado = JSON.parse(W.localStorage.getItem('tpScheduler'));
  if (guardado.peaks[1].days.length === dias.length) return 'el cambio no se guardó';
  return null;
});

caso(24, 'Los turnos partidos siguen a la franja de cenas si la mueves', W => {
  W.peaks[1].start = '19:00'; W.peaks[1].end = '22:00';
  W.doGenerateAll();
  let vistos = 0, malos = 0;
  for (const e of W.emps) for (let d = 0; d < 7; d++) {
    const s = W.gS(e.id, d);
    if (s && s.sh === 'p') { vistos++; if (s.as_ !== '19:00') malos++; }
  }
  return (vistos && malos === vistos) ? 'los ' + vistos + ' partidos siguen en la hora antigua' : null;
});

caso(25, 'Guardar un turno ilegal avisa y respeta el "cancelar"', (W, D) => {
  W.doGenerateAll();
  const p = W.shiftProblems(W.emps[0], { t: 'work', sh: 'p', ms: '11:00', me: '14:00', as_: '15:00', ae: '19:00' });
  if (!p.length) return 'no detecta una pausa de partido de 1h';
  const antes = JSON.stringify(W.gS(W.emps[0].id, 3));
  W.confirm = () => false;
  W.openCell(W.emps[0].id, 3);
  D.getElementById('mtype').value = 'work';
  D.getElementById('ms').value = '09:30'; D.getElementById('me').value = '23:30';
  W.saveCell(W.emps[0].id, 3);
  if (JSON.stringify(W.gS(W.emps[0].id, 3)) !== antes) return 'guardó pese a cancelar';
  return null;
});

caso(26, 'Deshacer devuelve el estado exacto y recupera a un empleado borrado', W => {
  W.doGenerateAll();
  const foto = () => W.emps.map(e => e.name + e.h + [0,1,2,3,4,5,6].map(d => JSON.stringify(W.gS(e.id, d))).join('')).join('|');
  const antes = foto();
  W.marcarCambio('prueba');
  W.sS(W.emps[0].id, 1, W.mkOff());
  W.doUndo();
  if (foto() !== antes) return 'no restaura el estado exacto';
  const nombre = W.emps[2].name, total = W.emps.length;
  W.delEmp(W.emps[2].id);
  W.doUndo();
  if (W.emps.length !== total || !W.emps.some(e => e.name === nombre)) return 'no recupera al empleado borrado';
  return null;
});

caso(27, 'La sincronización no entra en bucle al descargar', W => {
  let subidas = 0;
  const real = W.cloudPush;
  W.cloudPush = () => { subidas++; };
  W.cloudApplying = true; W.saveConfig();
  if (subidas) { W.cloudPush = real; return 'guardar durante la descarga vuelve a subir'; }
  W.cloudApplying = false; W.saveConfig();
  W.cloudPush = real;
  if (subidas !== 1) return 'guardar normalmente no sube';
  return null;
});

caso(28, 'La tabla de costes cabe en un móvil (va dentro de un contenedor con scroll)', W => {
  const src = htmlOriginal.slice(htmlOriginal.indexOf('function renderCosts'), htmlOriginal.indexOf('function renderCosts') + 700);
  if (src.indexOf('<div class="ov">') < 0) return 'la tabla de costes no tiene scroll horizontal';
  return null;
});

caso(29, 'Lo que se ve en pantalla, el Excel y los datos dicen lo mismo', (W, D) => {
  W.doGenerateAll();
  const filas = D.getElementById('sctbl').querySelectorAll('tbody tr');
  for (let i = 0; i < W.emps.length; i++) {
    const tds = filas[i].querySelectorAll('td');
    for (let d = 0; d < 7; d++) {
      const s = W.gS(W.emps[i].id, d), txt = tds[d + 1].textContent;
      if (s.t === 'work' && txt.indexOf(s.sh === 'p' ? s.ms : s.s) < 0) return 'la tabla no coincide con los datos';
      if (s.t !== 'work' && /\d\d:\d\d/.test(txt)) return 'la tabla muestra un turno donde no lo hay';
    }
  }
  let libro = null; XLSX.writeFile = wb => { libro = wb; };
  W.doExcel();
  const aoa = XLSX.utils.sheet_to_json(libro.Sheets[libro.SheetNames[0]], { header: 1, defval: '' });
  for (let i = 0; i < W.emps.length; i++) {
    if (Math.abs(aoa[4 + i * 2][2] - W.empW(W.emps[i]).tot) > 0.05) return 'el Excel no cuadra con las horas';
  }
  return null;
});

caso(30, 'El lector de capturas reconstruye un horario y rechaza imágenes inválidas', W => {
  W.doGenerateAll();
  const DIAS = ['LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO','DOMINGO'];
  const COLX = [200,320,440,560,680,800,920];
  const caja = (x, y, t) => ({ text: t, bbox: { x0: x - 22, x1: x + 22, y0: y - 8, y1: y + 8 } });
  const ws = DIAS.map((d, i) => caja(COLX[i], 100, d));
  W.emps.forEach((e, i) => {
    const y = 160 + i * 60;
    ws.push(caja(60, y, e.name));
    for (let d = 0; d < 7; d++) {
      const s = W.gS(e.id, d);
      if (!s || s.t !== 'work') continue;
      if (s.sh === 'p') { ws.push(caja(COLX[d] - 28, y, s.ms)); ws.push(caja(COLX[d] + 28, y, s.me)); ws.push(caja(COLX[d] - 28, y + 22, s.as_)); ws.push(caja(COLX[d] + 28, y + 22, s.ae)); }
      else { ws.push(caja(COLX[d] - 28, y, s.s)); ws.push(caja(COLX[d] + 28, y, s.e)); }
    }
  });
  const r = W.parseCaptura(ws, W.emps);
  if (!r.ok) return 'no interpreta una captura limpia: ' + r.motivo;
  let mal = 0;
  W.emps.forEach(e => { for (let d = 0; d < 7; d++) {
    const s = W.gS(e.id, d), g = r.datos[e.id][d];
    if (s.t === 'work' && s.sh === 'c' && (g.t !== 'work' || g.s !== s.s)) mal++;
    if (s.t !== 'work' && g.t !== 'off') mal++;
  }});
  if (mal) return mal + ' celdas mal reconstruidas';
  if (W.parseCaptura([caja(10, 10, 'hola')], W.emps).ok) return 'acepta una imagen que no es un horario';
  return null;
});

caso(37, 'Con una sola persona que pueda abrir, la tienda queda cubierta salvo minutos sueltos', W => {
  W.emps = [persona(1, 'Jefa', 40, { role: 'encargado', wd: 5 }), persona(2, 'M1', 30, { es: '11:00', canOpen: false, wd: 4 }),
            persona(3, 'M2', 25, { es: '11:00', canOpen: false, wd: 4 }), persona(4, 'M3', 20, { es: '11:00', canOpen: false, wd: 3 })];
  W.normalizeEmps(); W.doGenerateAll();
  // Con una sola persona capaz de abrir, sus días libres dejan la tienda sin
  // apertura: eso es una limitación de la plantilla y la app debe decirlo, no
  // taparlo haciéndole trabajar 7 días. Lo que sí se exige:
  //   · que nadie pierda su descanso mínimo
  //   · que nadie haga horas de más
  //   · que los huecos largos sean solo los de la apertura, no por la tarde
  const sinDescanso = W.emps.filter(e => {
    let n = 0;
    for (let d = 0; d < 7; d++) { const s = W.gS(e.id, d); if (!s || s.t !== 'work') n++; }
    return n < W.gRD();
  });
  if (sinDescanso.length) return sinDescanso[0].name + ' se queda sin su descanso mínimo';
  const pasados = W.emps.filter(e => W.empW(e).tot > e.h + 0.3);
  if (pasados.length) return pasados[0].name + ' hace horas de más para tapar la apertura';
  for (let d = 0; d < 7; d++)
    for (const g of W.getCovSegs(d))
      if (g.cnt === 0 && !g.inPause && (g.e - g.s) > 30 && g.s > W.tm('11:30'))
        return 'hueco fuera de la apertura: ' + W.DIAS_NOMBRE[d] + ' ' + W.ft(g.s) + '-' + W.ft(g.e);
  if (!W.getIssues().some(i => /no hay nadie/i.test(i.t))) return 'el hueco de apertura no se avisa';
  return null;
});

caso(38, 'Si ningún encargado está disponible, alguien se queda al cierre', W => {
  // antes, esos días solo se repartían mañanas y tardes y la noche quedaba sola
  W.emps = [persona(1, 'Jefa', 40, { role: 'encargado', wd: 5 }), persona(2, 'M1', 30, { es: '11:00', canOpen: false, wd: 4 }),
            persona(3, 'M2', 25, { es: '11:00', canOpen: false, wd: 4 }), persona(4, 'M3', 20, { es: '11:00', canOpen: false, wd: 3 })];
  W.normalizeEmps(); W.doGenerateAll();
  for (let d = 0; d < 7; d++) {
    let trabaja = 0, cierra = false;
    for (const e of W.emps) {
      const s = W.gS(e.id, d);
      if (!s || s.t !== 'work') continue;
      trabaja++;
      const fin = s.sh === 'p' ? s.ae : s.e;
      if (W.tm(fin) >= W.tm(W.gCL())) cierra = true;
    }
    if (trabaja && !cierra) return W.DIAS_NOMBRE[d] + ': hay gente trabajando pero nadie cierra';
  }
  return null;
});

console.log('\n  ROBUSTEZ');

caso(31, '500 plantillas aleatorias: ni una excepción, ni una regla rota', W => {
  let rnd = 424242;
  const rand = () => (rnd = (rnd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const pick = a => a[Math.floor(rand() * a.length)];
  for (let it = 0; it < 500; it++) {
    const total = 1 + Math.floor(rand() * 7);
    W.emps = [];
    for (let i = 0; i < total; i++) {
      const ud = [];
      for (let d = 0; d < 7; d++) if (rand() < 0.12) ud.push(d);
      W.emps.push(persona(900 + i, 'F' + i, pick([5,10,15,20,25,30,35,40]), {
        mhd: pick([4,5,6,8,9,10,12]), es: pick(['08:00','09:30','11:00','12:00','16:00']),
        ap: rand() < 0.7, ot: rand() < 0.3, mow: pick([2,4,6]), ud: ud,
        wd: 1 + Math.floor(rand() * 7), canOpen: rand() < 0.7, canClose: rand() < 0.8
      }));
    }
    W.normalizeEmps();
    W.document.getElementById('cfg-maxsim').value = String(1 + Math.floor(rand() * 3));
    W.document.getElementById('cfg-maxsimpk').value = String(1 + Math.floor(rand() * 4));
    W.sched = {}; W.genWeeks = {};
    W.doGenerateWeek(W.weekOff, it % 4);
    if (excesos(W).length) return 'iter ' + it + ' (' + total + 'p): ' + excesos(W)[0];
    for (const e of W.emps) {
      const w = W.empW(e);
      if (w.tot > e.h + (e.ot ? e.mow : 0) + 0.3) return 'iter ' + it + ': ' + e.name + ' ' + w.tot.toFixed(1) + 'h > ' + e.h;
      for (let d = 0; d < 7; d++) {
        const s = W.gS(e.id, d);
        if (!s || s.t !== 'work') continue;
        if (W.shH(s) > e.mhd + 0.15) return 'iter ' + it + ': ' + e.name + ' ' + W.shH(s).toFixed(1) + 'h > ' + e.mhd;
        if (s.sh === 'p' && W.td(s.me, s.as_) < 2) return 'iter ' + it + ': pausa corta';
        if (e.ud.indexOf(d) >= 0) return 'iter ' + it + ': trabaja en día no disponible';
      }
    }
  }
  return null;
});

caso(32, '1000 acciones al azar sin romper nada', W => {
  let rnd = 999;
  const rand = () => (rnd = (rnd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  W.doGenerateAll();
  const acciones = [
    () => W.doGenerateAll(), () => W.chWk(rand() < .5 ? 1 : -1),
    () => { const e = W.emps[Math.floor(rand() * W.emps.length)]; if (e) W.qA(e.id, Math.floor(rand() * 7), ['ap','td','no'][Math.floor(rand()*3)]); },
    () => W.doUndo(), () => W.doRedo(),
    () => W.togPkD(W.peaks[Math.floor(rand() * W.peaks.length)].id, Math.floor(rand() * 7)),
    () => { W.document.getElementById('cfg-maxsim').value = String(1 + Math.floor(rand() * 3)); W.doSaveAndRegenerate(); },
    () => W.renderSched(), () => W.renderCosts(), () => W.renderAlerts(), () => W.getIssues(),
    () => W.saveConfig(), () => W.doExcel(),
    () => { W.marcarCambio('x'); const e = W.emps[Math.floor(rand() * W.emps.length)]; if (e) e.h = [10,20,30,40][Math.floor(rand()*4)]; },
  ];
  for (let i = 0; i < 1000; i++) acciones[Math.floor(rand() * acciones.length)]();
  if (!Array.isArray(W.emps) || !W.emps.length) return 'el equipo desapareció';
  if (!isFinite(W.weekOff)) return 'la semana activa se corrompió';
  if (W._undo.length > 25 || W._redo.length > 25) return 'el historial se desbordó';
  return null;
});

caso(33, 'Generar es determinista y no acumula basura', W => {
  const foto = () => W.emps.map(e => [0,1,2,3,4,5,6].map(d => JSON.stringify(W.gS(e.id, d))).join('')).join('|');
  W.sched = {}; W.genWeeks = {}; W.doGenerateWeek(W.weekOff, 2);
  const a = foto();
  for (let i = 0; i < 8; i++) { W.sched = {}; W.genWeeks = {}; W.doGenerateWeek(W.weekOff, 2); }
  if (foto() !== a) return 'no es determinista';
  W.doGenerateAll();
  const k = Object.keys(W.sched).length;
  for (let i = 0; i < 4; i++) W.doGenerateAll();
  if (Object.keys(W.sched).length !== k) return 'acumula turnos huérfanos';
  return null;
});

caso(34, 'Si la generación falla a mitad, la semana activa no se descoloca', W => {
  W.doGenerateAll();
  const base = W.weekOff, real = W.cntAt;
  W.cntAt = () => { throw new Error('fallo simulado'); };
  try { W.doGenerateWeek(base + 3, 1); } catch (e) { /* esperado */ }
  W.cntAt = real;
  if (W.weekOff !== base) return 'quedó en ' + W.weekOff + ' en vez de ' + base;
  if (W._wdc !== null) return 'la caché de fechas quedó sucia';
  return null;
});

caso(35, 'Rendimiento: el equipo real genera al instante', W => {
  const t0 = Date.now(); W.doGenerateAll(); const t = Date.now() - t0;
  if (t > 3000) return 'tardó ' + t + ' ms con 4 personas';
  console.log('        (4 personas × 5 semanas: ' + t + ' ms)');
  return null;
});

console.log('\n  COMPATIBILIDAD CON GITHUB');

caso(36, 'Un único archivo estático, sin compilación ni servidor', () => {
  const scripts = (htmlOriginal.match(/<script src=/g) || []).length;
  if (scripts !== 1) return scripts + ' scripts externos fijos (debe ser 1)';
  if (htmlOriginal.indexOf('file://') >= 0) return 'contiene rutas de archivo locales';
  if (!/<\/html>\s*$/.test(htmlOriginal)) return 'el archivo no termina correctamente';
  const cabecera = htmlOriginal.slice(0, htmlOriginal.indexOf('</head>'));
  if (cabecera.toLowerCase().indexOf('tesseract') >= 0) return 'el lector de imágenes se carga al abrir';
  const idx = fs.readFileSync(ARCHIVO.replace('TastyPoke_Scheduler.html', 'index.html'), 'utf8');
  if (idx !== htmlOriginal) return 'index.html no coincide con el archivo de trabajo';
  return null;
});

console.log('\n╔═══════════════════════════════════════════════════════════════════════╗');
console.log('║  VEREDICTO                                                            ║');
console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');
if (!fallos.length) {
  console.log('  ✅  LOS ' + n + ' CASOS PASAN.');
  console.log('      Todos los fallos encontrados durante la revisión siguen arreglados.\n');
  process.exit(0);
} else {
  console.log('  ❌  ' + fallos.length + ' de ' + n + ' han vuelto a fallar:\n');
  fallos.forEach(f => console.log('      ' + f));
  console.log('');
  process.exit(1);
}
