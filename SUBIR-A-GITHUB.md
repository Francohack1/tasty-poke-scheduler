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
const VERSION = 'tasty-poke-v2';     →     'tasty-poke-v3'
```

(Para esta subida ya está puesto en `v2`, no toques nada.)

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
