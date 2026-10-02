# Revisión didáctica · octubre de 2026

Segunda revisión del laboratorio, centrada en **qué hace el estudiante en cada pantalla**. La primera revisión
(`AUDITORIA.md`) se ocupó de los cálculos, la rotación y la interfaz.

## Supuestos de partida

- **Público.** Estudiantes de grado de Psicología que cursan Psicometría por primera vez (novatos). Por eso
  hay ejemplos resueltos y ayudas.
- **Uso.** Sesiones de 30–60 min por módulo, con el docente presente. Los estudiantes trabajan con su móvil o
  portátil, a veces en parejas.
- **Papel de la herramienta.** Es una parte de la sesión: el docente la abre con una pregunta y la cierra con
  una puesta en común.
- **Despliegue.** GitHub Pages o los archivos abiertos sin servidor. No hay backend ni autenticación, así que la
  herramienta no recoge datos.

## Método

Cada página se revisó con una lista de once criterios. Los criterios son: objetivo observable visible,
activación previa, segmentación, generación antes de revelación, feedback elaborado con escalera de ayudas,
transferencia y metacognición, interacción constructiva, ausencia de carga extraña, cierre con guía docente,
móvil y accesibilidad, y privacidad. Las páginas revisadas son Diseño, Análisis de ítems, TCT, TRI, AFE,
Laboratorio de rotación y AFC.

Se recorrieron las páginas con Playwright a 1440 y 390 px. Las 47 preguntas se revisaron una a una.

## Diagnóstico y cambios

El Laboratorio de rotación, rehecho en la primera revisión, ya cumplía casi todos los criterios. Los otros seis
módulos tenían buen contenido, pero en ellos el estudiante sobre todo leía, movía controles y veía resultados.

| Criterio | Antes (seis módulos) | Ahora (los siete) |
|---|---|---|
| Objetivo visible | Título y entradilla | Bloque «Al terminar podrás…» con 4 objetivos observables, duración, modo y «Sin nota» |
| Activación previa | No había | Tres predicciones con grado de seguridad al empezar; se contrastan al cerrar el módulo |
| Segmentación | Pestañas o secciones | Además, botones «← anterior / siguiente →» con «Apartado i de n» al final de cada apartado |
| Generar antes de ver | El resultado aparecía al mover el control | «Predice antes de ver» en los resultados clave (ver abajo); en Diseño, reescribir el ítem antes de abrir la propuesta |
| Feedback | Correcto/incorrecto; al primer error se marcaba la respuesta correcta | Explicación propia de cada opción. Tras un error no se revela la respuesta: se ofrece pista, luego solución explicada, y se puede reintentar |
| Transferencia | Preguntas mezcladas sin distinguir | Cada pregunta lleva su tipo (recuerdo, aplicación, transferencia); al menos una de transferencia por módulo; el resumen las cuenta aparte |
| Metacognición | Solo en Rotación | Seguridad (seguro / dudo / adivino) antes de cada respuesta, calibración al final y autoexplicación con respuesta modelo, que solo aparece después de un intento |
| Interacción | Activa (clics, deslizadores) | Constructiva (predecir, reescribir, explicar) e interactiva (indicaciones «En parejas» en cada módulo) |
| Cierre y docente | Solo en Rotación | «Antes de terminar»: predicciones contrastadas, autoexplicación, 5 ideas clave, «Después» con enlace al repaso y una guía docente plegable (uso, debate, errores, qué mirar) |
| Repaso espaciado | No había | `repaso.html`: prioriza las preguntas falladas y completa con preguntas de aplicación y transferencia de cualquier módulo |
| Móvil | Texto de 11–14 px en explicaciones y tablas | Texto principal a 16 px en móvil; tablas, pistas y etiquetas a 14 px |
| Privacidad | Sin datos | Igual. El navegador solo recuerda las predicciones y qué preguntas se fallaron, con `try/catch`. Exportación opcional a CSV con un código seudónimo, sin nombre |

### «Predice antes de ver» en cada simulador

El resultado queda difuminado hasta que el estudiante escribe su predicción o elige «Ver sin predecir». Después
puede ocultarlo de nuevo («Volver a predecir»), cambiar los parámetros y repetir.

| Módulo | Qué se predice | Tolerancia | Retroalimentación |
|---|---|---|---|
| Análisis de ítems | Índices de la tabla de grupos extremos y distractores (ya tenía predicción previa) | — | — |
| TCT | Fiabilidad de Spearman–Brown con la longitud elegida | ± 0,03 | Si sobrestima o infraestima, y por qué (rendimientos decrecientes) |
| TRI | θ en que el ítem informa más | ± 0,25 | Máximo en b en el 2PL; se desplaza con c (3PL) y d (4PL) |
| AFE | Número de factores del análisis paralelo | Exacta | Contraste con la regla de Kaiser |
| AFC | Grados de libertad del modelo | Exacta | Cómo contar momentos y parámetros |
| Rotación | Qué cambia al rotar (apartado 01) | — | Contraste en el apartado 07 |

### Redacción de las preguntas

Un curso de psicometría debería seguir sus propias pautas de redacción de ítems. Se revisaron las 47
preguntas con los mismos criterios que enseña el Módulo 1:

- **Once preguntas tenían solo dos opciones** (casi siempre «Sí/No»). Con dos opciones se acierta el 50 % por
  azar y la calibración apenas informa. Ahora tienen tres, y el distractor nuevo recoge un error frecuente. Por
  ejemplo: «Solo si α supera 0,90», «La suma de las cargas de estructura al cuadrado» o «Con la misma muestra,
  pero cambiando de estimador».
- **La opción correcta era la más larga en 29 de 47 preguntas.** Es una pista clásica para quien responde por
  la forma. Se igualaron longitudes en 20 preguntas y ahora ocurre en 18 de 47, cerca de lo esperable por azar.
  No queda ninguna pregunta con la correcta más de un 30 % más larga que el mejor distractor.
- **Comprobaciones automáticas en cada cambio** (`tests/preguntas.test.cjs`):
  - identificadores únicos y tipo de pregunta;
  - al menos tres opciones, cada una con su explicación;
  - solo la explicación de la correcta empieza por «Correcto»;
  - una pregunta de transferencia por módulo;
  - la correcta no supera en más de un 30 % al mejor distractor.
- **Contenido corregido:**
  - La respuesta modelo del AFE decía que, sin estructura, los autovalores muestrales salen «mayores que cero».
    Lo relevante es que salen mayores que 1 por azar.
  - La de TCT explicaba Spearman–Brown de forma vaga. Ahora explica que, con ítems paralelos, la varianza
    verdadera crece con k² y la de error con k.

## Componentes comunes

Los siete módulos usan el mismo motor, de modo que el estudiante aprende la mecánica una sola vez:

- `assets/js/core/didactica.js`: predicciones, cuestionario, «predice antes de ver», autoexplicación y
  paginación.
- `assets/js/core/preguntas.js`: contenido.
- `assets/css/didactica.css`: estilos.

Detalles en `ARQUITECTURA.md`. La prueba `tests/didactica.test.cjs` comprueba lo siguiente:

- objetivos y cierre;
- predicciones guardadas y contrastadas;
- velado y reintento en TCT, TRI, AFE y AFC;
- paginación;
- autoexplicación;
- escalera de ayudas sin revelar la respuesta;
- calibración;
- contenido del CSV;
- repetición de falladas;
- cola y página de repaso;
- ejemplo de Diseño;
- funcionamiento con el almacenamiento bloqueado.

## Fichas pedagógicas

Las mismas indicaciones, más detalladas, están en la «Guía para el docente» al final de cada módulo.

### 01 · Diseño de tests

- **Objetivo:** identificar defectos de redacción (doble contenido, negaciones, absolutos, deseabilidad), reescribir
  un ítem justificando el cambio y preparar su ficha para la revisión por expertos.
- **Procesos:**
  - activación (predicciones);
  - generación: el estudiante reescribe cada ejemplo defectuoso antes de abrir la propuesta;
  - comparación con un modelo;
  - transferencia: decidir sobre un distractor «Todas las anteriores».
- **Uso:** 30–40 min. Ejemplos en parejas (uno reescribe y el otro revisa), ficha individual y revisión cruzada
  de las fichas exportadas en JSON.
- **Cómo saber si funciona:** en la revisión cruzada, si el revisor detecta los problemas que recoge la lista;
  también los aciertos en las preguntas de aplicación y transferencia.
- **Límites:** los ejemplos son ítems breves y aislados; no hay práctica con una escala completa ni con datos.

### 02 · Análisis de ítems

- **Objetivo:** calcular e interpretar p (también corregida por azar), ítem-resto, biserial puntual y D, y
  justificar qué ítems revisar sin aplicar un punto de corte de forma automática.
- **Procesos:**
  - cálculo propio antes de ver el resultado de cada calculadora;
  - predicción en la tabla de grupos extremos y distractores;
  - dos cuestionarios (dificultad y homogeneidad), cada uno con una pregunta de transferencia.
- **Uso:** 45–60 min, 8–10 min por sección, con la paginación entre secciones. Grupos extremos en parejas.
- **Cómo saber si funciona:** si las decisiones se justifican con el contenido y no solo con el número, y cuántos
  errores se cometen marcando «seguro».
- **Límites:** las matrices de ejemplo son pequeñas y limpias; los datos reales tienen omisiones y más ruido.

### 03 · Teoría clásica

- **Objetivo:** interpretar una fiabilidad de 0,80, calcular el EEM y un intervalo, predecir con Spearman–Brown y
  elegir un estimador de fiabilidad para un caso.
- **Procesos:**
  - predicción de Spearman–Brown antes de ver el resultado, repetible con otros parámetros;
  - simulación de formas paralelas;
  - transferencia: comparar a dos personas y alargar un test para decisiones individuales;
  - autoexplicación sobre por qué duplicar no duplica la fiabilidad.
- **Uso:** 45 min. Modelo y fiabilidad proyectados (10 min); EEM y Spearman–Brown en parejas (15 min); α y dos
  mitades (10 min); cuestionario individual (10 min).
- **Cómo saber si funciona:**
  - la dirección del error en las predicciones de Spearman–Brown (¿sobrestiman la mejora?);
  - los aciertos en las preguntas 7 y 8.
- **Límites:** los datos son simulados con los supuestos del modelo clásico, que en este caso se cumplen.

### 04 · Teoría de respuesta al ítem

- **Objetivo:** relacionar a, b, c y d con la curva, localizar dónde informa más un ítem, interpretar los
  umbrales del modelo graduado y elegir ítems para un punto de corte.
- **Procesos:**
  - en parejas, uno fija los parámetros y el otro predice la curva;
  - predicción del máximo de información antes de verlo;
  - transferencia: elegir ítems para seleccionar al 10 % con más nivel;
  - autoexplicación sobre la precisión condicional.
- **Uso:** 45 min. Dicotómicos (20 min), graduados (10 min), interpretación y cuestionario (15 min).
- **Cómo saber si funciona:**
  - las predicciones del máximo de información con c > 0 (el error típico es responder b);
  - la pregunta sobre el punto de corte.
- **Límites:** parámetros conocidos, sin estimación ni comprobación del ajuste.

### 05 · Análisis factorial exploratorio

- **Objetivo:** justificar la matriz de correlaciones, decidir cuántos factores retener, detectar casos Heywood y
  distinguir extracción y rotación.
- **Procesos:**
  - predicción del número de factores del análisis paralelo;
  - comparación con Kaiser en el ejemplo sin estructura;
  - transferencia: qué hacer con h² = 0,998;
  - autoexplicación sobre la lógica del paralelo.
- **Uso:** 60 min. Supuestos y número de factores (20 min); extracción y rotación, con enlace al laboratorio
  (20 min); informe y cuestionario (20 min).
- **Cómo saber si funciona:** el número de factores predicho frente al del paralelo, y la pregunta del caso
  Heywood.
- **Límites:** la web muestra resultados de R ya calculados para tres conjuntos simulados. Con datos propios se
  usa la app Shiny.

### 5b · Laboratorio de rotación

- **Objetivo:** explicar por qué rotar no cambia h² ni el ajuste, girar ejes hasta una estructura simple, leer
  patrón, estructura y Φ, y justificar si informar una rotación ortogonal u oblicua.
- **Procesos:**
  - predicciones;
  - giro manual antes de compararse con Varimax;
  - ejemplo resuelto que se retira con pistas;
  - comparación de criterios;
  - transferencia a cargas propias;
  - calibración y autoexplicación.
- **Uso:** 25–35 min (detalle en `GUIA-DOCENTE.md`).
- **Cómo saber si funciona:**
  - la dispersión de los ángulos de las parejas;
  - los aciertos en las preguntas de transferencia 4 y 6;
  - los errores marcados como «seguro».
- **Límites:** los ejemplos de dos factores son poblaciones sin error muestral.

### 06 · Análisis factorial confirmatorio

- **Objetivo:** especificar e identificar un modelo, calcular sus gl, interpretar los índices de ajuste como
  evidencias y comparar modelos anidados con la prueba adecuada al estimador.
- **Procesos:**
  - cálculo de los gl antes de verlos;
  - comparación de 1 frente a 3 factores con ML y WLSMV;
  - transferencia: comparar modelos con WLSMV;
  - autoexplicación sobre los límites del CFI.
- **Uso:** 45 min. Fundamentos (10 min), comparación en parejas (20 min), interpretación y cuestionario (15 min).
- **Cómo saber si funciona:** el acierto en los gl (el error típico es olvidar las correlaciones entre factores)
  y la pregunta sobre Δχ² con WLSMV.
- **Límites:** cuatro modelos precalculados; no se especifican modelos libres en la web, sí en la app Shiny.

### Repaso espaciado

- **Objetivo:** recuperar sin apuntes, días después, lo trabajado en cada módulo.
- **Procesos:** práctica de recuperación espaciada que empieza por las preguntas falladas al primer intento. Una
  pregunta sale de la cola cuando se acierta a la primera.
- **Uso:** 10 min, una semana después de cada módulo, en casa o al empezar la clase siguiente.
- **Cómo saber si funciona:** compara el acierto al primer intento en el repaso con el del módulo (con el CSV).
- **Límites:** la cola vive en el navegador del estudiante. Se pierde si borra los datos o cambia de equipo.

## Cómo evaluar si la herramienta funciona

La herramienta está diseñada para movilizar predicción, generación, recuperación y calibración. **Su efecto en
el aprendizaje no se ha evaluado.** Para comprobarlo con un grupo:

1. **Datos de cada estudiante.** Cada estudiante descarga el CSV del cuestionario con un código propio. Las
   columnas son: código, módulo, pregunta, tipo, acierto al primer intento, intentos, seguridad y fecha. Se
   recoge en el aula virtual, no en la web.
2. **Qué comparar.**
   - El acierto en las preguntas de **transferencia** frente a las de recuerdo.
   - El acierto en el **repaso** una semana después frente al del módulo.
   - La proporción de errores con «seguro», que debería bajar entre módulos si mejora la calibración.
3. **Comparación causal.** Requiere un diseño con grupo de comparación (por ejemplo, la mitad del grupo hace
   primero el módulo con el resultado visible y después al revés) y una prueba posterior común. Si los
   resultados se van a publicar, hace falta consentimiento informado y separar estos datos de la calificación.

## Límites conocidos

- **Datos de ejemplo.** Son simulados y más limpios que los reales; se avisa en cada módulo.
- **Respuestas abiertas.** No se corrigen: el estudiante compara la suya con un modelo. La puesta en común en
  clase es la que detecta los errores.
- **Seguridad del registro.** El CSV lo genera el propio estudiante. No es un registro seguro ni sirve para
  calificar.
- **Lo que no se cambió.**
  - Los textos explicativos largos de Análisis de ítems y AFE: están segmentados en pestañas, pero algunas
    pestañas siguen siendo densas.
  - El orden de los apartados de cada módulo.
