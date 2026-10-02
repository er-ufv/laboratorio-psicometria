(function () {
  "use strict";
  const $ = (id) => document.getElementById(id),
    M = TCTMath,
    F = ItemMath.format,
    S = ItemMath.signed,
    charts = {};
  let sampleNumber = 0;
  const AXIS = { min: -25, max: 125 }; // ejes fijos del diagrama de dispersión
  Chart.defaults.font.family = "'Neue Haas Grotesk Text Pro','Helvetica Neue',Arial,sans-serif";
  Chart.defaults.color = "#4d4d4d";
  Chart.defaults.animation = false;
  const number = (id) => {
    const s = $(id).value.trim(),
      v = s !== "" ? Number(s) : NaN;
    $(id).setAttribute("aria-invalid", String(!Number.isFinite(v)));
    return v;
  };
  const set = (id, v, n = 2) => ($(id).textContent = F(v, n));
  function chart(id, type, data, options = {}) {
    if (charts[id]) {
      charts[id].data = data;
      charts[id].options = { responsive: true, maintainAspectRatio: false, ...options };
      charts[id].update();
    } else
      charts[id] = new Chart($(id), {
        type,
        data,
        options: { responsive: true, maintainAspectRatio: false, ...options },
      });
  }
  const line = (label, data, color = "#001391") => ({
    label,
    data,
    borderColor: color,
    backgroundColor: color,
    pointRadius: 3,
    borderWidth: 2,
  });
  function model() {
    const t = number("true-score"),
      e = number("one-error");
    set("true-val", t, 0);
    set("one-error-val", e, 0);
    set("observed", t + e, 0);
    set("single-t", t, 0);
    set("single-e", e, 0);
  }
  function reliability() {
    const t = number("sd-t"),
      e = number("sd-e"),
      v = M.decomposition(t, e),
      sample = M.simulate(t, e, 120, sampleNumber),
      rForms = ItemMath.pearson(sample.x, sample.parallel),
      rErrors = ItemMath.pearson(
        sample.x.map((x, i) => x - sample.t[i]),
        sample.parallel.map((x, i) => x - sample.t[i]),
      );
    set("sd-t-val", t, 0);
    set("sd-e-val", e, 0);
    set("rho", v.reliability, 3);
    set("sd-x", v.sdX);
    set("parallel-r", rForms, 3);
    $("sample-info").textContent = Number.isFinite(rForms)
      ? `Muestra ${sampleNumber + 1}: r entre formas = ${F(rForms, 3)} frente a ρ = ${F(v.reliability, 3)}; los errores de ambas formas correlacionan ${S(rErrors, 3)} (0 en la población). Error típico aproximado de r: ${F((1 - v.reliability ** 2) / Math.sqrt(120), 3)}.`
      : `Muestra ${sampleNumber + 1}: sin variación de error o de puntuación verdadera, r entre formas no está definida.`;
    $("reliability-status").textContent =
      v.vx === 0 ? "No hay variación en T ni en E: la razón 0/0 no define una fiabilidad." : "";
    chart(
      "variance-chart",
      "bar",
      {
        labels: ["Verdadera σ²T", "Error σ²E"],
        datasets: [
          {
            label: "Varianza poblacional",
            data: [v.vt, v.ve],
            backgroundColor: ["#001391", "#85c8ff"],
            borderRadius: 5,
          },
        ],
      },
      {
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, title: { display: true, text: "Varianza" } } },
      },
    );
    const parallel = $("scatter-mode").value === "parallel",
      x = parallel ? sample.x : sample.t,
      y = parallel ? sample.parallel : sample.x;
    const fixed = { type: "linear", ...AXIS, ticks: { stepSize: 25 } };
    chart(
      "reliability-chart",
      "scatter",
      {
        datasets: [
          {
            label: "120 personas",
            data: x.map((p, i) => ({ x: p, y: y[i] })),
            backgroundColor: "#00139199",
            pointRadius: 3,
          },
          {
            label: "y = x",
            data: [
              { x: AXIS.min, y: AXIS.min },
              { x: AXIS.max, y: AXIS.max },
            ],
            showLine: true,
            borderColor: "#7a5600",
            borderDash: [6, 4],
            borderWidth: 1.5,
            pointRadius: 0,
            pointHoverRadius: 0,
          },
        ],
      },
      {
        plugins: {
          legend: { display: false },
          tooltip: {
            filter: (item) => item.datasetIndex === 0,
            callbacks: { label: (c) => ` (${F(c.raw.x, 1)}, ${F(c.raw.y, 1)})` },
          },
        },
        scales: {
          x: { ...fixed, title: { display: true, text: parallel ? "Puntuación en forma 1" : "T hipotética" } },
          y: { ...fixed, title: { display: true, text: parallel ? "Puntuación en forma 2" : "X observada" } },
        },
      },
    );
  }
  function error() {
    const sd = number("eem-sd"),
      x = number("eem-score"),
      r = number("eem-r") / 100,
      level = number("confidence"),
      ci = M.interval(x, sd, r, level);
    set("eem-r-val", r, 2);
    for (const [id, v] of [
      ["eem", ci?.sem],
      ["ci-low", ci?.lower],
      ["ci-high", ci?.upper],
    ])
      set(id, v);
    const valid = !!ci;
    $("eem-sd").setAttribute("aria-invalid", String(!(sd > 0 && Number.isFinite(sd))));
    $("eem-status").textContent = valid
      ? ""
      : "Introduce una desviación típica mayor que cero y una puntuación finita.";
    $("ci-explanation").textContent = valid
      ? `Con z = ${F(ci.z, 6)}, el margen es ${F(ci.z * ci.sem)} puntos. El intervalo bilateral del ${level} % va de ${F(ci.lower)} a ${F(ci.upper)}.`
      : "El intervalo no se calcula mientras falten datos válidos.";
    const data = ci
      ? [
          { x: ci.lower, y: 1 },
          { x: ci.upper, y: 1 },
        ]
      : [];
    chart(
      "interval-chart",
      "scatter",
      {
        datasets: [
          { ...line(`Intervalo ${level} %`, data), showLine: true, pointRadius: 7 },
          { label: "Puntuación X", data: ci ? [{ x, y: 1 }] : [], backgroundColor: "#7a5600", pointRadius: 7 },
        ],
      },
      {
        scales: {
          // Eje fijo según X y S_X (el margen máximo, z99·S_X, cabe en ±3·S_X): al mover r o el nivel se ve el cambio.
          x: {
            type: "linear",
            ...(valid ? { min: x - 3 * sd, max: x + 3 * sd } : {}),
            title: { display: true, text: "Puntuación" },
          },
          y: { display: false, min: 0, max: 2 },
        },
        plugins: {
          legend: { position: "bottom" },
          tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${F(c.raw.x)}` } },
        },
      },
    );
  }
  function length() {
    const r = number("length-r") / 100,
      n = number("old-n"),
      next = number("new-n"),
      target = number("target-r"),
      valid = Number.isInteger(n) && n >= 2 && n <= 200 && Number.isInteger(next) && next >= 2 && next <= 400;
    $("old-n").setAttribute("aria-invalid", String(!(Number.isInteger(n) && n >= 2 && n <= 200)));
    $("new-n").setAttribute("aria-invalid", String(!(Number.isInteger(next) && next >= 2 && next <= 400)));
    set("length-r-val", r);
    set("length-k", valid ? next / n : NaN);
    set("length-result", valid ? M.spearmanBrown(r, next / n) : NaN, 3);
    const needed = valid ? M.requiredLength(r, target, n) : null;
    $("target-n").textContent = needed ? (Number.isFinite(needed.n) ? String(needed.n) : "No finita") : "—";
    $("length-status").textContent = valid ? "" : "Usa longitudes enteras: 2–200 ítems originales y 2–400 nuevos.";
    $("target-explanation").textContent = needed
      ? needed.already
        ? "La fiabilidad original ya cumple la meta; no hace falta alargar según este modelo."
        : !Number.isFinite(needed.n)
          ? "La meta no se alcanza con una longitud finita bajo esta predicción."
          : `La razón mínima teórica es ${F(needed.ratio, 3)}; se redondea la longitud a ${needed.n} ítems para alcanzar la meta. La meta del ejercicio no es una recomendación universal.`
      : "";
    const max = valid ? Math.max(80, n, next) : 80;
    const points = valid
      ? Array.from({ length: max - 1 }, (_, i) => ({ x: i + 2, y: M.spearmanBrown(r, (i + 2) / n) }))
      : [];
    chart(
      "length-chart",
      "line",
      {
        datasets: [
          { ...line("Fiabilidad predicha", points), pointRadius: 0 },
          {
            ...line("Nueva longitud", valid ? [{ x: next, y: M.spearmanBrown(r, next / n) }] : [], "#7a5600"),
            pointRadius: 6,
            showLine: false,
          },
        ],
      },
      {
        scales: {
          x: { type: "linear", title: { display: true, text: "Número de ítems" } },
          y: { min: 0, max: 1, title: { display: true, text: "Fiabilidad" } },
        },
        plugins: { legend: { position: "bottom" } },
      },
    );
  }
  function alpha() {
    const matrix = Array.from({ length: 6 }, (_, s) => Array.from({ length: 3 }, (_, j) => number(`a-${s}-${j}`))),
      valid = matrix.flat().every(Number.isFinite);
    let raw = NaN,
      mean = NaN,
      standard = NaN,
      drops = [];
    if (valid) {
      raw = ItemMath.alpha(matrix);
      const correlations = [];
      for (let i = 0; i < 3; i++)
        for (let j = i + 1; j < 3; j++)
          correlations.push(
            ItemMath.pearson(
              matrix.map((r) => r[i]),
              matrix.map((r) => r[j]),
            ),
          );
      mean = correlations.reduce((s, x) => s + x, 0) / 3;
      standard = ItemMath.standardizedAlpha(3, mean);
      drops = [0, 1, 2].map((j) => ItemMath.alpha(matrix.map((row) => row.filter((_, i) => i !== j))));
    }
    set("alpha-raw", raw, 3);
    set("alpha-standard", standard, 3);
    set("alpha-mean-r", mean, 3);
    $("alpha-status").textContent = !valid
      ? "Completa todas las casillas con números. Los datos ausentes no se convierten en cero."
      : !Number.isFinite(raw)
        ? "La varianza de la puntuación total es cero: alfa no definido."
        : !Number.isFinite(standard)
          ? "Alfa estandarizado no definido: hay ítems sin variación o una suma estandarizada sin varianza."
          : raw < 0
            ? "Alfa negativo: revisa las claves y la covariación entre ítems."
            : "Ejemplo didáctico de seis personas. No permite certificar la calidad de una escala.";
    chart(
      "alpha-chart",
      "bar",
      {
        labels: ["Test completo", "Sin ítem 1", "Sin ítem 2", "Sin ítem 3"],
        datasets: [
          {
            label: "Alfa bruto",
            data: [raw, ...drops].map((x) => (Number.isFinite(x) ? x : null)),
            backgroundColor: ["#001391", "#2a49d4", "#2a49d4", "#2a49d4"],
            borderRadius: 5,
          },
        ],
      },
      {
        scales: { y: { suggestedMin: 0, suggestedMax: 1, title: { display: true, text: "Alfa bruto" } } },
        plugins: { legend: { display: false } },
      },
    );
  }
  // ---------- Panel 06: dos mitades, KR-20/21, Kelley y diferencia entre puntuaciones ----------
  function buildHalfMatrix() {
    const k = M.DICHOTOMOUS_EXAMPLE[0].length,
      head = document.createElement("tr");
    for (const text of ["Persona", ...Array.from({ length: k }, (_, j) => "Ítem " + (j + 1)), "Total"]) {
      const th = document.createElement("th");
      th.scope = "col";
      th.textContent = text;
      head.append(th);
    }
    $("half-head").replaceChildren(head);
    $("half-matrix").replaceChildren();
    M.DICHOTOMOUS_EXAMPLE.forEach((row, s) => {
      const tr = document.createElement("tr"),
        label = document.createElement("th");
      label.scope = "row";
      label.textContent = "Persona " + (s + 1);
      tr.append(label);
      row.forEach((v, j) => {
        const td = document.createElement("td"),
          input = document.createElement("input");
        input.type = "number";
        input.min = "0";
        input.max = "1";
        input.step = "1";
        input.value = v;
        input.id = `h-${s}-${j}`;
        input.setAttribute("aria-label", `Persona ${s + 1}, ítem ${j + 1}`);
        td.append(input);
        tr.append(td);
      });
      const total = document.createElement("td");
      total.id = "h-total-" + s;
      total.className = "tct-half-total";
      tr.append(total);
      $("half-matrix").append(tr);
    });
  }
  function halves() {
    const n = M.DICHOTOMOUS_EXAMPLE.length,
      k = M.DICHOTOMOUS_EXAMPLE[0].length;
    let invalid = 0;
    const matrix = Array.from({ length: n }, (_, s) =>
      Array.from({ length: k }, (_, j) => {
        const input = $(`h-${s}-${j}`),
          text = input.value.trim(),
          v = text === "0" || text === "1" ? Number(text) : NaN;
        input.setAttribute("aria-invalid", String(!Number.isFinite(v)));
        input.classList.toggle("tct-cell-invalid", !Number.isFinite(v));
        if (!Number.isFinite(v)) invalid++;
        return v;
      }),
    );
    matrix.forEach(
      (row, s) =>
        ($(`h-total-${s}`).textContent = row.every(Number.isFinite) ? String(row.reduce((a, b) => a + b, 0)) : "—"),
    );
    const valid = invalid === 0,
      split = $("half-split").value,
      h = valid ? M.splitHalf(matrix, split) : null,
      k20 = valid ? M.kr20(matrix) : NaN,
      k21 = valid ? M.kr21(matrix) : NaN,
      range = valid ? M.splitHalfRange(matrix) : null,
      totals = matrix.map((row) => row.reduce((a, b) => a + b, 0)),
      mean = totals.reduce((a, b) => a + b, 0) / n;
    set("half-r", h?.r, 3);
    set("half-sb", h?.spearmanBrown, 3);
    set("half-guttman", h?.guttman, 3);
    set("kr20", k20, 3);
    set("kr21", k21, 3);
    set("half-var", valid ? totals.reduce((a, t) => a + (t - mean) ** 2, 0) / n : NaN, 3);
    $("half-status").textContent = !valid
      ? `Hay ${invalid === 1 ? "una casilla no válida" : invalid + " casillas no válidas"}: usa 0 o 1. Las casillas vacías no se convierten en cero.`
      : !Number.isFinite(h?.r)
        ? "Una de las mitades no varía: la correlación entre mitades no está definida."
        : !Number.isFinite(k20)
          ? "La puntuación total no varía: KR-20 y KR-21 no están definidos."
          : "";
    const label = split === "first-second" ? "primera/segunda mitad" : "impares/pares";
    $("half-explanation").textContent =
      valid && range && Number.isFinite(h?.r)
        ? `Con la división ${label}, las mitades correlacionan ${F(h.r, 3)} y Spearman–Brown estima ${F(h.spearmanBrown, 3)} para el test completo. Según cómo se divida, Guttman–Flanagan va de ${F(range.min, 3)} a ${F(range.max, 3)} en las ${range.count} divisiones posibles en mitades de igual tamaño; su media (${F(range.mean, 3)}) coincide con KR-20 = α. KR-21 (${F(k21, 3)}) es menor porque los ítems no tienen la misma dificultad.`
        : "";
  }
  function estimate() {
    const sd = number("est-sd"),
      mean = number("est-mean"),
      x = number("est-score"),
      r = number("est-r") / 100,
      level = number("est-level"),
      x2 = number("diff-score"),
      r2 = number("diff-r"),
      z = M.Z[level],
      validMain = sd > 0 && Number.isFinite(mean) && Number.isFinite(x),
      validDiff = validMain && Number.isFinite(x2) && r2 >= 0 && r2 <= 1;
    $("est-sd").setAttribute("aria-invalid", String(!(sd > 0)));
    $("diff-r").setAttribute("aria-invalid", String(!(r2 >= 0 && r2 <= 1)));
    set("est-r-val", r, 2);
    const index = M.reliabilityIndex(r),
      tPrime = validMain ? M.kelley(x, mean, r) : NaN,
      se = validMain ? M.estimationSE(sd, r) : NaN,
      eem = validMain ? M.sem(sd, r) : NaN,
      sd2 = validDiff ? M.differenceSE(sd, r, sd, r2) : NaN;
    set("est-index", index, 3);
    set("est-kelley", tPrime);
    set("est-se", se);
    set("diff-d", validDiff ? x - x2 : NaN);
    set("diff-se", sd2);
    set("diff-critical", z * sd2);
    $("est-status").textContent = !validMain
      ? "Introduce una desviación típica mayor que cero, una media y una puntuación finitas."
      : !validDiff
        ? "Para comparar, introduce X₂ y una fiabilidad r₂ entre 0 y 1."
        : "";
    $("est-explanation").textContent = validMain
      ? `Intervalo para T centrado en T′: ${F(tPrime - z * se, 2)} a ${F(tPrime + z * se, 2)} (T′ ± ${F(z, 3)} · ${F(se, 2)}). El intervalo centrado en X con el EEM (${F(eem, 2)}) va de ${F(x - z * eem, 2)} a ${F(x + z * eem, 2)}. T′ queda ${F(Math.abs(x - tPrime), 2)} puntos más cerca de la media que X: es la regresión hacia la media.`
      : "";
    const d = x - x2,
      critical = z * sd2;
    $("diff-explanation").textContent = validDiff
      ? Math.abs(d) > critical
        ? `|${F(d, 2)}| supera ${F(critical, 2)}: con un nivel del ${level} %, la diferencia es mayor de lo que cabe atribuir al error de medida.`
        : `|${F(d, 2)}| no supera ${F(critical, 2)}: con un nivel del ${level} %, la diferencia es compatible con el error de medida.`
      : "";
    const lo = validMain ? Math.min(mean, x) - 3 * sd : 0,
      hi = validMain ? Math.max(mean, x) + 3 * sd : 1,
      segment = (center, half, y) => [
        { x: center - half, y },
        { x: center + half, y },
      ];
    chart(
      "estimate-chart",
      "scatter",
      {
        datasets: [
          {
            ...line(`X ± z·EEM`, validMain ? segment(x, z * eem, 2) : []),
            showLine: true,
            pointRadius: 4,
          },
          {
            ...line(`T′ ± z·S estimación (Kelley)`, validMain ? segment(tPrime, z * se, 1) : [], "#b98409"),
            showLine: true,
            pointRadius: 4,
          },
          {
            label: "X y T′",
            data: validMain
              ? [
                  { x, y: 2 },
                  { x: tPrime, y: 1 },
                ]
              : [],
            backgroundColor: ["#001391", "#7a5600"],
            pointRadius: 7,
          },
          {
            label: "Media X̄",
            data: validMain
              ? [
                  { x: mean, y: 0.4 },
                  { x: mean, y: 2.6 },
                ]
              : [],
            showLine: true,
            borderColor: "#4d4d4d",
            borderDash: [5, 4],
            borderWidth: 1.5,
            pointRadius: 0,
          },
        ],
      },
      {
        scales: {
          x: { type: "linear", min: lo, max: hi, title: { display: true, text: "Puntuación" } },
          y: { display: false, min: 0, max: 3 },
        },
        plugins: {
          legend: { position: "bottom", labels: { filter: (item) => item.text !== "X y T′" } },
          tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${F(c.raw.x, 2)}` } },
        },
      },
    );
  }
  const defaults = [
    [3, 2, 3],
    [2, 3, 4],
    [5, 5, 5],
    [1, 1, 1],
    [4, 3, 4],
    [2, 2, 3],
  ];
  defaults.forEach((row, s) => {
    const tr = document.createElement("tr"),
      label = document.createElement("th");
    label.scope = "row";
    label.textContent = "Persona " + (s + 1);
    tr.append(label);
    row.forEach((v, j) => {
      const td = document.createElement("td"),
        input = document.createElement("input");
      input.type = "number";
      input.step = "any";
      input.value = v;
      input.id = `a-${s}-${j}`;
      input.setAttribute("aria-label", `Persona ${s + 1}, ítem ${j + 1}`);
      td.append(input);
      tr.append(td);
    });
    $("alpha-matrix").append(tr);
  });
  const tabs = [...document.querySelectorAll("[data-panel]")];
  function show(id) {
    tabs.forEach((tab) => {
      const on = tab.dataset.panel === id;
      tab.setAttribute("aria-selected", String(on));
      tab.tabIndex = on ? 0 : -1;
      $(tab.dataset.panel).hidden = !on;
    });
    requestAnimationFrame(() => Object.values(charts).forEach((c) => c.resize()));
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => show(tab.dataset.panel));
    tab.addEventListener("keydown", (e) => {
      let index;
      if (e.key === "ArrowRight") index = (i + 1) % tabs.length;
      else if (e.key === "ArrowLeft") index = (i + tabs.length - 1) % tabs.length;
      else if (e.key === "Home") index = 0;
      else if (e.key === "End") index = tabs.length - 1;
      else return;
      e.preventDefault();
      tabs[index].click();
      tabs[index].focus();
    });
  });
  buildHalfMatrix();
  for (const [ids, fn] of [
    [["true-score", "one-error"], model],
    [["sd-t", "sd-e", "scatter-mode"], reliability],
    [["eem-sd", "eem-score", "eem-r", "confidence"], error],
    [["length-r", "old-n", "new-n", "target-r"], length],
    [["half-split"], halves],
    [["est-sd", "est-mean", "est-score", "est-r", "est-level", "diff-score", "diff-r"], estimate],
  ])
    ids.forEach((id) => $(id).addEventListener("input", fn));
  $("alpha-matrix").addEventListener("input", alpha);
  $("half-matrix").addEventListener("input", halves);
  $("new-sample").addEventListener("click", () => {
    sampleNumber++;
    reliability();
  });
  // Predecir antes de ver el resultado de Spearman–Brown.
  if (globalThis.Didactica) {
    const res = $("length-result").closest(".tct-result");
    Didactica.gate({
      anchor: res,
      hide: [res, $("length-chart").closest(".tct-chart"), $("length-status")],
      prompt:
        "con la fiabilidad y las longitudes que has elegido, ¿qué fiabilidad predice Spearman–Brown para el test nuevo?",
      value: () => Number($("length-result").textContent.replace(",", ".")),
      tolerance: 0.03,
      explain: (pred, actual) =>
        pred > actual
          ? "Sobrestimaste la mejora: la fiabilidad crece con rendimientos decrecientes al alargar."
          : pred < actual
            ? "Infraestimaste el cambio: con ítems paralelos, la fiabilidad responde a la longitud más de lo que suele intuirse, sobre todo si la de partida es moderada."
            : "",
    });
  }
  // El cuestionario lo genera Didactica (assets/js/core/preguntas.js, clave «tct»).
  model();
  reliability();
  error();
  length();
  alpha();
  halves();
  estimate();
})();
