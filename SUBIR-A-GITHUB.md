# Qué subir a GitHub para poder instalar la app

Sube estos **6 archivos** a la raíz del repositorio `tasty-poke-scheduler`
(donde ya está el `index.html` de ahora):

| Archivo | Nuevo o actualizado | Para qué sirve |
|---|---|---|
| `index.html` | **actualizado** | La app. Ahora lleva las etiquetas que faltaban. |
| `manifest.json` | nuevo | Nombre, icono y color de la app instalada. |
| `sw.js` | nuevo | Permite el botón "Instalar" y el uso sin cobertura. |
| `icon-192.png` | nuevo | Icono en el móvil. |
| `icon-512.png` | nuevo | Icono en alta resolución. |
| `icon-512-maskable.png` | nuevo | Icono recortable de Android (el círculo/cuadrado). |

Los cuatro archivos `.js` de pruebas (`pruebas.js`, `dev.js`, `configs.js`,
`certificacion.js`) **no hace falta subirlos**: son herramientas tuyas de
escritorio, no forman parte de la app.

---

## Lo que cambia

### El Excel exporta las 5 semanas, una debajo de otra (v22)

Antes solo salía la semana que estabas viendo y había que exportar cinco
veces. Ahora **«Excel» saca todas las semanas generadas en una sola hoja**,
apiladas, con dos filas de aire entre una y otra.

Cada bloque lleva lo suyo, así que no hay que ir contando filas:

- `LOCAL · Tasty Poke Mataró`
- `SEMANA · Semana 42 · 12 oct a 18 oct 2026` — ahora con las fechas, no solo
  el número
- la cabecera de los 7 días con su fecha y el festivo si lo hay
- una fila por persona (dos si tiene turno partido), con contratadas,
  realizadas y diferencia
- sus propios `TOTAL MAÑANA` y `TOTAL TARDE`

El archivo pasa a llamarse `TastyPoke_Sem42-46.xlsx` y la hoja, `Sem 42-46`.
Exportar ya no te mueve de la semana que tenías en pantalla.

Comprobado abriendo el .xlsx resultante: 78 filas, 5 bloques, 205 celdas
combinadas, colores de cada persona intactos.

### El diálogo de límites, legible en el ordenador (v21)

Probando la web publicada en un navegador de verdad: el diálogo «¿Qué límite
rompemos?» salía en una columna de 320 px, con las cinco opciones y sus
medidas apretujadas. La clase de los modales lleva un ancho fijo y mi
`max-width` no la pisaba. Ahora usa `min(560px, 92vw)`: ancho en el
ordenador, y en el móvil sigue cabiendo igual.

Esto solo se ve en un navegador real — las pruebas automáticas no miran el
CSS, así que daban todas en verde con el diálogo ilegible.

### La cuenta de horas, siempre a la vista (v20)

Cuántas horas de personal pide el horario que has configurado, cuántas tienes
y cuánto falta. Antes este número solo aparecía cuando **no** cuadraba, metido
entre las propuestas. Ahora está fijo en tres sitios:

- **Horario**, en una línea fina sobre los avisos:
  *📐 Tu horario pide 133 h de personal · tienes 122 h — faltan 11 h · y falta
  1 turno-persona*
- **Equipo** y **Config**, la tarjeta completa, con tres números grandes
  (hacen falta / tienes / faltan o de margen) en rojo, ámbar o verde.

La tarjeta explica de dónde sale cada cifra en vez de pedirte que te fíes:

- Las **133 h** = tienda cubierta de 09:30 a 23:30 los 7 días (**98 h**) más
  el refuerzo de las franjas de alta demanda (**35 h**).
- Las **122 h** = 110 h de contrato + 12 h extra autorizadas. Quien esté de
  baja o de vacaciones no cuenta, y lo dice.
- **Turnos-persona:** hacen falta 21, el equipo da 20, falta 1. Con el tope de
  8 h al día, un día de 19 h necesita 3 personas; cada uno puede trabajar
  5 días con 2 de descanso. Esto no se arregla con horas extra.
- **Día a día:** cuántas horas de personal pide cada uno de los 7 días y
  cuántas personas hacen falta ese día.

Se recalcula sola en cuanto tocas algo. Comprobado: cerrar una hora antes baja
de 133 a 126 h; quitar el refuerzo del lunes, de 133 a 130; autorizar 6 h
extra más sube de 122 a 128; una baja baja de 122 a 98; añadir una persona de
25 h sube a 153 y el semáforo pasa a verde con 20 h de margen.

### Antes de completar el calendario, pregunta qué límite rompes (v19)

Cuando el objetivo no cabe con el equipo que hay, algo tiene que ceder. Hasta
ahora la app elegía sola — dejaba los huecos — y te lo contaba después. Ahora,
al pulsar **Generar**, para y te pregunta, con tus números delante:

> Con 4 personas no se puede tener la tienda cubierta de 09:30 a 23:30 los
> 7 días **y además** el mínimo de gente en todas las franjas de alta demanda.
> Hacen falta 133 h y tienes 122 h (faltan 11 h); hacen falta 21 turnos-persona
> y el equipo da 20 (falta 1). **Elige tú qué cede:**

Y cinco salidas, cada una **medida de verdad** generando una semana de prueba
antes de ofrecértela — no prometida de memoria:

| Opción | Qué hace | Medido con tu equipo |
|---|---|---|
| 📉 Pedir 2 personas solo los días que lo necesiten | Quita el refuerzo lunes, martes y miércoles | cubre 5 de 8 · el objetivo baja de 14 franjas a 8 · sin coste |
| ⏱ Pagar horas extra | Mafe +4 h, Cesar +4 h, Alexandra +3 h | cubre **11 de 14** (ahora 8) · ≈124 €/semana |
| 📈 Dejar que alguien pase de 8 h | Camareros hasta 9,5 h un día | cubre 7 de 14 — **no mejora**: turnos más largos reparten peor |
| 📅 Quitar un día libre | De 2 días de descanso a 1 | cubre 8 de 14 — **no mejora** |
| 🚧 No romper nada | Deja los huecos y los marca en Alertas | cubre 8 de 14 |

Lo interesante es que las medidas desmienten dos de las opciones: subir la
jornada a 9,5 h y quitar un día libre **no mejoran la cobertura**, aunque
cuadren la aritmética. La que de verdad funciona son las horas extra, y la
app te lo dice en la propia opción en rojo.

Elijas lo que elijas, se aplica y genera las 5 semanas sin volver a
preguntar. Si prefieres que no vuelva a preguntar nunca, hay una casilla.
Solo pregunta el botón **Generar**: cambiar un ajuste o abrir la app no
disparan el diálogo.

### Equipo actualizado (v19)

Stephanie (encargada, 40 h) · **Alexandra** (camarera, 30 h) · Cesar
(camarero, 20 h) · Mafe (camarera, 20 h). La que estaba como «Alex» pasa a
llamarse Alexandra; el cambio se aplica también sobre los datos que ya
tengas guardados, sin tocar sus turnos.

### Quien cierra ya no abre al día siguiente (v18)

Probando la web publicada salieron 4 casos en 5 semanas de alguien que
cerraba a las 23:30 y volvía a abrir a las 09:30 — 10 h de descanso, cuando
el Estatuto de los Trabajadores pide 12 (art. 34.3).

Eran dos fallos distintos:

1. **El que abría se elegía igual todos los días.** Era siempre la misma
   posición de la lista, así que a quien le tocaba cerrar la víspera le
   tocaba también madrugar. Ahora, para abrir, se elige entre los que
   **anoche no cerraron**; solo si no queda nadie descansado se tira de los
   demás, y entonces sale el aviso.

2. **La red de seguridad era para toda la semana.** Si el último intento de
   arreglo salía mal, se deshacían también los arreglos anteriores que no
   costaban nada, y la semana se quedaba con todas las violaciones. Ahora
   cada apaño se juzga por separado: lo que sale gratis se queda siempre.

De 4 bajó a 2–3 según la semana, y de paso la cobertura de alta demanda subió
de 48 a 49 franjas de 70. Las que quedan **no son un fallo del reparto**: son
días en que solo trabajan dos o tres personas y el cierre y la apertura
siguiente caen forzosamente sobre las mismas. La alerta ahora lo dice con
nombres, en vez de pedirte que lo deduzcas de la cuadrícula.

Generar el mes cuesta un 2 % más de tiempo. No se nota.

### Las alertas, ordenadas por tema y con la causa marcada (v17)

Antes las alertas iban por gravedad, y eso mezclaba la causa con el síntoma:
veías seis avisos de "el lunes en Cenas hay solo 1 persona" sin que nada te
dijera *por qué* y qué tenías que tocar para arreglarlo.

Ahora van en **seis grupos por tema**, y el primero es siempre el que importa:

| Grupo | Qué lleva |
|---|---|
| 🚧 **Esto impide completar la grilla** | La causa de fondo. Faltan horas de personal, faltan turnos-persona, nadie puede abrir o cerrar, el contrato de alguien no cabe en los días que deja el descanso… |
| 🏪 Cobertura de la tienda | Tramos sin nadie, franjas de alta demanda por debajo del mínimo, más gente de la permitida a la vez. |
| ⚖️ Descansos y máximos | Días libres, 12 h entre jornadas, pausa del turno partido, tope de horas al día. |
| 🕐 Horas y contratos | A quién le sobran horas y a quién le faltan. |
| ✍️ Cambios hechos a mano | Lo que fijaste tú y la app respeta, aunque no cuadre. |
| ℹ️ Para tenerlo en cuenta | Altas, bajas, vacaciones, bloqueos. |

El grupo de arriba va en rojo y con una explicación: *"mientras no lo
resuelvas van a quedar huecos y franjas sin reforzar; no es cuestión de mover
turnos, la app ya ha probado todas las combinaciones"*. Y cuando **nada** lo
impide, la app también lo dice, porque eso cambia qué tienes que hacer: si no
hay bloqueo, lo que queda se arregla ajustando turnos a mano.

Con tu equipo de ahora salen **2 bloqueos** y los números concretos: faltan
11 h de personal a la semana y falta 1 turno-persona. Esa segunda no se
arregla con horas extra — con el tope de 8 h al día no hay a quién
ponérselas sin quitarle un día libre a alguien.

**El calendario ya viene alineado con Barcelona.** Antes solo traía festivos
nacionales y catalanes, porque es lo único que devuelve la API oficial: los
municipales no están en ninguna API. Ahora la app los genera ella misma, para
el año en curso y el siguiente:

- **Barcelona ciudad:** La Mercè (24 de septiembre) y el Dilluns de Pasqua
  Granada (se mueve cada año — en 2026 cae el 25 de mayo).
- **Mataró:** Les Santes, 27 y 28 de julio.
- **Días de mucho movimiento** aunque no sean fiesta: Cabalgata de Reyes,
  Sant Jordi, Revetlla de Sant Joan, Revetlla de la Mercè, Castanyada,
  Black Friday, Nochebuena y Nochevieja.

Semana Santa, Pasqua Granada y Black Friday se **calculan**, no están escritos
a mano, así que no se desfasan de un año a otro. Los partidos de la temporada
pasada ya no vienen de serie; hay un botón **🧹 Borrar los ya pasados** para
limpiar la lista, y los eventos pasados salen atenuados.

**Las propuestas van por orden de bolsillo.** Cuando falta cobertura, la app
ofrece ahora en este orden:

1. **🔀 Partir el turno** de alguien — cubre mediodía y cenas, sin coste.
2. **👥 Partido a varios camareros a la vez** — reparte la carga en vez de
   cargársela a uno solo.
3. **📆 Repartir sus horas en más días** — mismo contrato, turnos más cortos,
   más días en la tienda. Tampoco cuesta nada.
4. **⏱ Horas extra** — al final, porque son las que se pagan.

Dentro de cada opción se ofrece primero a los **camareros** (la encargada
cobra más) y, entre ellos, a **quien menos horas tiene**. Si una propuesta
reparte horas pero deja algo peor cubierto, lo dice en vez de esconderlo.

**Horas extra activadas de serie para los camareros.** Alex, Mafe y Cesar
vienen con **4 h/semana** autorizadas; la encargada, con ninguna, porque cuesta
más. Al dar de alta a alguien nuevo la casilla viene marcada, y se desmarca
sola si lo pones como encargado.

Esto **se aplica también a lo que ya tienes guardado**, una sola vez al abrir
la versión nueva — tanto a lo del navegador como a lo que baje de la nube. En
el mismo paso, el máximo diario de todos queda en **8 h** (Stephanie venía con
9). A partir de ahí mandas tú: si se las quitas a alguien desde su ficha, no
vuelven solas.

Las horas de contrato se reparten siempre enteras; las extras se usan para
reforzar las franjas de alta demanda y para cubrir bajas.

**El contador de franjas de alta demanda estaba mintiendo.** Contaba a quien
*tocara* la franja en algún momento: alguien que entraba a las 21:30 ya contaba
para la franja de cenas de 20:00 a 23:00, y la app pintaba «2p» en verde
cuando hora y media de las tres había una sola persona. Ahora cuenta el
**mínimo de gente simultánea durante toda la franja**.

Los números bajan —del 89 % al 64 %— porque ahora son ciertos, no porque el
horario haya empeorado. Y el generador trabaja contra el objetivo real.

**Segunda opinión de Gemini (opcional).** En Config puedes pegar una clave de
Gemini y activar que, cada vez que generes, le mande el horario para que lo
contraste con **tus propios parámetros** y te diga en dos líneas si cuadra. Es
solo un comentario: **no cambia ni un turno**, y si no hay clave, no hay
internet o Gemini falla, el horario sale igual.

- **No se envían nombres.** Cada persona viaja como «Encargada», «Camarero A»…
- **La clave se guarda solo en ese dispositivo.** Nunca va al repositorio ni se
  sincroniza con la nube. Consíguela gratis en `aistudio.google.com/apikey`.
- Son unos 2,7 KB por consulta.

**Ocho horas al día es un techo absoluto.** Ni con horas extra autorizadas se
pasa de ahí. Las extras ya no alargan la jornada: se usan **trayendo a alguien
un día que libraba**, para reforzar una franja o cubrir una baja.

Y resulta que la restricción mejora el horario. Al no poder estirar jornadas,
la app tira de turnos partidos y días añadidos, que cubren mucho mejor dos
franjas separadas: **las puntas cubiertas suben del 77 % al 91 %**.

**Los turnos partidos, como los haces tú.** Este es el cambio grande. La app
construía siempre la misma forma de partido: tarde larga hasta el cierre y lo
que sobrara por la mañana. Mirando tus horarios reales de Mataró aprendí que
usas dos formas, y las dos tienen **un tramo muy corto**:

- **Corte de mediodía:** `13:30–15:00 / 17:00–23:30` — mañana de 1,5 h
- **Apertura y cierre:** `09:00–15:00 / 21:30–23:30` — tarde de 2 h

La segunda es la que permite cubrir el día **con dos personas doblando el
mediodía**: una hace seguido de 13:30 a 21:30 y la otra abre por la mañana y
vuelve solo para el cierre. Ahora la app genera todas las reparticiones
posibles entre los dos tramos y se queda con la que mejor cubre, siempre con la
pausa mínima de 2 h.

El salto en franjas de alta demanda cubiertas:

| franjas marcadas | antes | ahora |
|---|---|---|
| los 7 días | 43 % | **77 %** |
| 5 días | 50 % | **82 %** |
| 3 días | 63 % | **90 %** |
| sábado y domingo | 70 % | **100 %** |

**Nadie viene a la tienda por hora y media.** Al reforzar una punta o cubrir
una baja, la app puede traer a alguien en su día libre. Antes lo hacía por
turnos de 90 minutos. Ahora el mínimo son **3 h** para reforzar una punta, y
**2 h** solo si la tienda se quedaría vacía — ahí sí llamas a quien sea.

**Las 12 horas entre jornadas, de verdad.** El Estatuto pide 12 h entre el
final de una jornada y el principio de la siguiente. La app lo avisaba en tono
suave, pero el generador no lo evitaba: cerrar a las 23:30 y abrir a las 09:30
son **10 horas**, y salía sin más. Ahora la app intenta arreglarlo sola de tres
formas — retrasarle la entrada, que abra otro por la mañana, o que cierre otro
esa noche — y solo acepta el cambio si no deja a nadie sin cubrir ni descuadra
horas de contrato. Lo que no consigue arreglar sale ahora como **error a
corregir**, no como sugerencia.

Con tu equipo pasa de 3 incumplimientos a 2 en cinco semanas. Los dos que
quedan no tienen arreglo automático: cualquier cambio pondría a 3 personas a la
vez cuando tu tope son 2. Los tienes señalados para moverlos tú en un minuto.

**Media hora de contrato sin trabajar ya no pasa desapercibida.** El aviso de
"le faltan horas" no saltaba por debajo de media hora. Media hora a la semana
son 26 horas al año pagadas y no trabajadas, así que ahora también se avisa.

**Turnos en horas redondas o y media.** Se acabaron las entradas a las 16:50 y
las jornadas de 6h40. Todo cae en `:00` o `:30`. Cuando el contrato no reparte
exacto —20 h entre 3 días serían 6h40— la app hace días de **7 h y días de
6h30** hasta sumar las 20 h clavadas, en vez de partir el minuto:

| | contrato | reparto |
|---|---|---|
| Stephanie | 40 h en 5 días | 8 h · 8 h · 8 h · 8 h · 8 h |
| Alex | 30 h en 4 días | 7,5 h · 7,5 h · 7,5 h · 7,5 h |
| Mafe | 20 h en 3 días | **7 h · 6,5 h · 6,5 h** |
| Cesar | 20 h en 3 días | **7 h · 6,5 h · 6,5 h** |

Lo único que se respeta tal cual es la apertura y el cierre del local: si abres
a las 11:15, quien abre entra a las 11:15. Lo de dentro se cuadra.

**Máximo 8 h al día, también para la encargada.** Stephanie venía con 9 h como
máximo diario; ahora son 8, igual que el resto. Con 40 h en 5 días salen 8 h
clavadas y le quedan sus 2 días libres. El valor por defecto al dar de alta a
alguien nuevo también es 8.

**Cerrar a medianoche ya no rompe la app en silencio.** Si ponías el cierre en
`00:00` o más tarde, la app generaba un horario **vacío** sin decir por qué.
Ahora avisa, explica que un turno no puede cruzar la medianoche y **no borra**
el horario que tuvieras.

**El horario ya no se pierde al cerrar la app.** Antes solo se guardaba la
configuración: el horario se recalculaba cada vez que abrías. Significaba que
cualquier ajuste hecho a mano desaparecía al cerrar la pestaña. Ahora se guarda
en el navegador y en la nube, así que tú y la encargada veis exactamente lo
mismo, con los ajustes incluidos. Cambiar la configuración (horario de tienda,
descansos…) sí lo regenera, como siempre.

**No quedan minutos sueltos.** Los turnos se colocaban por su hora de salida, y
eso podía dejar un hueco justo al acabar la pausa: los de mañana ya se habían
ido y los de noche aún no habían entrado. Pasaba sobre todo con equipos grandes,
donde dos personas entraban a la misma hora pudiendo una entrar antes. Ahora la
app adelanta la entrada de quien puede — sin alargar ningún turno, sin tocar
horas de contrato ni descansos. Con tu equipo y tu horario: **cero minutos sin
cubrir** en las cinco semanas.

Cuando el hueco es porque faltan horas de verdad, la app lo dice y distingue las
dos causas, que tienen soluciones distintas: *"Mafe libra ese día y aún le faltan
horas de contrato: dale ese tramo"* frente a *"Todo el equipo está ya al tope de
su contrato: faltan horas, o cierras esas horas o necesitas más gente"*.

**Los días de descanso son ahora un límite duro.** Antes el mínimo de descanso
de Config era solo el valor de partida para calcular los días: si en una ficha
se ponía "7 días/semana", o si el contrato no cabía de otra forma, la app daba
esos 7 días y la persona se quedaba sin librar. Ya no. Nadie pasa de
`7 − días de descanso`, pase lo que pase.

Cuando el contrato no quepa en esos días, la app **lo dice en Alertas** en vez
de recortar el descanso:

> *El contrato de Stephanie no cabe en 4 días — Con 3 días de descanso solo
> puede trabajar 4 días, y sus 40 h saldrían a 10 h al día, por encima de su
> máximo de 9 h. Se le asignan las horas que caben y le faltarán unas 4 h.
> Para cuadrarlo: sube su máximo diario a 10 h, baja el descanso mínimo, o
> pasa esas horas a otra persona. El descanso no se toca.*

Las propuestas de "repartir horas en más días" también dicen ahora cuántos
días libres quedarían, y nunca proponen pasar del límite.

**El icono es otro.** Ahora es una persona con un calendario, que es lo que
hace la app.

**Las horas por turno salen con un decimal.** 20h entre 3 días ya no aparece
como `6.6666667h`, sino como `6.7h`.

**Se verá bien en el móvil.** Faltaba la etiqueta `viewport`, y sin ella el
teléfono dibujaba la página como si fuera una pantalla de ordenador y la
encogía: todo diminuto y a base de zoom. Ya está puesta.

**Se podrá instalar.** En Android, Chrome ofrecerá "Instalar aplicación" y
quedará con su icono en el cajón de apps, sin barra de navegador.

**Funcionará sin cobertura.** La primera vez que se abra con internet, guarda
una copia. Después abre aunque no haya señal en la tienda. La sincronización
con la nube sí necesita conexión, lógicamente: sin ella se trabaja en local y
se sincroniza al recuperarla.

---

## Cómo instalarla, una vez subido

**Android (Chrome):** abre la web → menú de tres puntos → *Instalar aplicación*
(o *Añadir a pantalla de inicio*). A veces sale solo un cartel abajo.

**iPhone / iPad (Safari):** abre la web → botón Compartir → *Añadir a pantalla
de inicio*. En iPhone hay que hacerlo desde **Safari**; desde Chrome no aparece
la opción.

**Ordenador (Chrome o Edge):** aparece un icono de instalar en la barra de
direcciones, a la derecha.

---

## Al publicar una versión nueva

Cuando cambies `index.html`, abre `sw.js` y sube el número de esta línea:

```js
const VERSION = 'tasty-poke-v14';     →     'tasty-poke-v15'
```

(Para esta subida ya está puesto en `v14`, no toques nada.)

Eso obliga a los móviles a descartar la copia vieja y traerse la nueva. Si no
lo haces, la app sigue funcionando, pero quien ya la tenga instalada puede
tardar en ver los cambios.

---

## Si algo no sale bien

**No aparece "Instalar":** comprueba que los 6 archivos estén en la **misma
carpeta** que `index.html`, y que la web se abra por `https://` (GitHub Pages
lo hace siempre). Prueba también a cerrar y reabrir el navegador: Chrome tarda
unos segundos en detectar una app instalable la primera vez.

**Sigue viéndose pequeña:** es la copia guardada del navegador. Cierra la
pestaña, vuelve a abrir, y si persiste usa el menú → *Vaciar caché*.

**Se instaló pero abre en blanco:** falta alguno de los archivos nuevos.
Revisa que `manifest.json` y `sw.js` estén subidos y accesibles
(`https://francohack1.github.io/tasty-poke-scheduler/manifest.json` debe
mostrar el texto del archivo).
