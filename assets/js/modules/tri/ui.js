(function () {
  "use strict";
  const M = globalThis.TRIMath,
    $ = (id) => document.getElementById(id),
    // Coma decimal y signo menos tipográfico; −0,00 se muestra como 0,00.
    fmt = (x, n = 3) => {
      if (!Number.isFinite(x)) return "—";
      const s = x.toLocaleString("es-ES", { minimumFractionDigits: n, maximumFractionDigits: n, useGrouping: false });
      return /^-0(,0+)?$/.test(s) ? s.slice(1) : s.replace("-", "−");
    },
    errorCap = 5;
  const colors = [
      "#001391",
      "#1c8fcc",
      "#b98409",
      "#5b74e8",
      "#a80808",
      "#2f7a17",
      "#7a5600",
      "#2a49d4",
      "#a80808",
      "#4d4d4d",
    ],
    grid = Array.from({ length: 161 }, (_, i) => -4 + i * 0.05),
    charts = {};
  Chart.register({
    id: "triTheta",
    afterDraw(chart) {
      const area = chart.chartArea;
      if (!area || !chart.scales.x) return;
      const prefix = chart.canvas.id.startsWith("g-") ? "g" : "d",
        x = chart.scales.x.getPixelForValue(Number($("theta-" + prefix).value)),
        ctx = chart.ctx;
      if (!Number.isFinite(x)) return;
      ctx.save();
      ctx.strokeStyle = "#4d4d4d";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x, area.top);
      ctx.lineTo(x, area.bottom);
      ctx.stroke();
      ctx.restore();
    },
  });
  let items,
    gradedItems,
    dSeed = 0,
    gSeed = 0;
  const count = (prefix) => Number($(prefix + "-count").value);
  function defaults() {
    const bank = M.bank(count("d"), dSeed);
    if (dSeed === 0)
      bank.splice(
        0,
        3,
        { a: 0.8, b: -1.3, c: 0.15, d: 0.98 },
        { a: 1.4, b: 0, c: 0.2, d: 0.95 },
        { a: 1.8, b: 1.3, c: 0.25, d: 0.9 },
      );
    return bank;
  }
  function gdefaults(K) {
    const bank = M.bank(count("g"), gSeed, "graded", K);
    if (gSeed === 0)
      bank.splice(
        0,
        3,
        ...[1.2, 0.8, 1.6].map((a, i) => ({
          a,
          b: Array.from({ length: K - 1 }, (_, k) => Number(((k - (K - 2) / 2) * 1.1 + (i - 1) * 0.4).toFixed(2))),
        })),
      );
    return bank;
  }
  const D = () => Number($("metric").value),
    sel = () => Number($("selected-item").value),
    gsel = () => Number($("g-selected").value);
  function plot(id, datasets, yTitle, max, dual = false, errorMax) {
    const conf = {
      type: "line",
      data: {
        datasets: datasets.map((d, i) => ({
          label: d.label,
          data: d.values.map((y, k) => ({ x: grid[k], y: Number.isFinite(y) ? y : null })),
          borderColor: d.color || colors[i % colors.length],
          borderWidth: d.width || 2,
          pointRadius: 0,
          tension: 0,
          spanGaps: false,
          borderDash: d.dash || [],
          yAxisID: d.axis || "y",
        })),
      },
      options: {
        locale: "es-ES",
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: "nearest", intersect: false },
        plugins: {
          legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: { callbacks: { title: (c) => "θ = " + fmt(c[0].parsed.x, 2) } },
        },
        scales: {
          x: {
            type: "linear",
            min: -4,
            max: 4,
            title: { display: true, text: "Nivel de rasgo θ" },
            ticks: { stepSize: 1 },
          },
          y: { min: 0, ...(max !== undefined ? { max } : {}), title: { display: true, text: yTitle } },
          ...(dual
            ? {
                error: {
                  position: "right",
                  min: 0,
                  ...(errorMax !== undefined ? { max: errorMax } : {}),
                  grid: { drawOnChartArea: false },
                  title: { display: true, text: "Error estándar de θ" },
                },
              }
            : {}),
        },
      },
    };
    if (charts[id]) {
      charts[id].data = conf.data;
      charts[id].options = conf.options;
      charts[id].update();
    } else charts[id] = new Chart($(id), conf);
  }
  function loadItem() {
    const p = items[sel()];
    for (const k of ["a", "b", "c", "d"]) $("item-" + k).value = p[k];
  }
  function bankSelectors(prefix, bank) {
    const select = $(prefix === "d" ? "selected-item" : "g-selected"),
      previous = Number(select.value) || 0;
    select.innerHTML = bank.map((_, i) => `<option value="${i}">Ítem ${i + 1}</option>`).join("");
    select.value = Math.min(previous, bank.length - 1);
    if (prefix === "d")
      $("cci-items").innerHTML = bank
        .map((_, i) => `<label><input type="checkbox" data-cci="${i}" ${i < 5 ? "checked" : ""}> ${i + 1}</label>`)
        .join("");
  }
  function precision(prefix, curves, chosen) {
    const isItem = prefix === "d" && $("d-precision").value === "item",
      info = curves.map((x) => (isItem ? x.items[chosen].information : x.information)),
      label = isItem ? `Ítem ${chosen + 1}` : "Test completo";
    if (prefix === "d")
      $("d-precision-title").textContent = isItem ? "Información y error del ítem" : "Información y error del test";
    $(prefix + "-information").setAttribute("aria-label", "Información y error · " + label);
    const errors = info.map((v) => (v > 0 ? 1 / Math.sqrt(v) : Infinity)),
      capped = errors.some((v) => v > errorCap);
    plot(
      prefix + "-information",
      [
        { label: label + " · información", values: info },
        {
          label: label + " · EE ≈ 1/√I",
          values: errors,
          axis: "error",
          color: "#a80808",
          dash: [5, 3],
        },
      ],
      "Información",
      undefined,
      true,
      capped ? errorCap : undefined,
    );
    $(prefix + "-information-caption").textContent =
      "Información: eje izquierdo. Error estándar: eje derecho. Son unidades diferentes; los cruces de las curvas no tienen significado. EE es una referencia asintótica con parámetros conocidos. La línea vertical marca el θ elegido." +
      (capped
        ? ` El eje del EE se corta en ${fmt(errorCap, 0)}: donde la información es casi nula el EE crece sin límite y la curva sale del gráfico.`
        : "");
  }
  const relText = {
    latent: {
      label: "Varianza latente σ² de θ en la población de referencia",
      formula: "ρ(θ) = σ²·I(θ) / [σ²·I(θ) + 1] = σ² / [σ² + EE²(θ)]",
      explanation:
        "Supone EE²(θ) = 1/I(θ) (aproximación asintótica con parámetros conocidos) y σ² en la misma métrica que θ; σ² = 1 corresponde a la escala N(0, 1). Es la fiabilidad que tendría una medida con ese error en todo el grupo, por lo que queda entre 0 y 1.",
      caption:
        "Acotada en [0, 1). Resume la precisión en cada θ respecto a la dispersión del grupo; no es fiabilidad marginal ni la exactitud de una persona concreta.",
    },
    raju: {
      label: "Varianza observada Var(θ̂) de las estimaciones en el grupo",
      formula: "ρ(θ) = 1 − EE²(θ) / Var(θ̂)",
      explanation:
        "Raju et al. (2007). Var(θ̂) es la varianza de las estimaciones, que incluye su error: con ML, Var(θ̂) ≈ σ² + E[EE²(θ)] > σ². Usar Var(θ̂) = 1 cuando σ² = 1 la subestima y produce valores negativos donde EE²(θ) > Var(θ̂).",
      caption:
        "Los tramos con ρ < 0 se dejan sin curva; no se convierten en cero. No es fiabilidad marginal ni la exactitud de una persona concreta.",
    },
  };
  function reliability(prefix, curves, result) {
    const method = $(prefix + "-rel-method").value,
      t = relText[method],
      value = $(prefix + "-variance").value.trim(),
      variance = value === "" ? NaN : Number(value),
      rho = curves.map((x) => M.conditionalReliability(x.information, variance, method)),
      current = M.conditionalReliability(result.information, variance, method),
      approx = M.approximateEstimateVariance(
        grid,
        curves.map((x) => x.information),
        1,
      );
    $(prefix + "-variance-label").textContent = t.label;
    $(prefix + "-rel-formula").textContent = t.formula;
    $(prefix + "-rel-explanation").textContent =
      t.explanation +
      (method === "raju"
        ? ` Para este banco, con σ² = 1 y θ ~ N(0, 1) en [−4, 4]: Var(θ̂) ≈ ${fmt(approx, 2)} (aproximación orientativa; ignora sesgo y estimaciones infinitas).`
        : "");
    plot(
      prefix + "-reliability",
      [{ label: "Fiabilidad condicional del test", values: rho.map((v) => (v >= 0 ? v : NaN)), color: "#2f7a17" }],
      "Fiabilidad condicional",
      1,
    );
    $(prefix + "-reliability-status").textContent =
      !Number.isFinite(variance) || variance <= 0
        ? "Introduce una varianza de referencia positiva."
        : `En θ elegido: ρ ≈ ${fmt(current)}.` +
          (rho.some((v) => v < 0)
            ? " Hay zonas con resultado negativo: el error condicional supera la varianza introducida. Esos tramos se dejan sin curva; no se convierten en cero."
            : "");
    $(prefix + "-reliability-caption").textContent = t.caption;
  }
  function updateD() {
    const model = $("model").value,
      theta = Number($("theta-d").value),
      chosen = sel(),
      p = items[chosen],
      params = items.map((x) => M.effective(model, x));
    for (const k of ["a", "b", "c", "d"]) {
      $("item-" + k).disabled =
        (k === "a" && model === "1PL") ||
        (k === "c" && !["3PL", "4PL"].includes(model)) ||
        (k === "d" && model !== "4PL");
      $("item-" + k + "-val").textContent = fmt(params[chosen][k], 2);
    }
    const descriptions = {
      "1PL": "Solo cambia b entre ítems: a = 1, c = 0 y d = 1. Todas las curvas tienen la misma pendiente efectiva D.",
      "2PL": "Cada ítem tiene su a y b; c = 0 y d = 1. Una a mayor produce una transición más pronunciada.",
      "3PL":
        "Cada ítem tiene a, b y c; d = 1. La curva empieza en una asíntota inferior c, que puede reducir la información.",
      "4PL": "Cada ítem tiene a, b, c y d, con 0 ≤ c < d ≤ 1. La curva se mueve entre dos asíntotas.",
    };
    $("model-description").textContent = descriptions[model];
    $("theta-d-val").textContent = fmt(theta, 2);
    $("dich-table").innerHTML = params
      .map(
        (x, i) =>
          `<tr><th scope="row">${i + 1}${i === chosen ? " · elegido" : ""}</th>${["a", "b", "c", "d"].map((k) => `<td>${fmt(x[k], 2)}</td>`).join("")}</tr>`,
      )
      .join("");
    const result = M.test(theta, params, "dichotomous", D()),
      curves = grid.map((t) => M.test(t, params, "dichotomous", D()));
    $("d-prob").textContent = fmt(result.items[chosen].probability);
    $("d-info").textContent = fmt(result.information);
    $("d-sem").textContent = fmt(result.sem);
    $("d-expected").textContent =
      `En θ = ${fmt(theta, 2)}, la puntuación esperada es ${fmt(result.expected)} sobre ${items.length}. Es la suma de las probabilidades de acierto.`;
    $("d-midpoint").textContent =
      `En θ = b, P = (c + d)/2 = ${fmt((params[chosen].c + params[chosen].d) / 2)}. Con asíntotas distintas de 0 y 1, b no equivale necesariamente a una probabilidad de acierto de 0,5.`;
    const peak = M.maxInformation(params[chosen], D()),
      rule =
        model === "4PL"
          ? "con d < 1 no se usa la forma cerrada: se localiza numéricamente"
          : model === "3PL"
            ? "θmax = b + ln[(1 + √(1 + 8c))/2]/(D·a)"
            : "θmax = b e Imax = D²a²/4";
    $("d-maxinfo").textContent =
      `Información máxima del ítem ${chosen + 1}: ${fmt(peak.information)} en θ = ${fmt(peak.theta, 2)} (${rule}).`;
    const view = $("cci-view").value,
      visible = [...$("cci-items").querySelectorAll("input:checked")].map((x) => Number(x.dataset.cci));
    $("cci-picker").hidden = view !== "items";
    const cci =
      view === "models"
        ? ["1PL", "2PL", "3PL", "4PL"].map((m) => ({
            label: m,
            values: grid.map((t) => M.dichotomous(t, M.effective(m, p), D()).probability),
          }))
        : (view === "single" ? [chosen] : visible).map((i) => ({
            label: `Ítem ${i + 1}`,
            values: curves.map((x) => x.items[i].probability),
            color: colors[i % colors.length],
            dash: i >= 10 ? [4, 3] : [],
            width: i === chosen ? 3 : 1.7,
          }));
    plot("d-cci", cci, "Probabilidad de acierto", 1);
    precision("d", curves, chosen);
    plot(
      "d-score",
      [{ label: "Test · suma esperada", values: curves.map((x) => x.expected) }],
      "Puntuación esperada",
      items.length,
    );
    reliability("d", curves, result);
    $("d-cci-caption").textContent =
      view === "models"
        ? `Comparación de modelos del ítem elegido. a = ${fmt(p.a, 2)}, b = ${fmt(p.b, 2)}, c = ${fmt(p.c, 2)}, d = ${fmt(p.d, 2)}; 1PL usa a = 1.`
        : view === "items" && !visible.length
          ? "Marca al menos un ítem para mostrar sus curvas."
          : "Más b desplaza la curva a la derecha: mayor dificultad. Más a aumenta la pendiente alrededor de b: mayor discriminación. Pulsa una leyenda para ocultar o recuperar una curva.";
    $("d-score-caption").textContent =
      `Escala natural 0–${items.length}. Se suman todos los ítems del banco, aunque ocultes sus CCI.`;
  }
  function loadGraded() {
    const p = gradedItems[gsel()];
    $("g-a").value = p.a;
    $("g-thresholds").innerHTML = p.b
      .map(
        (b, i) =>
          `<div><label for="g-b-${i}">Umbral b${i + 1}</label><input id="g-b-${i}" type="number" min="-4" max="4" step="0.1" value="${b}" data-threshold="${i}"></div>`,
      )
      .join("");
  }
  function updateG() {
    const chosen = gsel(),
      p = gradedItems[chosen],
      theta = Number($("theta-g").value),
      K = Number($("g-categories").value),
      max = gradedItems.length * (K - 1);
    $("g-a-val").textContent = fmt(p.a, 2);
    $("theta-g-val").textContent = fmt(theta, 2);
    $("g-table").innerHTML = gradedItems
      .map(
        (x, i) =>
          `<tr><th scope="row">${i + 1}${i === chosen ? " · elegido" : ""}</th><td>${fmt(x.a, 2)}</td><td>${x.b.map((b) => fmt(b, 2)).join(" · ")}</td></tr>`,
      )
      .join("");
    const result = M.test(theta, gradedItems, "graded", D());
    if (!result) {
      $("g-status").textContent =
        "Revisa los umbrales del banco: todos deben tener un valor numérico y ser estrictamente crecientes (b1 < b2 < …). Las curvas y resultados se suspenden hasta corregirlos.";
      for (const id of ["g-sum", "g-info", "g-sem"]) $(id).textContent = "—";
      $("g-expected").textContent = "No se puede calcular con estos umbrales.";
      $("g-probabilities").replaceChildren();
      $("g-reliability-status").textContent = "Corrige los umbrales antes de interpretar la precisión.";
      for (const id of ["g-cci", "g-information", "g-score", "g-reliability"]) {
        if (charts[id]) {
          charts[id].destroy();
          delete charts[id];
        }
        $(id + "-caption").textContent = "Corrige los parámetros para recuperar el gráfico.";
      }
      return;
    }
    $("g-status").textContent = "";
    const curves = grid.map((t) => M.test(t, gradedItems, "graded", D())),
      r = result.items[chosen];
    $("g-sum").textContent = fmt(
      r.probabilities.reduce((a, b) => a + b, 0),
      6,
    );
    $("g-info").textContent = fmt(result.information);
    $("g-sem").textContent = fmt(result.sem);
    $("g-expected").textContent =
      `En θ = ${fmt(theta, 2)}, E(X) del ítem elegido = ${fmt(r.expected)} y E(X) del test = ${fmt(result.expected)} sobre ${max}. Categorías puntuadas 0,…,${K - 1}.`;
    $("g-probabilities").innerHTML = r.probabilities
      .map((v, k) => `<span>Categoría ${k}: <strong>${fmt(v)}</strong></span>`)
      .join("");
    const cumulative = $("g-mode").value === "cumulative",
      datasets = cumulative
        ? p.b.map((_, k) => ({
            label: `P(X ≥ ${k + 1})`,
            values: curves.map((x) => x.items[chosen].cumulative[k + 1]),
          }))
        : Array.from({ length: K }, (_, k) => ({
            label: `Categoría ${k}`,
            values: curves.map((x) => x.items[chosen].probabilities[k]),
          }));
    plot("g-cci", datasets, "Probabilidad", 1);
    precision("g", curves, chosen);
    plot(
      "g-score",
      [{ label: "Test · suma esperada", values: curves.map((x) => x.expected) }],
      "Puntuación esperada",
      max,
    );
    reliability("g", curves, result);
    $("g-cci-caption").textContent = cumulative
      ? "Cada curva indica la probabilidad de elegir k o una categoría superior. Las curvas acumuladas no suman 1."
      : "Las probabilidades de las categorías son no negativas y suman 1 en cada θ.";
    $("g-score-caption").textContent = `Escala natural 0–${max}: ${gradedItems.length} ítems puntuados 0–${K - 1}.`;
  }
  const tabs = [...document.querySelectorAll("[role=tab]")];
  function activate(tab) {
    tabs.forEach((t) => {
      const active = t === tab;
      t.setAttribute("aria-selected", active);
      t.tabIndex = active ? 0 : -1;
      $(t.dataset.panel).hidden = !active;
    });
    Object.values(charts).forEach((c) => c.resize());
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => activate(tab));
    tab.addEventListener("keydown", (e) => {
      let n;
      if (e.key === "ArrowRight") n = (i + 1) % tabs.length;
      else if (e.key === "ArrowLeft") n = (i + tabs.length - 1) % tabs.length;
      else if (e.key === "Home") n = 0;
      else if (e.key === "End") n = tabs.length - 1;
      else return;
      e.preventDefault();
      activate(tabs[n]);
      tabs[n].focus();
    });
  });
  items = defaults();
  gradedItems = gdefaults(5);
  bankSelectors("d", items);
  $("selected-item").value = "1";
  bankSelectors("g", gradedItems);
  loadItem();
  loadGraded();
  for (const k of ["a", "b", "c", "d"])
    $("item-" + k).addEventListener("input", () => {
      items[sel()][k] = Number($("item-" + k).value);
      updateD();
    });
  $("selected-item").addEventListener("change", () => {
    loadItem();
    updateD();
  });
  for (const id of ["model", "cci-view", "theta-d", "d-precision", "d-variance", "d-rel-method"])
    $(id).addEventListener("input", updateD);
  $("cci-items").addEventListener("change", updateD);
  $("cci-all").addEventListener("click", () => {
    $("cci-items")
      .querySelectorAll("input")
      .forEach((x) => (x.checked = true));
    updateD();
  });
  $("cci-chosen").addEventListener("click", () => {
    $("cci-items")
      .querySelectorAll("input")
      .forEach((x) => (x.checked = Number(x.dataset.cci) === sel()));
    updateD();
  });
  function newD() {
    items = defaults();
    bankSelectors("d", items);
    loadItem();
    updateD();
  }
  function newG() {
    gradedItems = gdefaults(Number($("g-categories").value));
    bankSelectors("g", gradedItems);
    loadGraded();
    updateG();
  }
  $("d-count").addEventListener("change", newD);
  $("g-count").addEventListener("change", newG);
  $("d-generate").addEventListener("click", () => {
    dSeed++;
    newD();
  });
  $("g-generate").addEventListener("click", () => {
    gSeed++;
    newG();
  });
  $("reset-d").addEventListener("click", () => {
    dSeed = 0;
    newD();
  });
  $("g-selected").addEventListener("change", () => {
    loadGraded();
    updateG();
  });
  $("g-a").addEventListener("input", () => {
    gradedItems[gsel()].a = Number($("g-a").value);
    updateG();
  });
  $("g-thresholds").addEventListener("input", (e) => {
    if (e.target.matches("[data-threshold]")) {
      gradedItems[gsel()].b[Number(e.target.dataset.threshold)] =
        e.target.value.trim() === "" ? NaN : Number(e.target.value);
      updateG();
    }
  });
  $("g-categories").addEventListener("change", newG);
  for (const id of ["g-mode", "theta-g", "g-variance", "g-rel-method"]) $(id).addEventListener("input", updateG);
  $("reset-g").addEventListener("click", () => {
    gSeed = 0;
    newG();
  });
  $("metric").addEventListener("change", () => {
    updateD();
    updateG();
  });
  // Predecir dónde informa más el ítem antes de ver la curva de información.
  if (globalThis.Didactica) {
    const info = $("d-information").closest(".tct-chart"),
      // Se calcula con el modelo (no leyendo el texto, que usa el signo «−» tipográfico).
      peakNow = () => {
        const model = $("model").value,
          x = M.effective(model, items[sel()]);
        return { model, x, theta: Math.round(M.maxInformation(x, D()).theta * 100) / 100 };
      },
      n2 = (v) => fmt(v, 2);
    Didactica.gate({
      anchor: info,
      hide: [info],
      conceal: [$("d-maxinfo")],
      prompt: "¿en qué valor de θ crees que informa más el ítem elegido? Fíjate en su b y en su c.",
      value: () => peakNow().theta,
      format: n2,
      // Estrecha: en el 3PL responder «b» no debe darse por bueno si el máximo se ha desplazado.
      tolerance: 0.1,
      explain: () => {
        const { model, x } = peakNow(),
          why = {
            "1PL": `En el 1PL el máximo está justo en θ = b (aquí b = ${n2(x.b)}).`,
            "2PL": `En el 2PL el máximo está justo en θ = b (aquí b = ${n2(x.b)}).`,
            "3PL": `En el 3PL, con c = ${n2(x.c)}, el máximo queda por encima de b = ${n2(x.b)}: la conjetura resta información en la zona baja.`,
            "4PL": `En el 4PL, c > 0 lleva el máximo por encima de b y d < 1 por debajo; aquí b = ${n2(x.b)}, c = ${n2(x.c)} y d = ${n2(x.d)}.`,
          }[model];
        return why + " El gráfico muestra ahora la información del ítem elegido.";
      },
      onReveal: () => {
        $("d-precision").value = "item";
        updateD();
      },
    });
  }
  // El cuestionario lo genera Didactica (assets/js/core/preguntas.js, clave «tri»).
  updateD();
  updateG();
})();
