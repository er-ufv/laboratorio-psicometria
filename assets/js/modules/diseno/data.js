/* Contenido original, sintetizado de las fuentes identificadas en docs/FUENTES.md. */
globalThis.DesignData = {
  sources: [
    {
      id: "abad",
      label:
        "Abad et al. (2011). Medición en ciencias sociales y de la salud. Capítulo 2: Construcción de tests y análisis de ítems, pp. 24–36.",
      note: "Diseño, formatos, redacción y revisión; contraste visual de las páginas del manual.",
    },
    {
      id: "muniz",
      label: "Muñiz y Fonseca-Pedrero (2019). Diez pasos para la construcción de un test. Psicothema, 31, 7–16.",
      note: "Definición, especificaciones, ítems, edición y pilotaje (pp. 8–11).",
    },
    {
      id: "moreno",
      label:
        "Moreno, Martínez y Muñiz (2004). Directrices para la construcción de ítems de elección múltiple. Psicothema, 16, 490–497.",
      note: "Contenido, enunciado y opciones (pp. 493–495).",
    },
    {
      id: "haladyna",
      label:
        "Haladyna, Downing y Rodriguez (2002). A Review of Multiple-Choice Item-Writing Guidelines for Classroom Assessment. Applied Measurement in Education, 15, 309–334.",
      note: "Tabla 1: contenido, formato, enunciado y opciones.",
    },
    {
      id: "blum",
      label:
        "Blum, Lozzia, Abal y Attorresi (2015). Modelización de ítems de matrices figurales y pautas específicas propuestas para su construcción. Anales de Psicología, 31, 733–742.",
      note: "Vincular reglas cognitivas y diseño; recomendaciones específicas para matrices, no universales.",
    },
  ],
  commonSteps: [
    [
      "Delimita el constructo",
      "Describe qué significa la variable, sus dimensiones y sus indicadores observables. Especifica también qué queda fuera. Una etiqueta como «ansiedad» no sustituye una definición operativa.",
      "Escribe: dimensión → conducta o proceso → situación.",
    ],
    [
      "Define población y uso",
      "Determina a quién se dirige, para qué se utilizarán las puntuaciones y en qué condiciones se administrará. Ajusta vocabulario, accesibilidad e instrucciones al contexto.",
      "Una práctica de clase no justifica decisiones clínicas.",
    ],
    [
      "Elabora las especificaciones",
      "Distribuye los ítems entre dimensiones según el modelo y el propósito. Planifica formato, instrucciones y corrección. La tabla de especificaciones permite detectar dominios olvidados.",
      "No todas las dimensiones deben pesar igual: justifica la ponderación.",
    ],
  ],
  types: {
    tipico: {
      title: "¿Cómo suele pensar, sentir o actuar una persona?",
      description:
        "El rendimiento típico describe tendencias habituales. En una escala de autoinforme no hay una respuesta correcta; el formato debe ayudar a expresar la experiencia con precisión.",
      steps: [
        [
          "Redacta una sola idea",
          "Formula indicadores concretos, comprensibles y pertinentes. Evita dos conductas en el mismo ítem, absolutos innecesarios, dobles negaciones y afirmaciones moralizantes.",
          "Los ítems inversos pueden introducir dificultades de comprensión: no son una solución automática a la aquiescencia.",
        ],
        [
          "Ajusta la escala de respuesta",
          "Elige frecuencia, intensidad o acuerdo según lo que pregunta el ítem. Presenta categorías ordenadas, con etiquetas claras y un periodo de referencia cuando sea pertinente.",
          "Un ítem tipo Likert es una respuesta ordinal; una escala requiere varios ítems y evidencias psicométricas.",
        ],
        [
          "Revisa y pilota",
          "Recoge juicios de expertos sobre pertinencia y representatividad. Realiza entrevistas cognitivas para comprobar cómo se entienden enunciados y categorías. Revisa antes y después del pilotaje.",
          "Redactar bien es necesario, pero no garantiza fiabilidad ni validez.",
        ],
      ],
      checks: [
        "El ítem representa una dimensión definida.",
        "El lenguaje es adecuado para la población objetivo.",
        "Pregunta una sola idea o conducta.",
        "Evita negaciones confusas y absolutos innecesarios.",
        "Las categorías se corresponden con lo preguntado.",
        "El periodo de referencia está definido cuando procede.",
        "La redacción evita presión moral y sesgos evitables.",
        "Se ha revisado el contenido con expertos.",
        "Se ha comprobado la comprensión con la población objetivo.",
      ],
      examples: [
        {
          tag: "Doble contenido",
          bad: "Organizo mis apuntes y disfruto trabajando en grupo.",
          good: "Antes de estudiar, organizo los apuntes de la asignatura.",
          why: "Organización y preferencia por el trabajo grupal pueden variar de forma independiente. Dividirlas evita respuestas que mezclan dos indicadores.",
          prompt: "¿Qué dos dimensiones se mezclan?",
          source: "muniz",
        },
        {
          tag: "Negación confusa",
          bad: "No me resulta difícil no posponer las tareas.",
          good: "Pospongo el inicio de las tareas de estudio.",
          why: "Las negaciones encadenadas añaden carga de comprensión. El nuevo ítem expresa directamente la conducta; su dirección de puntuación debe documentarse según el constructo.",
          prompt: "¿Qué significa responder «siempre» al original?",
          source: "muniz",
        },
        {
          tag: "Absolutos",
          bad: "Siempre cumplo todas mis metas y nunca cometo errores.",
          good: "Completo las tareas de estudio que planifico para el día.",
          why: "El original combina perfección, dos conductas y términos absolutos. La revisión permite graduar la frecuencia de una conducta concreta.",
          prompt: "¿Un solo error invalida la respuesta?",
          source: "muniz",
        },
        {
          tag: "Respuesta incoherente",
          bad: "¿Cuántos días de la última semana estudiaste? Respuesta: totalmente en desacuerdo / totalmente de acuerdo.",
          good: "En los últimos siete días, ¿cuántos días estudiaste? Respuesta: 0, 1, 2, 3, 4, 5, 6 o 7.",
          why: "Un recuento requiere categorías numéricas. Este ejemplo muestra un autoinforme de frecuencia, no un ítem Likert. Si se usa acuerdo, debe formularse una afirmación compatible con ese formato.",
          prompt: "¿La respuesta permite contestar la pregunta?",
          source: "muniz",
        },
        {
          tag: "Deseabilidad social",
          bad: "Como toda buena persona, ayudo siempre a mis compañeros.",
          good: "Cuando un compañero me pide ayuda con una tarea, le dedico tiempo.",
          why: "La valoración moral sugiere una respuesta socialmente aceptable. La revisión reduce esa presión; todavía requiere estudio de sesgos y comprensión en la población objetivo.",
          prompt: "¿Qué respuesta parece socialmente exigida?",
          source: "muniz",
        },
        {
          tag: "Ambigüedad",
          bad: "Me siento mal a menudo.",
          good: "Durante las últimas dos semanas, me ha costado concentrarme al estudiar.",
          why: "«Mal» no delimita un indicador. La revisión fija conducta, contexto y periodo. Cambia el contenido: solo es pertinente si la concentración forma parte de la dimensión definida.",
          prompt: "¿Qué significa «mal» para cada persona?",
          source: "muniz",
        },
      ],
    },
    optimo: {
      title: "¿Qué puede resolver o demostrar una persona?",
      description:
        "El rendimiento óptimo evalúa conocimientos o aptitudes mediante tareas con criterios de corrección. En elección múltiple, el razonamiento debe decidir la respuesta, sin pistas de redacción.",
      steps: [
        [
          "Define la tarea cognitiva",
          "Vincula cada ítem a un contenido y a un proceso: recordar, interpretar o aplicar. El enunciado plantea un problema claro con información suficiente para resolverlo.",
          "En matrices figurales, especifica las reglas cognitivas antes de diseñar las opciones.",
        ],
        [
          "Construye clave y distractores",
          "Para el formato de mejor respuesta, define una clave inequívoca y distractores plausibles basados en errores frecuentes. Mantén coherencia gramatical y longitud comparable sin forzarlas.",
          "Tres opciones pueden ser suficientes si son plausibles. No añadas distractores absurdos para alcanzar un número fijo.",
        ],
        [
          "Revisa y pilota",
          "Comprueba que un experto justifica la clave y descarta las demás opciones. Prueba comprensión y tiempos; con datos, analiza dificultad, discriminación y funcionamiento de cada distractor.",
          "Una clave correcta no basta: revisa cobertura del dominio y ausencia de pistas.",
        ],
      ],
      checks: [
        "El ítem está vinculado a contenido y proceso cognitivo.",
        "El problema puede comprenderse antes de leer las opciones.",
        "Hay información suficiente y relevante para resolverlo.",
        "La clave es inequívoca en el contexto del enunciado.",
        "Los distractores son plausibles y reflejan errores posibles.",
        "Las opciones no contienen pistas gramaticales o de longitud.",
        "Las alternativas son distintas y no se solapan.",
        "Las claves del test no siguen patrones evitables.",
        "Un experto ha revisado clave, contenido y distractores.",
        "Se ha comprobado comprensión y tiempo con la población objetivo.",
      ],
      examples: [
        {
          tag: "Distractores absurdos",
          bad: "La fiabilidad se refiere a: A. Precisión de medida. B. Color del cuaderno. C. Tamaño del aula.",
          good: "La fiabilidad se refiere a: A. Precisión de las puntuaciones. B. Representatividad del contenido. C. Adecuación de las normas de interpretación.",
          why: "Los distractores originales se descartan sin conocer el tema. Las alternativas nuevas corresponden a conceptos cercanos; la clave A representa precisión en TCT.",
          prompt: "¿Se puede acertar sin conocer psicometría?",
          source: "moreno",
        },
        {
          tag: "Clave ambigua",
          bad: "¿Qué correlación es alta? A. 0,40. B. 0,60. C. 0,80.",
          good: "¿Qué correlación indica una asociación lineal positiva más intensa? A. 0,40. B. 0,60. C. 0,80.",
          why: "«Alta» depende del contexto y no define un criterio único. «Más intensa» permite comparar las tres correlaciones y justifica C.",
          prompt: "¿Qué criterio hace única la respuesta?",
          source: "moreno",
        },
        {
          tag: "Pista de longitud",
          bad: "La TCT expresa: A. X = T + E, una formulación detallada que separa cuidadosamente la puntuación verdadera de su error de medida. B. X = T. C. X = E.",
          good: "¿Qué relación define la puntuación observada en TCT? A. X = T + E. B. X = T − E. C. X = T × E.",
          why: "La explicación incluida únicamente en A da una pista. Las tres alternativas revisadas tienen el mismo formato algebraico. Clave: A.",
          prompt: "¿Qué opción destaca por su forma?",
          source: "haladyna",
        },
        {
          tag: "Enunciado negativo",
          bad: "¿Cuál NO es una interpretación INCORRECTA de p = 0,80?",
          good: "En un ítem puntuado 0/1, p = 0,80 indica que: A. El 80 % respondió correctamente. B. El 80 % respondió incorrectamente. C. El ítem tiene fiabilidad 0,80.",
          why: "Las dos negaciones obligan a descifrar la pregunta. La versión positiva mide la interpretación de la proporción de aciertos. Clave: A.",
          prompt: "¿La dificultad proviene del contenido o de la negación?",
          source: "haladyna",
        },
        {
          tag: "Opciones solapadas",
          bad: "Si una persona tiene 20 años, su intervalo es: A. 18–25. B. 20–30. C. 30–40.",
          good: "Si una persona tiene 20 años, su intervalo es: A. 18–24. B. 25–29. C. 30–40.",
          why: "A y B incluían 20 años. Las categorías revisadas no se solapan. Clave: A. La tarea solo sería relevante si clasificar intervalos formara parte del objetivo.",
          prompt: "¿Puede haber dos respuestas correctas?",
          source: "moreno",
        },
        {
          tag: "Contenido irrelevante",
          bad: "Una persona consulta el miércoles a las 17:43 y obtiene 12 aciertos en 15 ítems. ¿Cuál es su proporción de aciertos?",
          good: "Una persona obtiene 12 aciertos en 15 ítems. ¿Cuál es su proporción de aciertos? A. 0,20. B. 0,60. C. 0,80.",
          why: "El día y la hora no aportan información al cálculo. 12/15 = 0,80, clave C. Se conservan los datos necesarios y distractores numéricos plausibles.",
          prompt: "¿Qué información necesita realmente el cálculo?",
          source: "haladyna",
        },
      ],
    },
  },
};
