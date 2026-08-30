# La Régie du MJ

[Français](README.md) · [English](README.en.md) · **Español**

Mapas tácticos para partidas de rol presenciales: rejilla, tokens, puntos de vida,
niebla de guerra. Dos ventanas sincronizadas en local:

- **La consola** ("la régie") — en tu pantalla: todos los mapas, la rejilla, los
  tokens, el pincel de niebla.
- **Vista de jugadores** — en la TV / el proyector: únicamente lo que los jugadores
  tienen derecho a ver (niebla opaca, tokens ocultos eliminados), o una pantalla negra
  cuando tú lo decidas.

Sin dependencias, sin cuenta, sin servidor remoto. Tus imágenes se quedan en tu
máquina (almacenadas en el navegador mediante IndexedDB).

**Idioma**: francés (por defecto), inglés o español — selector arriba a la derecha de
la consola y en la pantalla de inicio. La elección se recuerda y se propaga a la vista
de jugadores. El nombre sigue siendo «La Régie du MJ» en todos los idiomas. Para
añadir un idioma: una entrada en `DICT` de [`js/i18n.js`](js/i18n.js) con las mismas
claves.

## Cómo ejecutarlo

Se necesita un servidor estático local (módulos ES + sincronización fiable entre
ventanas) — **desactiva la caché del navegador** para que baste con recargar tras un
cambio de código.

### Windows — lo más sencillo

En la página **[Releases](https://github.com/sguizard/la_regie_du_mj/releases)**,
descarga el `.zip` `…-windows`, descomprímelo y **haz doble clic en `serve.exe`**. No
hay que instalar nada, el navegador se abre solo.

En el primer arranque, Windows SmartScreen puede avisar de un editor desconocido (el
ejecutable no está firmado): **Más información → Ejecutar de todas formas**. También
puede aparecer un aviso del cortafuegos — puedes denegar el acceso a redes públicas,
`localhost` funciona igualmente.

### Desde el código fuente (Python 3 o Node.js)

- **macOS / Linux**: `./serve.sh`
- **Windows**: doble clic en **`serve.bat`** (o escribe `serve.bat` en PowerShell / cmd)

Ambos scripts lanzan `serve.py` si **Python 3** está presente; si no, recurren a
`npx serve` (Node.js, sin desactivar la caché — entonces usa `Ctrl+Mayús+R` tras una
actualización).

**Python 3**: [python.org](https://www.python.org/downloads/) o el Microsoft Store —
en Windows, marca **«Add python.exe to PATH»** durante la instalación. Obtén el
proyecto con `git clone https://github.com/sguizard/la_regie_du_mj.git` o, en GitHub,
**«Code» → «Download ZIP»**.

### Después

Abre **http://localhost:8000** (Chrome, Edge o Firefox) y haz clic en **«Abrir la
consola»**. Otro puerto: `./serve.sh 9000`, `serve.bat 9000` o `serve.exe 9000`.

Recargar la consola o la vista de jugadores en cualquier momento es seguro: la escena
presentada y su estado (rejilla, tokens, PV, niebla) se restauran, y las dos ventanas
se resincronizan.

### Abrir la vista de jugadores

Desde la consola, el botón **«Abrir la vista de jugadores»** abre una segunda ventana
(`?view=player`). Arrástrala a la TV y ponla en pantalla completa (botón ⛶ o `F11`).
También puedes abrir directamente `http://localhost:8000/?view=player` en la máquina
conectada a la TV — la sincronización pasa por el navegador, así que ambas ventanas
deben ejecutarse **en el mismo navegador y en la misma máquina**.

## Uso

1. **+ Añadir un mapa** (o arrastrar y soltar imágenes en la zona de la barra
   lateral). Cada mapa es una escena táctica. Selecciónalo y luego **«Mostrar a los
   jugadores»** para enviarlo a la TV. Al pasar el ratón por una fila: **⧉** duplica el
   mapa (rejilla, tokens, niebla, seguimiento de iniciativa); **✕** lo elimina (con
   confirmación) — si estaba presentándose, la vista de jugadores vuelve a la espera.
   Las imágenes demasiado grandes (mapa > 2560 px, token > 512 px) se **reducen
   automáticamente** al importar para ahorrar espacio de almacenamiento.
2. **🚫 Ocultar jugadores** (barra superior): cambia la vista de jugadores a una
   **pantalla negra** mientras preparas lo siguiente; vuelve a hacer clic
   (**👁 Mostrar jugadores**) para revelar. El estado se conserva al recargar.
3. **⚙ Rejilla** (barra de herramientas): tamaño de casilla, **desplazamiento X/Y**,
   **color**, **opacidad**, **grosor**, **subrejilla** (×2 a ×5, trazo fino y
   discreto), imantación (a la subrejilla cuando está activa), «visible para los
   jugadores». **Calibrar**: traza la diagonal de una casilla en el mapa (aparecen un
   cuadrado de vista previa + el tamaño en píxeles mientras arrastras). Con la
   herramienta **▦ Rejilla** de la barra: **arrastrar con el botón izquierdo** mueve la
   rejilla sobre el mapa, **arrastrar arriba / abajo con el botón derecho** ajusta el
   tamaño de las casillas.
4. **Tokens** — la barra lateral izquierda muestra, bajo los mapas, la **lista de
   tokens de la escena**. Para añadir un token:
   - **+ Añadir un token** (bajo la lista): coloca un disco en el centro de la vista;
   - o la herramienta **⛃ Token** y luego clic en el mapa en el punto deseado.
   Un token nuevo no tiene nombre, tipo, iniciativa ni PV: en su fila, **+ nombre**,
   **+ tipo**, **+ inic.** y **+ PV** los añaden con un clic. Una vez definidos: el
   nombre se edita con ⚙, la iniciativa en un campo pequeño, el tipo con una insignia
   **PJ / PNJ** (clic = alternar; borde izquierdo de color). Al hacer clic en la
   **pastilla / miniatura** se abre un menú para elegir una imagen (biblioteca o
   importación) o volver al disco.
   Fila 2: **⚙** (propiedades), **👁** visibilidad para jugadores, **✕** eliminar,
   barra de PV + PV editables, botones **−/+** que aplican la **cantidad ±** de la
   parte superior de la lista.
   Al hacer clic en la fila (o en el token del mapa) se **selecciona** y **centra el
   mapa en él** — sin abrir ninguna ventana.
   - **Selección múltiple**: **Ctrl/⌘ + clic** (en el mapa o en la lista) añade o quita
     un token de la selección; **Mayús + clic** en la lista selecciona un rango;
     **Mayús + arrastrar** sobre una zona vacía del mapa dibuja un rectángulo de
     selección (se añade a la selección si se mantiene Mayús). Cuando hay varios tokens
     seleccionados, un panel de **edición en grupo** reemplaza las propiedades: daño /
     curación, tipo, tamaño, iniciativa, PV máx., color, visibilidad para jugadores, PV
     visibles para jugadores, **duplicación** y eliminación — aplicados a todos a la vez
     (poner PV máx. a 0 quita los PV). Arrastrar un token seleccionado mueve **todo el
     grupo** manteniendo la formación. **Ctrl/⌘ + D** duplica la selección (copias
     desplazadas una casilla, se conserva todo: PV, iniciativa, estados…). `Supr`
     elimina toda la selección, `Esc` la vacía.
   - **Orden** (menú en la parte superior de la lista, recordado): *iniciativa
     descendente* (los tokens sin valor al final) o *tipo y luego nombre* (PJ primero,
     luego PNJ, en orden alfabético). El orden solo afecta a la lista, no al
     apilamiento de los tokens en el mapa.
   - **Propiedades** — se abre **únicamente con el engranaje ⚙** de la fila: nombre,
     tipo, iniciativa, color, tamaño, PV / PV máx., **Apariencia** (disco sólido o una
     imagen importada), «PV visibles para jugadores» (*ocultos* / *solo barra* /
     *barra + números*; el DJ siempre ve los números), **Estados**, **Duplicar**.
   - **Estados** (en las propiedades): una fila de iconos predefinidos (veneno,
     aturdido, dormido, ardiendo, sangrando, derribado, apresado, protegido, apresurado,
     ralentizado) — clic para aplicar / quitar — más **＋** para un estado personalizado
     (emoji o texto corto). Los estados aparecen como pequeñas pastillas en el borde
     del token, en la consola **y** en la vista de jugadores.
   - A 0 PV, el token se atenúa con una cruz roja.
5. Herramientas **🔦 Revelar** / **🌫 Ocultar**: pinta la niebla con el pincel (un
   círculo de vista previa sigue al cursor, verde para revelar, rojo para ocultar). El
   deslizador de tamaño, los botones **revelar todo / ocultar todo** y **↶ deshacer**
   (retrocede un trazo de pincel, también con **Ctrl+Z**; una docena de niveles) solo
   aparecen en la barra de herramientas cuando una de estas dos herramientas está
   seleccionada.

La barra de herramientas es una tira de iconos: ✋ mover/seleccionar · 🔦 revelar ·
🌫 ocultar · ⛃ token · ▦ rejilla · 📺 encuadre de jugadores · ⚙ ajustes de rejilla
(pasa el ratón para ver la descripción).

**Regla de medición**: mantén **M** y arrastra sobre el mapa. La distancia se muestra
en casillas — en casillas de rejilla (diagonal = 1) y, entre paréntesis, a vuelo de
pájaro. Suelta M o pulsa `Esc` para borrar. Los extremos se imantan si la imantación
de la rejilla está activa.

### 📺 Encuadre de la vista de jugadores

Por defecto, la vista de jugadores ajusta **todo el mapa** a la pantalla — lo que deja
franjas negras cuando el mapa de batalla no tiene el formato de la TV. La herramienta
**📺** permite elegir la parte que se muestra a los jugadores:

- **traza un rectángulo** sobre el mapa: es lo que verán los jugadores (el resto del
  mapa se atenúa en tu consola para orientarte) ;
- o **🎯 Mi vista**: reutiliza la parte del mapa actualmente visible en tu consola ;
- **🗺 Todo el mapa** vuelve al comportamiento por defecto.

El encuadre se guarda con la escena y se difunde en directo. `Esc` sale de la
herramienta.

**Movimiento fluido**: en la vista de jugadores, los tokens **se deslizan** hacia su
nueva posición en lugar de saltar — más legible en una pantalla grande. (Respeta el
ajuste del sistema «reducir movimiento».)

### Seguimiento de iniciativa (orden de turnos)

El botón **⚔️** en la parte superior de la lista de tokens abre una **franja de orden
de turnos** en la parte inferior del mapa: los tokens con iniciativa, ordenados de
mayor a menor, con el **turno actual resaltado** y un **galón dorado** encima del
token en el mapa.

- **◀ / ▶** (o la tecla **N** para «siguiente») cambian de combatiente; el contador
  **Ronda** aumenta cuando se vuelve a la cabeza del orden.
- **Clic en un combatiente** = pasar directamente a su turno.
- **👁** en la franja: muestra el orden de turnos **en la vista de jugadores** (los
  tokens ocultos aparecen ahí como «?»). Sin esto, solo el DJ ve el seguimiento.

Nada es automático: avanzar los turnos depende de ti. El estado (turno, ronda,
visualización para jugadores) se guarda con la escena.

**Rueda del ratón** sobre cualquier campo numérico o deslizador (PV, iniciativa,
tamaño de casilla, pincel…): ajusta el valor un paso.

**Ping**: haz doble clic en cualquier punto del mapa para hacer aparecer una marca
animada de «mira aquí» — visible en tu consola y en la vista de jugadores.

Una vez presentado un mapa, cada movimiento de token, trazo de pincel o daño se
refleja en directo en la vista de jugadores.

### Mazos

**+ Nuevo mazo**, luego arrastra las miniaturas al mazo. Doble clic en el nombre de un
mazo o escena para renombrarlo. La barra de búsqueda filtra por nombre.

### Atajos de teclado (consola)

| Tecla | Acción |
|---|---|
| `V` | Herramienta mover / seleccionar |
| `R` | Pincel revelar |
| `H` | Pincel ocultar |
| `T` | Herramienta colocar un token |
| `A` | Añadir un token en el centro |
| `M` (mantenida) + arrastrar | Regla de medición |
| `N` | Siguiente combatiente (seguimiento de iniciativa) |
| `Ctrl`/`⌘` + `D` | Duplicar el/los token(s) seleccionado(s) |
| `G` | Abrir/cerrar el panel ⚙ Rejilla |
| `F` | Ajustar la vista |
| `Espacio` + arrastrar | Desplazar la vista |
| rueda | Zoom |
| doble clic en el mapa | Ping (marca de «mira aquí») |
| `Ctrl`/`⌘` + `Z` | Deshacer el último trazo de pincel de niebla |
| `Ctrl`/`⌘` + clic · `Mayús` + clic · `Mayús` + arrastrar | Selección múltiple de tokens |
| `Supr` | Eliminar el/los token(s) seleccionado(s) |
| `Esc` | Vaciar la selección / cerrar los paneles |

## Datos y copia de seguridad

Todo se almacena en el navegador (IndexedDB, origen `http://localhost:8000`).
- Mantén el **mismo puerto** de una sesión a otra, si no los datos no se encuentran.
- El espacio usado se muestra en la barra superior; **«Borrar todo»** lo elimina todo
  (con confirmación).
- Borrar los datos de navegación del sitio también elimina las escenas.

### Exportar / Importar

En la parte inferior de la lista de mapas: **⬇ Exportar** descarga un archivo `.json`
autónomo que contiene **todos** los mapas, mazos y tokens (imágenes incluidas).
**⬆ Importar** restaura desde un archivo así — **reemplaza** todos los datos actuales
(se pide confirmación).

Hazlo con regularidad: es la única copia de seguridad real, y la única forma de pasar
tu preparación de una máquina (o navegador) a otra. Un archivo grande es normal:
lleva las imágenes en claro.

## Navegadores

Probado en Chrome / Firefox. **Safari no gestiona IndexedDB de forma fiable en modo
local** — usa Chrome o Firefox.

## Estructura del código

```
index.html      punto de entrada (consola, vista de jugadores, inicio)
style.css
serve.sh / serve.bat / serve.py   servidor estático local sin caché (Unix / Windows)
js/
  main.js       idioma + enrutado de rol
  i18n.js       traducciones (fr / en / es) + selector
  db.js         IndexedDB (decks, scenes, tokenLibrary, meta)
  sync.js       BroadcastChannel entre las dos ventanas
  import.js     importación de imágenes (mapas, tokens) + miniaturas
  backup.js     exportación / importación JSON de toda la campaña
  stage.js      cámara pan/zoom + renderizado de imagen / rejilla / tokens / niebla
  fog.js        máscara de niebla (pincel, goma, deshacer)
  gm.js         pantalla de la consola
  player.js     pantalla de la vista de jugadores
```

Añade `?debug` a la URL para exponer el estado interno en `window.__mj`.

## Licencia

**La Régie du MJ** — Copyright © 2026 Sébastien Guizard.

Este programa es software libre: puedes redistribuirlo y/o modificarlo bajo los
términos de la **GNU General Public License** publicada por la Free Software
Foundation, ya sea la versión 3 de la Licencia o (a tu elección) cualquier versión
posterior. Se distribuye sin ninguna garantía. Consulta el archivo [LICENSE](LICENSE)
para el texto completo, o <https://www.gnu.org/licenses/>.
