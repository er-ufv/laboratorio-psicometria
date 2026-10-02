/*
 * Banco de predicciones (activación) y preguntas (recuperación) de todos los módulos.
 * Cada opción lleva su explicación: por qué es correcta o por qué atrae si no lo es.
 * tipo: "recuerdo" | "aplicacion" | "transferencia". id: estable, para el repaso espaciado.
 * Para añadir preguntas basta con seguir el mismo formato; repaso.html las recoge automáticamente.
 */
(function (root) {
  "use strict";
  root.Predicciones = {
    diseno: [
      {
        q: "Invertir la mitad de los ítems de una escala…",
        o: [
          [
            "elimina la aquiescencia.",
            "Invertir no la elimina por sí solo y puede introducir errores de lectura y factores de método.",
          ],
          [
            "no controla por sí solo la aquiescencia y puede traer otros problemas.",
            "Correcto: es una medida parcial; los ítems inversos mal redactados confunden y pueden formar un factor aparte.",
          ],
          [
            "solo funciona con siete categorías.",
            "El número de categorías no tiene relación con el control de la aquiescencia.",
          ],
        ],
        a: 1,
      },
      {
        q: "Antes de redactar el primer ítem hay que decidir…",
        o: [
          [
            "el número total de ítems.",
            "La longitud se ajusta después, según la tabla de especificaciones y la fiabilidad buscada.",
          ],
          [
            "el constructo, la población y el uso de las puntuaciones.",
            "Correcto: sin esa definición no se puede juzgar si un ítem es adecuado.",
          ],
          [
            "el formato de respuesta.",
            "El formato depende de lo que se quiere medir y en quién; va después de definirlo.",
          ],
        ],
        a: 1,
      },
      {
        q: "En elección múltiple, ¿cuántas opciones necesita un buen ítem?",
        o: [
          [
            "Siempre cinco.",
            "Más opciones no ayudan si no son plausibles: un distractor que nadie elige solo alarga el ítem.",
          ],
          [
            "Suelen bastar tres opciones plausibles.",
            "Correcto: es la recomendación razonada de la literatura, no una regla universal.",
          ],
          ["Cuantas más, mejor.", "Cada distractor débil añade tiempo de lectura sin mejorar la medida."],
        ],
        a: 1,
      },
    ],
    analisis: [
      {
        q: "Un ítem que acierta el 95 % de las personas…",
        o: [
          ["es siempre un mal ítem.", "Depende del propósito: en una prueba de mínimos puede ser útil."],
          [
            "aporta poca varianza y discrimina poco en esa población, aunque puede tener sentido según el propósito.",
            "Correcto: p(1 − p) es pequeña con p = 0,95, lo que limita su relación con el total.",
          ],
          ["es el mejor ítem posible.", "Si casi todos aciertan, apenas diferencia entre personas."],
        ],
        a: 1,
      },
      {
        q: "Comparada con la correlación ítem-resto, la correlación ítem-total suele ser…",
        o: [
          ["mayor.", "Correcto: el total incluye al propio ítem y eso infla la correlación (efecto parte-todo)."],
          ["menor.", "Al revés: la ítem-total contiene al ítem y por eso sale más alta."],
          ["igual.", "Solo coinciden de forma aproximada en tests muy largos; en general la ítem-total es mayor."],
        ],
        a: 0,
      },
      {
        q: "Un distractor que eligen más quienes más saben…",
        o: [
          ["es un distractor eficaz.", "Un buen distractor atrae más a quienes saben menos."],
          [
            "es una señal de alarma: puede haber ambigüedad o un error de clave.",
            "Correcto: hay que revisar el contenido antes de decidir.",
          ],
          ["no tiene importancia.", "Afecta a la discriminación del ítem y puede indicar dos respuestas defendibles."],
        ],
        a: 1,
      },
    ],
    tct: [
      {
        q: "Si un test tiene fiabilidad 0,90, el error de medida de una persona…",
        o: [
          ["es nulo.", "Con r < 1 siempre hay error; su tamaño típico es el EEM = S_X·√(1 − r)."],
          [
            "sigue existiendo y su tamaño depende también de la desviación típica.",
            "Correcto: con S_X = 15, EEM = 15·√0,10 ≈ 4,7 puntos.",
          ],
          [
            "es el 10 % de su puntuación.",
            "La fiabilidad es una proporción de varianzas en la población, no un porcentaje de cada puntuación.",
          ],
        ],
        a: 1,
      },
      {
        q: "Un test tiene fiabilidad 0,50. Si duplicas su longitud con ítems equivalentes, la fiabilidad será…",
        o: [
          ["1,00.", "Spearman–Brown no duplica la fiabilidad: 2·0,50/(1 + 0,50) ≈ 0,67."],
          ["aproximadamente 0,67.", "Correcto: kr/[1 + (k − 1)r] con k = 2."],
          ["la misma, 0,50.", "Con material paralelo, alargar mejora la fiabilidad."],
        ],
        a: 1,
      },
      {
        q: "Un α de 0,90 demuestra que el test es unidimensional.",
        o: [
          ["Verdadero.", "α puede ser alto en una escala multidimensional, sobre todo si es larga."],
          [
            "Falso.",
            "Correcto: la dimensionalidad se estudia con evidencias de estructura interna, como el análisis factorial.",
          ],
        ],
        a: 1,
      },
    ],
    tri: [
      {
        q: "En TRI, la precisión de un test…",
        o: [
          [
            "es la misma para todas las personas.",
            "Esa es la idea de un EEM único de la TCT; en TRI la precisión depende del nivel.",
          ],
          [
            "varía según el nivel del rasgo θ.",
            "Correcto: la información del test, y con ella el error, cambia a lo largo de θ.",
          ],
          ["solo depende del número de ítems.", "Depende de qué ítems y de dónde informan, no solo de cuántos hay."],
        ],
        a: 1,
      },
      {
        q: "Un ítem difícil informa sobre todo de…",
        o: [
          ["personas con nivel alto de θ.", "Correcto: su información se concentra cerca de su dificultad b."],
          [
            "personas con nivel bajo de θ.",
            "Casi todas las personas de nivel bajo fallan el ítem difícil: apenas las diferencia.",
          ],
          ["todas por igual.", "La información de un ítem tiene forma de campana alrededor de su localización."],
        ],
        a: 0,
      },
      {
        q: "En el modelo de tres parámetros, c representa…",
        o: [
          ["la dificultad del ítem.", "La dificultad es b."],
          [
            "la asíntota inferior: probabilidad de acierto de quien tiene un nivel muy bajo.",
            "Correcto: suele llamarse parámetro de conjetura, aunque no identifica por sí solo el mecanismo de adivinación.",
          ],
          ["la discriminación.", "La discriminación es a, la pendiente."],
        ],
        a: 1,
      },
    ],
    afe: [
      {
        q: "La regla «retener los factores con autovalor mayor que 1»…",
        o: [
          ["acierta casi siempre.", "Con frecuencia sobreestima, y a veces infraestima, el número de factores."],
          [
            "puede sobreestimar o infraestimar; conviene contrastarla con el análisis paralelo y la teoría.",
            "Correcto: en el ejemplo de variables independientes sugeriría 4 factores donde no hay ninguno.",
          ],
          ["es la única opción válida.", "Hay criterios mejores; ninguno decide solo."],
        ],
        a: 1,
      },
      {
        q: "Un factor se nombra…",
        o: [
          [
            "con la etiqueta que propone el programa.",
            "El programa solo numera los factores (F1, F2…); el orden es arbitrario.",
          ],
          [
            "por el contenido común de los ítems que lo definen.",
            "Correcto: el nombre es una interpretación que hay que justificar.",
          ],
          ["por el ítem con la carga más alta.", "Un solo ítem rara vez representa todo el factor."],
        ],
        a: 1,
      },
      {
        q: "Un KMO alto indica que…",
        o: [
          ["el test es unidimensional.", "El KMO no informa del número de factores."],
          [
            "hay suficiente varianza común para que el AFE tenga sentido.",
            "Correcto: compara correlaciones con correlaciones parciales.",
          ],
          ["el modelo ajusta bien.", "El KMO se calcula antes de estimar ningún modelo."],
        ],
        a: 1,
      },
    ],
    afc: [
      {
        q: "Un CFI de 0,96 demuestra que el modelo es el verdadero.",
        o: [
          [
            "Verdadero.",
            "Es evidencia de ajuste relativo frente a un modelo de independencia; puede haber modelos alternativos igual de buenos.",
          ],
          [
            "Falso.",
            "Correcto: el ajuste es necesario, pero no basta; se completa con residuos, teoría y replicación.",
          ],
        ],
        a: 1,
      },
      {
        q: "Si liberas más parámetros en un modelo, sus grados de libertad…",
        o: [
          ["aumentan.", "Al revés: gl = momentos − parámetros libres."],
          ["disminuyen.", "Correcto: cada parámetro libre consume un grado de libertad."],
          ["no cambian.", "Cambian siempre que cambie el número de parámetros estimados."],
        ],
        a: 1,
      },
      {
        q: "Lo que distingue el AFC del AFE es que en el AFC…",
        o: [
          [
            "la estructura se especifica antes de ajustar el modelo.",
            "Correcto: se decide qué cargas son libres y cuáles se fijan a cero.",
          ],
          ["no hay cargas factoriales.", "Hay cargas, pero muchas se fijan a cero por hipótesis."],
          [
            "no se calculan índices de ajuste.",
            "El AFC sí ofrece pruebas e índices de ajuste del modelo especificado.",
          ],
        ],
        a: 0,
      },
    ],
  };

  root.Preguntas = {
    diseno: [
      {
        id: "dis-01",
        tipo: "aplicacion",
        q: "«Organizo mis apuntes y disfruto trabajando en grupo». ¿Qué problema principal tiene este ítem?",
        o: [
          [
            "Doble contenido: pregunta dos cosas a la vez.",
            "Correcto: quien organiza sus apuntes pero no disfruta en grupo no sabe qué responder. Se divide en dos ítems.",
          ],
          [
            "Es demasiado corto para recoger bien la conducta.",
            "La longitud no es el problema; lo es que mezcle dos conductas distintas.",
          ],
          ["Usa una negación que dificulta la respuesta.", "No hay ninguna negación; el fallo es el doble contenido."],
        ],
        a: 0,
        pista: "Piensa en alguien que hace una de las dos cosas y no la otra.",
      },
      {
        id: "dis-02",
        tipo: "recuerdo",
        q: "¿Qué recoge una tabla de especificaciones?",
        o: [
          [
            "Cuántos ítems corresponden a cada contenido o dimensión.",
            "Correcto: asegura que el test cubre el constructo con el peso previsto.",
          ],
          ["Las puntuaciones que obtuvo cada participante en el pilotaje.", "Eso son datos, no un plan de diseño."],
          [
            "Los índices de dificultad y discriminación de cada ítem.",
            "Los índices se calculan después, con datos del pilotaje.",
          ],
        ],
        a: 0,
      },
      {
        id: "dis-03",
        tipo: "transferencia",
        q: "Diseñas un examen de opción múltiple y un distractor dice «Todas las anteriores son correctas». ¿Qué harías?",
        o: [
          [
            "Mantenerlo: aumenta la dificultad del examen.",
            "Añade dificultad irrelevante: basta con reconocer dos opciones correctas para deducir la respuesta.",
          ],
          [
            "Cambiarlo por un distractor basado en un error frecuente.",
            "Correcto: «todas/ninguna de las anteriores» da pistas y rompe la autonomía de las opciones.",
          ],
          ["Añadir también «Ninguna de las anteriores» para equilibrar.", "Suma otra opción con el mismo problema."],
        ],
        a: 1,
        pista: "¿Qué pasa si el estudiante sabe que dos de las opciones son correctas?",
      },
      {
        id: "dis-04",
        tipo: "aplicacion",
        q: "Revisas una escala Likert con la ayuda de expertos. ¿Qué demuestra haber marcado todos los criterios de la lista de revisión?",
        o: [
          [
            "Que la escala es válida para el uso previsto.",
            "La validez requiere evidencias empíricas sobre el uso de las puntuaciones.",
          ],
          [
            "Que la revisión está documentada; faltan datos.",
            "Correcto: la lista organiza el trabajo, no acredita fiabilidad ni validez.",
          ],
          [
            "Que la escala es fiable y puede aplicarse ya.",
            "La fiabilidad se estima con datos, no con una lista de comprobación.",
          ],
        ],
        a: 1,
      },
    ],
    analisis_dif: [
      {
        id: "dif-01",
        tipo: "aplicacion",
        q: "Un ítem tiene 15 aciertos de 20 personas que lo contestaron. ¿Cuál es su índice de dificultad?",
        o: [
          ["p = 0,25", "Es la proporción de fallos (5/20), no de aciertos."],
          ["p = 0,50", "Sería con 10 aciertos."],
          ["p = 0,75", "Correcto: p = A/N = 15/20. Valores altos indican un ítem fácil."],
          ["p = 0,15", "Has usado los aciertos sin dividir entre N."],
        ],
        a: 2,
        pista: "p = aciertos / personas que respondieron.",
      },
      {
        id: "dif-02",
        tipo: "recuerdo",
        q: "¿Cuándo es máxima la varianza de un ítem dicotómico?",
        o: [
          ["Cuando p = 0", "Si nadie acierta no hay variación: s² = 0."],
          [
            "Cuando p = 0,5",
            "Correcto: s²_j = p·q alcanza su máximo, 0,25, con p = 0,5. Máxima varianza no garantiza máxima discriminación.",
          ],
          ["Cuando p = 1", "Si todos aciertan tampoco hay variación."],
          ["No depende de p", "En un ítem 0/1, la varianza es p(1 − p): depende solo de p."],
        ],
        a: 1,
      },
      {
        id: "dif-03",
        tipo: "recuerdo",
        q: "¿En qué tipo de prueba se aplica el índice de dificultad?",
        o: [
          [
            "En cualquier test psicológico, sea cual sea el formato.",
            "En escalas de personalidad o actitudes no hay respuestas correctas.",
          ],
          ["En tests de rendimiento óptimo (aciertos y errores).", "Correcto: aptitudes, conocimientos, inteligencia."],
          ["En escalas Likert, a partir de la media del ítem.", "La media de un ítem Likert no es una «dificultad»."],
          [
            "En tests de personalidad con formato dicotómico.",
            "La proporción de «sí» en un ítem de personalidad es su popularidad, no una dificultad: no hay respuesta correcta.",
          ],
        ],
        a: 1,
      },
      {
        id: "dif-04",
        tipo: "aplicacion",
        q: "Un ítem de 4 opciones tiene p = 0,60 y 8 errores en 20 personas. ¿Cuál es p corregido?",
        o: [
          ["p^c ≈ 0,47", "Correcto: p^c = p − (F/N)/(k − 1) = 0,60 − (8/20)/3 ≈ 0,47."],
          ["p^c ≈ 0,53", "Revisa el cálculo: se resta (F/N)/(k − 1) = 0,40/3 ≈ 0,13, no una cantidad menor."],
          ["p^c ≈ 0,73", "La corrección resta aciertos esperables por azar: p^c no puede ser mayor que p."],
          ["p^c ≈ 0,35", "Restas demasiado: la corrección es (F/N)/(k − 1) = 0,40/3 ≈ 0,13."],
        ],
        a: 0,
        pista: "Resta a p la proporción de errores dividida entre k − 1.",
      },
      {
        id: "dif-05",
        tipo: "transferencia",
        q: "Diseñas ítems de 4 opciones en los que se puede adivinar. ¿Qué dificultad deja, aproximadamente, más margen para discriminar?",
        o: [
          ["p ≈ 0,25", "Es el nivel del azar: el ítem no diferenciaría a quien sabe de quien adivina."],
          ["p ≈ 0,50", "Es la referencia sin azar. Con 4 opciones, parte del 0,50 son aciertos por adivinación."],
          ["p ≈ 0,625", "Correcto: (1 + 1/k)/2, a medio camino entre el azar (0,25) y el acierto seguro."],
          ["p ≈ 0,90", "Un ítem tan fácil discrimina poco."],
        ],
        a: 2,
        pista: "Busca el punto medio entre el acierto por azar y el acierto seguro.",
      },
    ],
    analisis_hom: [
      {
        id: "hom-01",
        tipo: "aplicacion",
        q: "Un ítem de un test de ansiedad tiene r = −0,45 con el total. ¿Cuál es la explicación más probable?",
        o: [
          ["El ítem es muy fácil.", "La facilidad reduce la correlación, pero no la vuelve negativa."],
          [
            "Es un ítem inverso que no se ha recodificado.",
            "Correcto: discrimina, pero al revés. Recodifica (x′ = mín + máx − x) y recalcula.",
          ],
          ["El ítem mide ansiedad perfectamente.", "Una correlación negativa indica la dirección contraria."],
          [
            "El tamaño muestral es insuficiente.",
            "Una muestra pequeña da estimaciones inestables, pero una r de −0,45 apunta a la codificación.",
          ],
        ],
        a: 1,
      },
      {
        id: "hom-02",
        tipo: "recuerdo",
        q: "¿Qué valor se usa a menudo como referencia orientativa para revisar un ítem por su correlación ítem-resto?",
        o: [
          ["r < 0,10", "Es más estricto que la convención habitual."],
          ["r < 0,20", "Algunos autores lo usan, pero la convención más citada es otra."],
          ["r < 0,30", "Correcto: es una convención frecuente (Nunnally y Bernstein, 1994), no una regla universal."],
          ["r < 0,50", "Llevaría a revisar casi todos los ítems de muchas escalas válidas."],
        ],
        a: 2,
      },
      {
        id: "hom-03",
        tipo: "recuerdo",
        q: "¿Por qué se calcula la correlación ítem-resto?",
        o: [
          ["Para incluir dos veces el propio ítem en el cálculo.", "Es justo al revés: se excluye el ítem."],
          [
            "Para quitar el ítem del total con el que se correlaciona.",
            "Correcto: elimina la relación parte-todo que infla la ítem-total.",
          ],
          [
            "Para eliminar los errores aleatorios de la puntuación total.",
            "No corrige el error de medida; solo evita contar el ítem dos veces.",
          ],
          [
            "Para sustituir la revisión de contenido por un criterio empírico.",
            "Ningún índice sustituye la revisión del contenido.",
          ],
        ],
        a: 1,
      },
      {
        id: "hom-04",
        tipo: "recuerdo",
        q: "Un ítem se puntúa 0/1. Su correlación de Pearson con el total es…",
        o: [
          [
            "la correlación biserial-puntual (r_bp).",
            "Correcto: con un ítem 0/1, Pearson y r_bp = (M_p − M_q)/S_X·√(pq) son el mismo número.",
          ],
          [
            "el índice D de grupos extremos.",
            "D es una diferencia de proporciones entre grupos extremos, no una correlación.",
          ],
          ["la correlación biserial.", "La biserial supone una variable normal subyacente y da valores mayores."],
          ["el coeficiente alfa del test.", "α se refiere al test completo, no a un ítem."],
        ],
        a: 0,
      },
      {
        id: "hom-05",
        tipo: "transferencia",
        q: "En un ítem de 4 opciones, el distractor C lo elige el 40 % del grupo superior y el 10 % del inferior. ¿Qué haces?",
        o: [
          [
            "Nada: es un distractor muy atractivo, luego funciona.",
            "Atrae a quien más sabe: eso es justo lo contrario de un buen distractor.",
          ],
          [
            "Revisar si C también es defendible o si el enunciado es ambiguo.",
            "Correcto: puede ser una segunda respuesta válida, un error de clave o ambigüedad.",
          ],
          ["Eliminar el ítem sin revisarlo.", "Primero hay que entender el problema: puede bastar con reescribir C."],
          ["Añadir un quinto distractor.", "No resuelve que C atraiga al grupo superior."],
        ],
        a: 1,
        pista: "Un buen distractor atrae más a quienes saben menos.",
      },
    ],
    tct: [
      {
        id: "tct-01",
        tipo: "recuerdo",
        q: "Si la fiabilidad es 0,80, ¿qué significa?",
        o: [
          ["El 80 % de las respuestas al test son correctas.", "La fiabilidad no habla de aciertos sino de varianzas."],
          [
            "El 80 % de la varianza observada es varianza verdadera.",
            "Correcto: bajo el modelo clásico es una proporción de varianzas en la población, no la exactitud individual.",
          ],
          [
            "Cada puntuación individual contiene un 20 % de error.",
            "No se reparte por persona: el error de cada persona varía; su tamaño típico es el EEM.",
          ],
        ],
        a: 1,
      },
      {
        id: "tct-02",
        tipo: "recuerdo",
        q: "¿Un α alto demuestra que el test mide una sola dimensión?",
        o: [
          [
            "Sí: un α alto indica que todos los ítems miden lo mismo.",
            "α aumenta con la longitud y con la correlación media entre ítems, aunque haya varias dimensiones.",
          ],
          [
            "Solo si α supera 0,90, porque entonces los ítems son homogéneos.",
            "Ningún umbral lo garantiza: con muchos ítems, dos factores correlacionados pueden dar α > 0,90.",
          ],
          [
            "No: hacen falta evidencias de estructura interna (AFE o AFC).",
            "Correcto: α supone la unidimensionalidad, no la demuestra; la estructura se estudia con análisis factorial.",
          ],
        ],
        a: 2,
      },
      {
        id: "tct-03",
        tipo: "aplicacion",
        q: "Con la misma desviación típica observada, ¿qué ocurre con el EEM al aumentar la fiabilidad?",
        o: [
          ["Disminuye.", "Correcto: EEM = S_X·√(1 − r); al aumentar r, baja la parte atribuida al error."],
          ["Aumenta.", "Revisa la fórmula: √(1 − r) disminuye cuando r crece."],
          ["No cambia.", "Solo no cambiaría si cambiase también S_X en sentido contrario."],
        ],
        a: 0,
      },
      {
        id: "tct-04",
        tipo: "recuerdo",
        q: "¿Spearman–Brown garantiza la mejora al añadir cualquier ítem?",
        o: [
          [
            "Sí, siempre que aumente el número de ítems del test.",
            "La fórmula supone ítems paralelos y errores independientes; un ítem malo puede empeorar el test.",
          ],
          [
            "Sí, si al menos se duplica el número de ítems originales.",
            "El factor de alargamiento no cambia el supuesto: los ítems añadidos deben ser paralelos a los originales.",
          ],
          [
            "No: depende de cómo sean los ítems que se añaden.",
            "Correcto: la predicción supone ítems paralelos; la longitud por sí sola no garantiza la mejora.",
          ],
        ],
        a: 2,
      },
      {
        id: "tct-05",
        tipo: "aplicacion",
        q: "Las dos mitades de un test correlacionan 0,60. ¿Qué fiabilidad estima Spearman–Brown para el test completo?",
        o: [
          ["0,60", "Esa es la fiabilidad de una mitad; el test completo tiene el doble de longitud."],
          ["0,75", "Correcto: 2·0,60/(1 + 0,60) = 0,75."],
          ["0,36", "Has elevado al cuadrado; Spearman–Brown no hace eso."],
        ],
        a: 1,
        pista: "Aplica kr/[1 + (k − 1)r] con k = 2.",
      },
      {
        id: "tct-06",
        tipo: "aplicacion",
        q: "Con r = 0,80, una persona obtiene 130 en una escala de media 100. ¿Cuál es su puntuación verdadera estimada por Kelley?",
        o: [
          [
            "130: la observada es la mejor estimación.",
            "Con r < 1, la estimación se acerca a la media (regresión hacia la media).",
          ],
          ["124", "Correcto: T′ = 0,80·130 + 0,20·100 = 124."],
          ["104", "Se acercaría tanto a la media solo con una fiabilidad muy baja."],
        ],
        a: 1,
        pista: "T′ = r·X + (1 − r)·media.",
      },
      {
        id: "tct-07",
        tipo: "transferencia",
        q: "Dos personas difieren 15 puntos en un test con EEM = 6,7. ¿Basta para afirmar, al 95 %, que difieren en T?",
        o: [
          [
            "Sí: 15 es más del doble del EEM.",
            "La diferencia acumula el error de las dos puntuaciones: hay que usar el error de la diferencia.",
          ],
          [
            "No: con un EEM de 6,7 ninguna diferencia sería fiable.",
            "Sí puede serlo: con este error, una diferencia mayor que unos 18,6 puntos sería significativa al 95 %.",
          ],
          [
            "No: el error de la diferencia es mayor que el EEM.",
            "Correcto: S_d = √(6,7² + 6,7²) ≈ 9,5 y 1,96·9,5 ≈ 18,6 > 15.",
          ],
        ],
        a: 2,
        pista: "¿Cuántas puntuaciones con error intervienen en una diferencia?",
      },
      {
        id: "tct-08",
        tipo: "transferencia",
        q: "Un departamento quiere usar un test de 10 ítems (r = 0,70) para decisiones individuales y pide al menos 0,90. ¿Qué le propones?",
        o: [
          [
            "Usarlo tal cual: 0,70 es aceptable para cualquier uso.",
            "Para decisiones individuales suele pedirse más precisión: el intervalo de cada persona sería amplio.",
          ],
          [
            "Alargarlo con ítems equivalentes hasta unos 39 ítems.",
            "Correcto: k = 0,90·0,30/(0,70·0,10) ≈ 3,86, es decir, unos 39 ítems, si el material añadido es paralelo.",
          ],
          [
            "Duplicarlo: con 20 ítems equivalentes llegará a 0,90.",
            "Con k = 2: 2·0,70/1,70 ≈ 0,82, todavía por debajo de 0,90.",
          ],
        ],
        a: 1,
        pista: "Usa la longitud mínima del apartado 04: k = r_meta(1 − r)/[r(1 − r_meta)].",
      },
    ],
    tri: [
      {
        id: "tri-01",
        tipo: "aplicacion",
        q: "En un 3PL con c = 0,20, ¿qué vale P en θ = b?",
        o: [
          ["0,50", "Eso solo ocurre si c = 0 y d = 1."],
          ["0,60", "Correcto: P(b) = (c + 1)/2 = 0,60; b marca el punto medio entre las asíntotas."],
          ["0,20", "0,20 es la asíntota inferior, a la que se acerca P en niveles muy bajos."],
        ],
        a: 1,
        pista: "En θ = b la curva está a medio camino entre c y 1.",
      },
      {
        id: "tri-02",
        tipo: "aplicacion",
        q: "Si la información del test aumenta de 4 a 9, su error condicional…",
        o: [
          ["pasa de 0,50 a 0,33, aproximadamente.", "Correcto: EE ≈ 1/√I: 1/√4 = 0,50 y 1/√9 ≈ 0,33."],
          ["pasa de 0,25 a 0,11, aproximadamente.", "Has usado 1/I en lugar de 1/√I."],
          [
            "no cambia, porque solo depende de θ.",
            "El error condicional depende de θ a través de la información: más información en ese θ, menos error.",
          ],
        ],
        a: 0,
      },
      {
        id: "tri-03",
        tipo: "recuerdo",
        q: "En el modelo de respuesta graduada, ¿qué significa θ = b₂?",
        o: [
          ["P(X = 2) = 0,50", "El umbral se refiere a una probabilidad acumulada, no a una categoría aislada."],
          [
            "La categoría 2 es siempre la más probable.",
            "Depende de los demás umbrales: la categoría 2 puede no ser la más probable en ese punto.",
          ],
          [
            "P(X ≥ 2) = 0,50",
            "Correcto: b₂ localiza el punto en que responder 2 o más es tan probable como responder menos.",
          ],
        ],
        a: 2,
      },
      {
        id: "tri-04",
        tipo: "aplicacion",
        q: "En un 2PL con a = 1,5 y D = 1, ¿dónde informa más el ítem y cuánto?",
        o: [
          ["En θ = b, con I = 0,5625", "Correcto: en el 2PL el máximo está en θ = b e Imax = D²a²/4 = 2,25/4."],
          ["En θ = 0, con I = 1,5", "El máximo no está en 0 salvo que b = 0, y no vale a."],
          ["En θ = b, con I = 0,25", "0,25 sería el máximo con a = 1."],
        ],
        a: 0,
        pista: "En el máximo, P = 0,5 y P(1 − P) = 0,25.",
      },
      {
        id: "tri-05",
        tipo: "transferencia",
        q: "Si cambiamos la escala a θ* = 2θ, ¿qué parámetros dejan iguales todas las probabilidades?",
        o: [
          ["a* = 2a y b* = b", "Así la pendiente efectiva se multiplicaría por 4."],
          [
            "a* = a/2 y b* = 2b",
            "Correcto: a*(θ* − b*) = (a/2)(2θ − 2b) = a(θ − b). La escala de θ se fija por convenio.",
          ],
          [
            "Ninguno: la escala de θ es única.",
            "La escala está indeterminada; por eso se fija la media y la varianza de θ.",
          ],
        ],
        a: 1,
      },
      {
        id: "tri-06",
        tipo: "recuerdo",
        q: "¿Cuándo se pueden sumar las informaciones de los ítems?",
        o: [
          ["Si todos tienen la misma dificultad.", "No hace falta; la suma depende de otra condición."],
          ["Bajo independencia local en el modelo.", "Correcto: las respuestas deben ser independientes dado θ."],
          ["Solo en el 1PL.", "Vale para cualquier modelo que cumpla independencia local."],
        ],
        a: 1,
      },
      {
        id: "tri-07",
        tipo: "transferencia",
        q: "Necesitas un test para seleccionar al 10 % con más nivel (θ ≈ 1,3). ¿Qué ítems elegirías?",
        o: [
          ["Ítems con b cerca de 1,3 y a alta.", "Correcto: concentran la información donde se toma la decisión."],
          [
            "Ítems con b repartidas por toda la escala.",
            "Esa estrategia sirve para medir bien a todos, no para decidir en un punto.",
          ],
          [
            "Ítems fáciles, con b ≈ −1, para que nadie se frustre.",
            "Informarían sobre niveles bajos, lejos del punto de corte.",
          ],
        ],
        a: 0,
        pista: "¿En qué zona de θ necesitas menos error?",
      },
    ],
    afe: [
      {
        id: "afe-01",
        tipo: "recuerdo",
        q: "¿Qué determina la comunalidad en una rotación oblicua?",
        o: [
          [
            "Solo la suma de las cargas de patrón al cuadrado.",
            "Eso vale para rotaciones ortogonales; en oblicuas faltan los términos de Φ.",
          ],
          [
            "La suma de las cargas de estructura al cuadrado.",
            "Las cargas de estructura incluyen la parte compartida con otros factores: h² = Σ p·s, no Σ s².",
          ],
          ["La diagonal de ΛΦΛ′.", "Correcto: h² = Σp² + 2Σφpp′; las correlaciones entre factores intervienen."],
        ],
        a: 2,
      },
      {
        id: "afe-02",
        tipo: "recuerdo",
        q: "¿Un Bartlett significativo demuestra unidimensionalidad?",
        o: [
          [
            "Sí: indica que hay un solo factor común en los datos.",
            "Solo contrasta que la matriz de correlaciones difiere de la identidad.",
          ],
          [
            "Sí, siempre que además el índice KMO supere 0,80.",
            "KMO y Bartlett indican si tiene sentido factorizar, no cuántos factores hay.",
          ],
          [
            "No: solo indica que las variables no son independientes.",
            "Correcto: con muestras grandes casi siempre es significativo y no informa del número de factores.",
          ],
        ],
        a: 2,
      },
      {
        id: "afe-03",
        tipo: "aplicacion",
        q: "El análisis paralelo sugiere cero factores. ¿Qué haces?",
        o: [
          ["Forzar al menos un factor.", "Un factor sin varianza común solo describe ruido."],
          [
            "Retener los factores con autovalor > 1 (regla de Kaiser).",
            "Kaiser sobreestima el número de factores; con datos sin estructura retendría factores de ruido.",
          ],
          [
            "Revisar si existe varianza común y contrastarlo con la teoría.",
            "Correcto: es lo que muestra el ejemplo de variables independientes (KMO < 0,50).",
          ],
        ],
        a: 2,
      },
      {
        id: "afe-04",
        tipo: "aplicacion",
        q: "Al pasar de Varimax a Oblimin con los mismos factores, ¿qué cambia?",
        o: [
          [
            "El RMSR y las comunalidades.",
            "Rotar no cambia el ajuste ni h²; lo compruebas en la tabla del apartado 05.",
          ],
          [
            "Nada: solo cambia el nombre de los factores.",
            "Cambian las cargas, el reparto de la varianza y aparece Φ; lo que se mantiene es el ajuste y h².",
          ],
          [
            "El reparto de la varianza entre factores, las cargas y Φ.",
            "Correcto: la rotación redistribuye la misma varianza común.",
          ],
        ],
        a: 2,
      },
      {
        id: "afe-05",
        tipo: "transferencia",
        q: "En tu AFE, un ítem tiene h² = 0,998 y aparece en la tabla como «solución impropia». ¿Qué haces?",
        o: [
          [
            "Interpretarlo: es el ítem que mejor mide el factor.",
            "Una comunalidad casi igual a 1 deja la unicidad en cero: es un caso Heywood, no un ítem perfecto.",
          ],
          [
            "Revisar factores, método y muestra antes de interpretar.",
            "Correcto: suele indicar sobreextracción, muestra pequeña o un problema en los datos.",
          ],
          [
            "Eliminar el ítem del análisis y seguir con el resto.",
            "Antes hay que entender la causa; eliminar a ciegas puede ocultar el problema.",
          ],
        ],
        a: 1,
        pista: "¿Cuánto vale u² = 1 − h² en ese ítem?",
      },
    ],
    afc: [
      {
        id: "afc-01",
        tipo: "recuerdo",
        q: "¿Un buen CFI prueba que el modelo es verdadero?",
        o: [
          [
            "Sí: con CFI ≥ 0,95 el modelo es el correcto.",
            "Es evidencia de ajuste relativo; puede haber modelos alternativos con ajuste similar.",
          ],
          [
            "Sí, siempre que además χ² no sea significativo.",
            "No rechazar el modelo no lo hace verdadero; con muestras pequeñas χ² tiene poca potencia.",
          ],
          [
            "No: faltan residuos, parámetros, teoría y replicación.",
            "Correcto: un buen ajuste global es compatible con modelos equivalentes o alternativos.",
          ],
        ],
        a: 2,
      },
      {
        id: "afc-02",
        tipo: "aplicacion",
        q: "Con 9 indicadores continuos y tres factores relacionados de estructura simple, ¿cuántos gl tiene el modelo?",
        o: [
          ["45", "45 son los momentos (varianzas y covarianzas), no los gl."],
          ["24", "Correcto: 45 − (9 cargas + 9 varianzas residuales + 3 correlaciones) = 24."],
          ["36", "Has restado solo las cargas y las varianzas residuales; faltan las 3 correlaciones."],
        ],
        a: 1,
        pista: "gl = momentos − parámetros libres; momentos = p(p + 1)/2.",
      },
      {
        id: "afc-03",
        tipo: "aplicacion",
        q: "Un modelo obtiene CFI = 0,96 y RMSEA = 0,05. ¿Qué concluyes?",
        o: [
          [
            "Es correcto: supera los puntos de corte de Hu y Bentler.",
            "Los puntos de corte son orientativos y se derivaron en condiciones concretas (ML, datos continuos).",
          ],
          [
            "Hay que rechazarlo: un buen modelo tendría RMSEA = 0.",
            "RMSEA = 0,05 indica un error de aproximación pequeño; exigir 0 es pedir un ajuste perfecto.",
          ],
          [
            "Ajuste global aceptable; faltan residuos locales y teoría.",
            "Correcto: un ajuste global aceptable puede ocultar problemas locales; revisa también los parámetros y la replicación.",
          ],
        ],
        a: 2,
      },
      {
        id: "afc-04",
        tipo: "recuerdo",
        q: "¿Cómo tratar indicadores ordinales de cinco categorías en este ejemplo?",
        o: [
          [
            "ML normal sobre las categorías, sin revisar supuestos.",
            "ML normal supone variables continuas; con pocas categorías puede sesgar cargas y ajuste.",
          ],
          [
            "Tipificarlos (puntuaciones z) y estimar con ML.",
            "Tipificar no cambia que haya cinco categorías: la distribución sigue siendo discreta y, a menudo, asimétrica.",
          ],
          [
            "Declararlos ordinales y estimar con WLSMV.",
            "Correcto: WLSMV estima con DWLS y corrige la inferencia; los índices se informan en su versión robusta.",
          ],
        ],
        a: 2,
      },
      {
        id: "afc-05",
        tipo: "recuerdo",
        q: "¿Con qué datos se confirma mejor una estructura descubierta en un AFE?",
        o: [
          ["Con la misma muestra.", "Confirmar con los mismos datos favorece el sobreajuste a sus peculiaridades."],
          [
            "Con la misma muestra, pero cambiando de estimador.",
            "Cambiar el estimador no evita el sobreajuste: los datos que sugirieron el modelo no pueden confirmarlo.",
          ],
          [
            "Con una muestra independiente adecuada.",
            "Correcto: reduce el riesgo de confirmar lo que solo era propio de una muestra.",
          ],
        ],
        a: 2,
      },
      {
        id: "afc-06",
        tipo: "transferencia",
        q: "Comparas un modelo de 1 factor y otro de 3 factores con WLSMV. ¿Cómo los comparas?",
        o: [
          [
            "Restando directamente sus χ² escalados y sus gl.",
            "Con WLSMV la diferencia ingenua de χ² escalados no sigue la distribución χ²; hace falta la prueba ajustada.",
          ],
          [
            "Con la prueba de diferencia ajustada y la teoría.",
            "Correcto: el módulo usa la prueba de Satorra (2000), lavTestLRT en lavaan; mira también los índices.",
          ],
          [
            "Con el AIC, eligiendo el modelo con menor valor.",
            "El AIC requiere verosimilitud; con WLSMV no está disponible.",
          ],
        ],
        a: 1,
        pista: "Piensa en qué estimador usas y si su χ² es una verosimilitud.",
      },
    ],
    rotacion: [
      {
        id: "rot-01",
        tipo: "recuerdo",
        q: "Tras rotar con Varimax, la comunalidad h² de un ítem…",
        o: [
          [
            "aumenta si el ítem pasa a cargar más en un solo factor.",
            "Una carga más alta se compensa con otra más baja: el vector del ítem tiene la misma longitud.",
          ],
          [
            "es la misma que sin rotar.",
            "Correcto: h² es la longitud al cuadrado del vector del ítem, que la rotación no cambia.",
          ],
          ["depende de Φ, que en Varimax vale 1.", "En Varimax Φ es la identidad (correlaciones 0, no 1)."],
        ],
        a: 1,
      },
      {
        id: "rot-02",
        tipo: "aplicacion",
        q: "En una solución oblicua, un ítem tiene patrón (0,60; 0,10) y φ = 0,50. ¿Cuál es su correlación con F1?",
        o: [
          ["0,60", "Ese es el patrón: la contribución única de F1. Falta lo que llega a través de F2."],
          ["0,65", "Correcto: s₁ = p₁ + φ·p₂ = 0,60 + 0,50·0,10."],
          ["0,36", "0,36 = 0,60²: la estructura no se obtiene elevando al cuadrado."],
        ],
        a: 1,
        pista: "Usa s₁ = p₁ + φ·p₂.",
      },
      {
        id: "rot-03",
        tipo: "aplicacion",
        q: "Oblimin da φ = 0,04 entre dos factores. ¿Qué es lo más razonable?",
        o: [
          [
            "Repetir con Promax hasta obtener una correlación mayor.",
            "Buscar la rotación que dé el resultado esperado es una forma de sobreajuste.",
          ],
          [
            "Informar cualquiera de las dos: darán cargas casi iguales.",
            "Correcto: con φ ≈ 0 las dos soluciones prácticamente coinciden.",
          ],
          ["Concluir que Oblimin ha fallado y descartar el análisis.", "Oblimin permite la correlación, no la obliga."],
        ],
        a: 1,
      },
      {
        id: "rot-04",
        tipo: "transferencia",
        q: "En una escala de ansiedad y depresión, con Varimax varios ítems de ansiedad cargan 0,30 en depresión; con Oblimin esas cargas bajan a 0,05 y φ = 0,55. ¿Qué haces?",
        o: [
          [
            "Eliminar los ítems de ansiedad con cargas cruzadas en Varimax.",
            "Esas cargas aparecen por obligar a ser independientes a dos factores que correlacionan 0,55.",
          ],
          [
            "Informar Oblimin (patrón, estructura y Φ) y explicar el cambio.",
            "Correcto: las cargas cruzadas venían de la ortogonalidad impuesta; la oblicua describe mejor constructos relacionados y no obliga a descartar ítems sin motivo.",
          ],
          [
            "Elegir Varimax porque da una sola matriz, más fácil de interpretar.",
            "La sencillez no es un criterio: Varimax ignora una correlación de 0,55 y fabrica cargas cruzadas.",
          ],
        ],
        a: 1,
        pista: "¿Qué obliga Varimax a que valga φ?",
      },
      {
        id: "rot-05",
        tipo: "recuerdo",
        q: "¿Puede una rotación mejorar el RMSR o el χ² del modelo factorial?",
        o: [
          [
            "Sí: Oblimin ajusta mejor porque estima más parámetros.",
            "Con el mismo número de factores y la misma extracción, todas las rotaciones reproducen la misma matriz.",
          ],
          [
            "No: la matriz reproducida ΛΦΛ′ + Ψ es la misma con cualquier rotación.",
            "Correcto: rotar solo cambia cómo se describe la misma solución.",
          ],
          ["Solo Promax, porque parte de un objetivo.", "Promax es otra transformación de la misma solución."],
        ],
        a: 1,
      },
      {
        id: "rot-06",
        tipo: "transferencia",
        q: "Tras rotar, todas las cargas de F2 son negativas en ítems de autoestima. ¿Qué significa?",
        o: [
          ["Que los ítems miden lo contrario de la autoestima.", "El signo de un factor es arbitrario."],
          [
            "Nada sustantivo: puede reflejarse F2 (cambiar su signo).",
            "Correcto: se cambia el signo de su columna (y de su fila y columna en Φ); psych::fa lo refleja para que la suma de cargas sea positiva.",
          ],
          [
            "Que hay que invertir la puntuación de esos ítems antes de rotar.",
            "Invertir un ítem es una decisión de codificación previa.",
          ],
        ],
        a: 1,
      },
      {
        id: "rot-07",
        tipo: "recuerdo",
        q: "¿Qué diferencia hay entre la matriz de patrón y la de estructura?",
        o: [
          [
            "El patrón son pesos únicos; la estructura, correlaciones ítem-factor.",
            "Correcto: en oblicuas difieren; en ortogonales coinciden.",
          ],
          [
            "Ninguna en una rotación oblicua: las dos dan las mismas cargas.",
            "Es al revés: coinciden en ortogonales (Φ = I) y difieren en oblicuas.",
          ],
          ["La estructura es el patrón al cuadrado (la varianza explicada).", "La estructura es P·Φ, no P²."],
        ],
        a: 0,
      },
    ],
  };
  root.ModulosPreguntas = {
    diseno: "Diseño de tests",
    analisis_dif: "Análisis de ítems · dificultad",
    analisis_hom: "Análisis de ítems · homogeneidad",
    tct: "Teoría clásica",
    tri: "Respuesta al ítem",
    afe: "Factorial exploratorio",
    rotacion: "Rotación factorial",
    afc: "Factorial confirmatorio",
  };
})(globalThis);
