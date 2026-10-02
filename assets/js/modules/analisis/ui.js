/* Módulo 2 · Análisis de ítems. Contenidos originales de Eduar Ramírez. */
function readItem(id) {
  const s = document.getElementById(id)?.value?.trim();
  return s !== undefined && s !== "" ? Number(s) : NaN;
}
/* Línea de referencia horizontal (p. ej., 0.30 orientativo) sin depender de plugins externos.
   Uso: plugins: [refLine], options.plugins.refLine = { value: 0.3, label: "…" }. */
const refLine = {
  id: "refLine",
  afterDatasetsDraw(chart, _args, opts) {
    const scale = chart.scales[opts.axis || "y"];
    if (!scale || !Number.isFinite(opts.value)) return;
    const { ctx, chartArea: a } = chart,
      vertical = scale.axis === "x",
      at = scale.getPixelForValue(opts.value);
    ctx.save();
    ctx.strokeStyle = opts.color || "#7a5600";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    if (vertical) {
      ctx.moveTo(at, a.top);
      ctx.lineTo(at, a.bottom);
    } else {
      ctx.moveTo(a.left, at);
      ctx.lineTo(a.right, at);
    }
    ctx.stroke();
    if (opts.label) {
      ctx.setLineDash([]);
      ctx.fillStyle = opts.color || "#7a5600";
      ctx.font = "11px " + Chart.defaults.font.family;
      ctx.textAlign = vertical ? "left" : "right";
      ctx.fillText(opts.label, vertical ? at + 4 : a.right - 4, vertical ? a.top + 12 : at - 5);
    }
    ctx.restore();
  },
};
const tooltipValue = (symbol) => ({ callbacks: { label: (ctx) => ` ${symbol} = ${ItemMath.format(ctx.raw, 3)}` } });

// ============================================================
// NAVIGATION
// ============================================================
function showSection(id) {
  document.querySelectorAll(".section").forEach((s) => s.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  const idx = ["intro", "dificultad", "homogeneidad", "validez", "azar", "practica"].indexOf(id);
  document.querySelectorAll(".nav-btn")[idx].classList.add("active");
  // Respeta la preferencia de movimiento reducido.
  window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}

function showTab(section, tab) {
  const prefix = section + "_",
    panel = document.getElementById(prefix + tab);
  if (!panel) return;
  const parent = panel.closest(".section");
  parent.querySelectorAll(".tab-content").forEach((x) => x.classList.toggle("active", x === panel));
  parent.querySelectorAll(".tab-btn").forEach((x) => {
    const on = x.getAttribute("onclick").includes("'" + tab + "'");
    x.classList.toggle("active", on);
    x.setAttribute("aria-pressed", String(on));
  });
  requestAnimationFrame(() => Object.values(Chart.instances).forEach((c) => c.resize()));
}

// ============================================================
// DIFICULTAD - SIMULADOR PRINCIPAL
// ============================================================
function calcDificultad() {
  const N = parseInt(document.getElementById("dif_N").value);
  const Amax = N;
  document.getElementById("dif_A").max = Amax;
  document.getElementById("dif_A_max").textContent = Amax;
  let A = parseInt(document.getElementById("dif_A").value);
  if (A > N) {
    A = N;
    document.getElementById("dif_A").value = N;
  }

  document.getElementById("dif_N_val").textContent = N;
  document.getElementById("dif_A_val").textContent = A;

  const p = A / N;
  const res = document.getElementById("dif_res_val");
  const rb = document.getElementById("dif_result");
  const marker = document.getElementById("dif_marker");

  res.textContent = ItemMath.format(p, 3);
  marker.style.left = p * 100 + "%";

  let interp = "",
    cls = "";
  if (p < 0.2) {
    interp = "⚠️ Muy difícil: aporta poca información para la mayoría. Revisa clave, redacción y contenido enseñado.";
    cls = "bad";
  } else if (p < 0.4) {
    interp = "Difícil. Puede ser útil para diferenciar entre quienes más saben.";
    cls = "mid";
  } else if (p <= 0.6) {
    interp =
      "Varianza próxima al máximo; comprueba la discriminación con los datos. Con adivinación, la referencia es (1 + 1/k)/2.";
    cls = "good";
  } else if (p <= 0.8) {
    interp = "Fácil. Queda menos varianza para discriminar.";
    cls = "mid";
  } else {
    interp = "⚠️ Muy fácil: casi todos aciertan. Útil solo si interesa detectar a quien no domina lo básico.";
    cls = "bad";
  }

  document.getElementById("dif_res_interp").textContent = interp;
  rb.className = "result-box " + cls;
}

// ============================================================
// DIFICULTAD - TABLA EJEMPLO
// ============================================================
let difChart = null;
function initDifTable() {
  const data = [
    [1, 1, 1, 0],
    [2, 1, 0, 0],
    [3, 0, 1, 1],
    [4, 1, 1, 0],
    [5, 0, 0, 1],
  ];
  const tbody = document.getElementById("dif_tbody");
  tbody.innerHTML = "";
  data.forEach((r, ri) => {
    const tr = document.createElement("tr");
    let cells = `<td>${ri + 1}</td>`;
    for (let c = 1; c <= 3; c++) {
      cells += `<td><input class="item-input" style="width:42px;" id="dt_${ri + 1}_${c}" value="${r[c]}" min="0" max="1" oninput="updateDifTable()"></td>`;
    }
    const tot = r[1] + r[2] + r[3];
    cells += `<td id="dt_tot_${ri + 1}">${tot}</td>`;
    tr.innerHTML = cells;
    tbody.appendChild(tr);
  });
  updateDifTable();
}

function updateDifTable() {
  const N = 5;
  const items = 3;
  const A = [0, 0, 0];
  const answered = [0, 0, 0];

  for (let s = 1; s <= N; s++) {
    let tot = 0;
    for (let c = 1; c <= items; c++) {
      const inp = document.getElementById(`dt_${s}_${c}`);
      if (!inp) continue;
      const v = parseInt(inp.value);
      if (isNaN(v)) continue;
      const vv = Math.max(0, Math.min(1, v));
      inp.value = vv;
      A[c - 1] += vv;
      answered[c - 1]++;
      tot += vv;
    }
    const td = document.getElementById(`dt_tot_${s}`);
    if (td) td.textContent = tot;
  }

  const labels = ["Ítem 1", "Ítem 2", "Ítem 3"];
  const pVals = [];
  const colors = [];
  for (let c = 0; c < items; c++) {
    const p = answered[c] > 0 ? A[c] / answered[c] : NaN;
    pVals.push(p);
    const el = document.getElementById(`dif_d${c + 1}`);
    const ei = document.getElementById(`dif_i${c + 1}`);
    if (el) el.textContent = ItemMath.format(p, 2);
    // Barras con la paleta de series; el texto usa tonos con contraste ≥ 4.5:1 sobre blanco.
    let interp = "",
      color = "",
      ink = "";
    if (!Number.isFinite(p)) {
      interp = "Sin respuestas válidas";
      color = ink = "#4d4d4d";
    } else if (p < 0.2) {
      interp = "Muy difícil";
      color = ink = "#a80808";
    } else if (p < 0.4) {
      interp = "Difícil";
      color = "#b98409";
      ink = "#7a5600";
    } else if (p <= 0.6) {
      interp = "Media";
      color = ink = "#2a49d4";
    } else if (p <= 0.8) {
      interp = "Fácil";
      color = "#b98409";
      ink = "#7a5600";
    } else {
      interp = "Muy fácil";
      color = ink = "#001391";
    }
    if (ei) {
      ei.textContent = interp;
      ei.style.color = ink;
    }
    colors.push(color);
  }

  const ctx = document.getElementById("dif_chart");
  if (!ctx) return;
  if (difChart) difChart.destroy();
  difChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Proporción de aciertos (p)",
          data: pVals,
          backgroundColor: colors.map((c) => c + "99"),
          borderColor: colors,
          borderWidth: 2,
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { min: 0, max: 1, grid: { color: "rgba(0,0,0,0.06)" }, ticks: { callback: (v) => ItemMath.format(v, 1) } },
        x: { grid: { display: false } },
      },
      plugins: {
        legend: { display: false },
        tooltip: tooltipValue("p"),
      },
    },
  });
}

// ============================================================
// DIFICULTAD - POLITÓMICO
// ============================================================
let polChart = null;
function calcPolitomico() {
  const N = parseInt(document.getElementById("pol_N").value) || 1;
  const A = parseInt(document.getElementById("pol_A").value) || 0;
  const k = parseInt(document.getElementById("pol_k").value);
  const F = N - A;
  const pj = A / N;
  const pc = pj - F / N / (k - 1);

  document.getElementById("pol_Dj").textContent = ItemMath.format(pj, 3);
  document.getElementById("pol_Dc").textContent = ItemMath.format(pc, 3);
  document.getElementById("pol_diff").textContent = ItemMath.format(pj - pc, 3);

  let interp = "";
  if (pc < 0)
    interp = `⚠️ Valor negativo: hay más errores de los que produciría adivinar (p < 1/k = ${ItemMath.format(1 / k, 2)}). Revisa la clave y los distractores.`;
  else if (pc < 0.2) interp = "Muy difícil tras la corrección: revisa clave, redacción y contenido enseñado.";
  else if (pc <= 0.8) interp = "Dificultad corregida intermedia. Interprétala junto con la discriminación del ítem.";
  else interp = "Muy fácil incluso tras la corrección.";

  document.getElementById("pol_interp").textContent = interp;

  const ctx = document.getElementById("pol_chart");
  if (!ctx) return;
  if (polChart) polChart.destroy();
  polChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Sin corregir (p_j)", "Corregido (p_j^c)"],
      datasets: [
        {
          data: [pj, pc],
          backgroundColor: ["rgba(0,19,145,0.7)", "rgba(42,73,212,0.7)"],
          borderColor: ["#001391", "#2a49d4"],
          borderWidth: 2,
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { min: -1, max: 1 }, x: { grid: { display: false } } },
      plugins: { legend: { display: false }, tooltip: tooltipValue("p") },
    },
  });
}

// ============================================================
// DIFICULTAD - VARIANZA
// ============================================================
let varChart = null;
function calcVarianza() {
  const pval = parseInt(document.getElementById("var_D").value) / 100;
  const s2 = pval * (1 - pval);
  document.getElementById("var_D_val").textContent = `p = ${ItemMath.format(pval, 2)}`;
  document.getElementById("var_dval").textContent = ItemMath.format(pval, 2);
  document.getElementById("var_sval").textContent = ItemMath.format(s2, 4);
  document.getElementById("var_pct").textContent = ((s2 / 0.25) * 100).toFixed(0) + "%";

  const ctx = document.getElementById("var_chart");
  if (!ctx) return;
  const ps = Array.from({ length: 101 }, (_, i) => i / 100);
  const Vs = ps.map((d) => d * (1 - d));

  if (varChart) varChart.destroy();
  varChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: ps.map((d) => ItemMath.format(d, 2)),
      datasets: [
        {
          label: "Varianza s²_j = p·q",
          data: Vs,
          borderColor: "#001391",
          backgroundColor: "rgba(0,19,145,0.08)",
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2.5,
        },
        {
          label: "Dificultad actual",
          data: ps.map((d) => (Math.abs(d - pval) < 0.005 ? s2 : null)),
          backgroundColor: "#a80808",
          borderColor: "#a80808",
          pointRadius: 8,
          pointHoverRadius: 10,
          type: "scatter",
          showLine: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { title: { display: true, text: "Índice de dificultad (p)" }, ticks: { maxTicksLimit: 6 } },
        y: { title: { display: true, text: "Varianza del ítem (p·q)" }, min: 0, max: 0.27 },
      },
      plugins: { tooltip: { filter: (i) => i.datasetIndex === 1 }, legend: { display: false } },
    },
  });
}

// ============================================================
// HOMOGENEIDAD - GRÁFICO CONCEPTO
// ============================================================
function initHomConceptoChart() {
  const ctx = document.getElementById("hom_concepto_chart");
  if (!ctx) return;
  const items = ["HAM_17", "HAM_11", "HAM_15", "HAM_1", "HAM_5", "HAM_16", "HAM_6", "HAM_3"];
  const vals = [0.761, 0.629, 0.609, 0.6, 0.529, 0.524, 0.471, 0.223];
  const colors = vals.map((v) => (v >= 0.3 ? (v >= 0.5 ? "#001391" : "#2a49d4") : "#a80808"));

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: items,
      datasets: [
        {
          label: "r ítem-resto",
          data: vals,
          backgroundColor: colors.map((c) => c + "99"),
          borderColor: colors,
          borderWidth: 2,
          borderRadius: 6,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { min: 0, max: 1, title: { display: true, text: "r ítem-resto (corregida)" } },
        y: { grid: { display: false } },
      },
      plugins: {
        legend: { display: false },
        tooltip: tooltipValue("r"),
        refLine: { axis: "x", value: 0.3, label: "0.30 orientativo" },
      },
    },
    plugins: [refLine],
  });
}

// ============================================================
// PEARSON CALCULATOR
// ============================================================
function initPearsonTable() {
  const defaults = [
    [3, 40],
    [2, 35],
    [5, 37],
    [1, 32],
    [null, null],
    [null, null],
    [null, null],
    [null, null],
  ];
  const tbody = document.getElementById("pearson_tbody");
  tbody.innerHTML = "";
  defaults.forEach((d, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>S${i + 1}</td>
      <td><input class="item-input" id="px_${i}_x" value="${d[0] || ""}" oninput="calcPearson()"></td>
      <td><input class="item-input" id="px_${i}_y" value="${d[1] || ""}" oninput="calcPearson()"></td>
      <td id="px_${i}_x2">—</td>
      <td id="px_${i}_y2">—</td>
      <td id="px_${i}_xy">—</td>`;
    tbody.appendChild(tr);
  });
  calcPearson();
}

function calcPearson() {
  let Xs = [],
    Ys = [];
  for (let i = 0; i < 8; i++) {
    const xv = parseFloat(document.getElementById(`px_${i}_x`)?.value);
    const yv = parseFloat(document.getElementById(`px_${i}_y`)?.value);
    if (!isNaN(xv) && !isNaN(yv)) {
      Xs.push(xv);
      Ys.push(yv);
    } else {
      Xs.push(null);
      Ys.push(null);
    }
  }
  const pairs = Xs.map((x, i) => ({ x, y: Ys[i] })).filter((p) => p.x !== null);
  const N = pairs.length;

  for (let i = 0; i < 8; i++) {
    const x = Xs[i],
      y = Ys[i];
    document.getElementById(`px_${i}_x2`).textContent = x !== null && y !== null ? (x * x).toFixed(1) : "—";
    document.getElementById(`px_${i}_y2`).textContent = x !== null && y !== null ? (y * y).toFixed(1) : "—";
    document.getElementById(`px_${i}_xy`).textContent = x !== null && y !== null ? (x * y).toFixed(1) : "—";
  }

  if (N < 2) {
    document.getElementById("pearson_r").textContent = "—";
    return;
  }

  const sumX = pairs.reduce((a, p) => a + p.x, 0);
  const sumY = pairs.reduce((a, p) => a + p.y, 0);
  const sumX2 = pairs.reduce((a, p) => a + p.x * p.x, 0);
  const sumY2 = pairs.reduce((a, p) => a + p.y * p.y, 0);
  const sumXY = pairs.reduce((a, p) => a + p.x * p.y, 0);

  document.getElementById("p_sumX").textContent = ItemMath.format(sumX, 1);
  document.getElementById("p_sumY").textContent = ItemMath.format(sumY, 1);
  document.getElementById("p_sumX2").textContent = ItemMath.format(sumX2, 1);
  document.getElementById("p_sumY2").textContent = ItemMath.format(sumY2, 1);
  document.getElementById("p_sumXY").textContent = ItemMath.format(sumXY, 1);

  const num = N * sumXY - sumX * sumY;
  const den = Math.sqrt(N * sumX2 - sumX ** 2) * Math.sqrt(N * sumY2 - sumY ** 2);
  if (!Number.isFinite(den) || den <= 0) {
    document.getElementById("pearson_r").textContent = "—";
    document.getElementById("pearson_interp").textContent = "No definido: una variable no tiene variabilidad.";
    return;
  }
  const r = ItemMath.pearson(
    pairs.map((p) => p.x),
    pairs.map((p) => p.y),
  );

  document.getElementById("pearson_r").textContent = ItemMath.format(r, 3);
  const marker = document.getElementById("pearson_marker");
  if (marker) marker.style.left = ((r + 1) / 2) * 100 + "%";

  // Es la correlación ítem-total SIN corregir: está inflada por la relación parte-todo.
  let interp = "",
    cls = "";
  if (r < 0) {
    interp = "Relación inversa: comprueba si es un ítem inverso sin recodificar (x′ = mín + máx − x).";
    cls = "bad";
  } else if (r < 0.2) {
    interp = "Relación muy débil incluso sin corregir, que la infla: revisa el ítem.";
    cls = "bad";
  } else if (r < 0.3) {
    interp = "Relación débil. La correlación ítem-resto será aún menor.";
    cls = "mid";
  } else {
    interp = `Relación ${r < 0.5 ? "moderada" : "alta"} con el total. Está inflada por incluir el ítem: decide con la correlación ítem-resto.`;
    cls = "good";
  }

  const rb = document.getElementById("pearson_result");
  rb.className = "result-box " + cls;
  document.getElementById("pearson_interp").textContent = interp;
}

// ============================================================
// HOMOGENEIDAD CORREGIDO — tabla expandida
// ============================================================
let homCorrChart = null;
function calcHomCorr() {
  const mat = [];
  for (let s = 0; s < 4; s++) {
    mat.push([readItem(`cv_${s + 1}1`), readItem(`cv_${s + 1}2`), readItem(`cv_${s + 1}3`)]);
  }

  // Update totals and rest columns
  for (let s = 0; s < 4; s++) {
    const tot = mat[s][0] + mat[s][1] + mat[s][2];
    const td = document.getElementById(`cv_t${s + 1}`);
    if (td) td.textContent = tot;
    for (let c = 0; c < 3; c++) {
      const rest = tot - mat[s][c];
      const el = document.getElementById(`cv_rest${c + 1}_${s + 1}`);
      if (el) el.textContent = rest;
    }
  }

  const totals = mat.map((r) => r[0] + r[1] + r[2]);
  const rFull = [],
    rCorr = [];

  for (let c = 0; c < 3; c++) {
    const iv = mat.map((r) => r[c]);
    const rv = mat.map((r) => r.reduce((s, v, i) => (i !== c ? s + v : s), 0));
    const rf = ItemMath.pearson(iv, totals);
    const rc = ItemMath.pearson(iv, rv);
    rFull.push(rf);
    rCorr.push(rc);

    // Update footer rows
    const rf_el = document.getElementById(`hc_r${c + 1}_bot`);
    const rc_el = document.getElementById(`hc_rc${c + 1}_bot`);
    const diff_el = document.getElementById(`hc_diff${c + 1}`);
    if (rf_el) rf_el.textContent = ItemMath.format(rf, 3);
    if (rc_el) rc_el.textContent = ItemMath.format(rc, 3);
    if (diff_el) diff_el.textContent = ItemMath.signed(rf - rc, 3);
  }

  const ctx = document.getElementById("hom_corr_chart");
  if (!ctx) return;
  if (homCorrChart) homCorrChart.destroy();
  const labels = ["Ítem 1", "Ítem 2", "Ítem 3"];
  homCorrChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Sin corregir (con total)",
          data: rFull.map((r) => +ItemMath.format(r, 3)),
          backgroundColor: "rgba(0,19,145,0.7)",
          borderColor: "#001391",
          borderWidth: 2,
          borderRadius: 6,
        },
        {
          label: "Corregido (con resto)",
          data: rCorr.map((r) => +ItemMath.format(r, 3)),
          backgroundColor: "rgba(42,73,212,0.7)",
          borderColor: "#2a49d4",
          borderWidth: 2,
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { min: -1, max: 1, title: { display: true, text: "Correlación r" }, grid: { color: "rgba(0,0,0,0.07)" } },
        x: { grid: { display: false } },
      },
      plugins: {
        legend: { display: true, position: "top" },
        tooltip: tooltipValue("r"),
        refLine: { value: 0.3, label: "0.30 orientativo (ítem-resto)" },
      },
    },
    plugins: [refLine],
  });
}

// ============================================================
// SIMULADOR: efecto nº ítems sobre corrección
// ============================================================
function simCorreccion() {
  const q = Number(document.getElementById("sim_q").value) / 100,
    r = Number(document.getElementById("sim_r").value) / 100;
  const rc = ItemMath.corrected(r, q);
  document.getElementById("sim_q_val").textContent = ItemMath.format(q, 2);
  document.getElementById("sim_r_val").textContent = "r = " + ItemMath.format(r, 2);
  document.getElementById("sim_rsin").textContent = ItemMath.format(r);
  document.getElementById("sim_rcorr").textContent = ItemMath.format(rc);
  document.getElementById("sim_rdiff").textContent = ItemMath.signed(r - rc);
  document.getElementById("sim_msg").textContent = Number.isFinite(rc)
    ? "Transformación exacta: (r − q) / √(1 − 2rq + q²), con q = SD del ítem / SD del total. No estima q a partir de la longitud del test."
    : "No se puede calcular: la varianza del resto es cero.";
}

// ============================================================
// PASO A PASO — calculadora corregida
// ============================================================
let pasoChart = null;
let pasoSelectedItem = 0;

const pasoDefaults = {
  3: {
    suj: 7,
    data: [
      [3, 2, 3],
      [2, 3, 4],
      [5, 5, 5],
      [1, 1, 3],
      [4, 3, 2],
      [2, 4, 3],
      [3, 2, 4],
    ],
  },
  4: {
    suj: 7,
    data: [
      [3, 2, 3, 2],
      [2, 3, 4, 3],
      [5, 5, 5, 4],
      [1, 1, 3, 2],
      [4, 3, 2, 3],
      [2, 4, 3, 2],
      [3, 2, 4, 4],
    ],
  },
  5: {
    suj: 7,
    data: [
      [3, 2, 3, 2, 4],
      [2, 3, 4, 3, 2],
      [5, 5, 5, 4, 5],
      [1, 1, 3, 2, 1],
      [4, 3, 2, 3, 4],
      [2, 4, 3, 2, 3],
      [3, 2, 4, 4, 3],
    ],
  },
  6: {
    suj: 7,
    data: [
      [3, 2, 3, 2, 4, 3],
      [2, 3, 4, 3, 2, 4],
      [5, 5, 5, 4, 5, 4],
      [1, 1, 3, 2, 1, 2],
      [4, 3, 2, 3, 4, 3],
      [2, 4, 3, 2, 3, 2],
      [3, 2, 4, 4, 3, 5],
    ],
  },
};

function buildPasoTable() {
  const k = parseInt(document.getElementById("paso_nitems").value);
  const ns = parseInt(document.getElementById("paso_nsuj").value);
  const defs = pasoDefaults[k];

  const thead = document.getElementById("paso_thead");
  const tbody = document.getElementById("paso_tbody");

  // Build header
  let hdr = "<tr><th>Sujeto</th>";
  for (let c = 0; c < k; c++) hdr += `<th>Ítem ${c + 1}</th>`;
  hdr += '<th style="background:#0c3d00;">Total</th></tr>';
  thead.innerHTML = hdr;

  // Build body
  tbody.innerHTML = "";
  for (let s = 0; s < ns; s++) {
    const tr = document.createElement("tr");
    let cells = `<td>S${s + 1}</td>`;
    for (let c = 0; c < k; c++) {
      const val = defs && defs.data[s] ? defs.data[s][c] : 3;
      cells += `<td><input class="item-input" id="paso_${s}_${c}" value="${val}" oninput="calcPaso()"></td>`;
    }
    cells += `<td id="paso_tot_${s}" style="color:var(--success);font-weight:700;">—</td>`;
    tr.innerHTML = cells;
    tbody.appendChild(tr);
  }

  // Build item buttons
  const btns = document.getElementById("paso_item_btns");
  btns.innerHTML = "";
  for (let c = 0; c < k; c++) {
    const btn = document.createElement("button");
    btn.className = "btn btn-outline" + (c === 0 ? " btn-primary" : "");
    btn.id = `paso_btn_${c}`;
    btn.textContent = `Ver Ítem ${c + 1}`;
    btn.onclick = () => showPasoDetail(c);
    btns.appendChild(btn);
  }

  pasoSelectedItem = 0;
  calcPaso();
}

function getPasoMatrix() {
  const k = parseInt(document.getElementById("paso_nitems").value);
  const ns = parseInt(document.getElementById("paso_nsuj").value);
  const mat = [];
  for (let s = 0; s < ns; s++) {
    const row = [];
    for (let c = 0; c < k; c++) {
      row.push(readItem(`paso_${s}_${c}`));
    }
    mat.push(row);
  }
  return mat;
}

function calcPaso() {
  const mat = getPasoMatrix();
  const ns = mat.length;
  const k = mat[0].length;
  const totals = mat.map((r) => r.reduce((a, v) => a + v, 0));

  // Update totals
  for (let s = 0; s < ns; s++) {
    const td = document.getElementById(`paso_tot_${s}`);
    if (td) td.textContent = totals[s];
  }

  const rFull = [],
    rCorr = [];
  for (let c = 0; c < k; c++) {
    const iv = mat.map((r) => r[c]);
    const rv = mat.map((r) => r.reduce((s, v, i) => (i !== c ? s + v : s), 0));
    rFull.push(ItemMath.pearson(iv, totals));
    rCorr.push(ItemMath.pearson(iv, rv));
  }

  // Summary table
  const sb = document.getElementById("paso_summary_body");
  sb.innerHTML = "";
  for (let c = 0; c < k; c++) {
    const rf = rFull[c],
      rc = rCorr[c];
    const diff = rf - rc;
    sb.innerHTML += `<tr>
      <td class="bold">Ítem ${c + 1}</td>
      <td>${ItemMath.format(rf, 3)}</td>
      <td style="font-weight:700; color:${rc >= 0.3 ? "#070e46" : "#a80808"};">${ItemMath.format(rc, 3)}</td>
      <td style="color:#a80808; font-weight:600;">${ItemMath.signed(diff, 3)}</td>
      <td>${restReading(rc, true)}</td>
    </tr>`;
  }

  // Chart
  const ctx = document.getElementById("paso_chart");
  if (!ctx) return;
  if (pasoChart) pasoChart.destroy();
  const labels = Array.from({ length: k }, (_, i) => `Ítem ${i + 1}`);
  pasoChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "r sin corregir (con total)",
          data: rFull.map((r) => +ItemMath.format(r, 3)),
          backgroundColor: "rgba(0,19,145,0.7)",
          borderColor: "#001391",
          borderWidth: 2,
          borderRadius: 6,
        },
        {
          label: "r corregido (con resto)",
          data: rCorr.map((r) => +ItemMath.format(r, 3)),
          backgroundColor: "rgba(42,73,212,0.7)",
          borderColor: "#2a49d4",
          borderWidth: 2,
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          min: -1,
          max: 1,
          title: { display: true, text: "Correlación r" },
          grid: { color: "rgba(0,0,0,0.07)" },
          ticks: { callback: (v) => ItemMath.format(v, 1) },
        },
        x: { grid: { display: false } },
      },
      plugins: {
        legend: { display: true, position: "top" },
        tooltip: tooltipValue("r"),
        refLine: { value: 0.3, label: "0.30 orientativo (ítem-resto)" },
      },
    },
    plugins: [refLine],
  });

  showPasoDetail(pasoSelectedItem);
}

/* Lectura orientativa de una correlación ítem-resto (0.30 es una convención, no una regla). */
function restReading(rc, html) {
  const [text, cls] = !Number.isFinite(rc)
    ? ["— Sin variabilidad", ""]
    : rc < 0
      ? ["⚠️ Inversa: ¿ítem sin recodificar?", "bad-cell"]
      : rc < 0.3
        ? ["Por debajo de 0.30: revisar", "bad-cell"]
        : rc < 0.5
          ? ["Adecuada (≥ 0.30)", "good-cell"]
          : ["Alta (≥ 0.50)", "good-cell"];
  return html && cls ? `<span class="${cls}">${text}</span>` : text;
}

function showPasoDetail(itemIdx) {
  pasoSelectedItem = itemIdx;
  const mat = getPasoMatrix();
  const n = mat.length;
  const k = mat[0].length;
  const totals = mat.map((r) => r.reduce((a, v) => a + v, 0));
  const itemVals = mat.map((r) => r[itemIdx]);
  const restVals = mat.map((r) => r.reduce((s, v, i) => (i !== itemIdx ? s + v : s), 0));

  const rf = ItemMath.pearson(itemVals, totals);
  const rc = ItemMath.pearson(itemVals, restVals);

  // Update button styles
  for (let c = 0; c < k; c++) {
    const btn = document.getElementById(`paso_btn_${c}`);
    if (btn) btn.className = "btn btn-outline" + (c === itemIdx ? " btn-primary" : "");
  }

  // Sums for Pearson formula
  const sumX = itemVals.reduce((a, v) => a + v, 0);
  const sumY_total = totals.reduce((a, v) => a + v, 0);
  const sumY_rest = restVals.reduce((a, v) => a + v, 0);
  const sumX2 = itemVals.reduce((a, v) => a + v * v, 0);
  const sumYt2 = totals.reduce((a, v) => a + v * v, 0);
  const sumYr2 = restVals.reduce((a, v) => a + v * v, 0);
  const sumXYt = itemVals.reduce((a, v, i) => a + v * totals[i], 0);
  const sumXYr = itemVals.reduce((a, v, i) => a + v * restVals[i], 0);

  // Build rest items text
  const restItems = Array.from({ length: k }, (_, i) => i)
    .filter((i) => i !== itemIdx)
    .map((i) => `Ítem ${i + 1}`)
    .join(" + ");

  let tableRows = "";
  mat.forEach((row, s) => {
    tableRows += `<tr>
      <td>S${s + 1}</td>
      <td style="font-weight:700;color:var(--accent);">${row[itemIdx]}</td>
      <td style="color:var(--success);">${totals[s]}</td>
      <td style="color:var(--accent2);">${restVals[s]}</td>
      <td>${(row[itemIdx] * row[itemIdx]).toFixed(0)}</td>
      <td>${(totals[s] * totals[s]).toFixed(0)}</td>
      <td>${(restVals[s] * restVals[s]).toFixed(0)}</td>
      <td>${(row[itemIdx] * totals[s]).toFixed(0)}</td>
      <td>${(row[itemIdx] * restVals[s]).toFixed(0)}</td>
    </tr>`;
  });

  const det = document.getElementById("paso_detail");
  det.innerHTML = `
    <div class="info-box mb-16">
      <strong>Ítem ${itemIdx + 1}:</strong> Se correlaciona con (a) el total completo, y (b) el <strong>resto = ${restItems}</strong>
    </div>

    <div style="overflow-x:auto; margin-bottom:20px;">
      <table class="matrix-table">
        <thead>
          <tr>
            <th>Sujeto</th>
            <th style="background:#001391;">X (Í${itemIdx + 1})</th>
            <th style="background:#2a49d4;">Y<sub>total</sub></th>
            <th style="background:#d9edff;color:#070e46;">Y<sub>resto</sub></th>
            <th>X²</th>
            <th>Y²<sub>total</sub></th>
            <th>Y²<sub>resto</sub></th>
            <th>XY<sub>total</sub></th>
            <th>XY<sub>resto</sub></th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
        <tfoot>
          <tr style="background:var(--navy);color:var(--white);font-weight:700;font-size:0.82rem;">
            <td>Σ</td>
            <td style="color:#85c8ff;">${sumX}</td>
            <td style="color:#85c8ff;">${sumY_total}</td>
            <td style="color:#85c8ff;">${sumY_rest}</td>
            <td>${sumX2}</td>
            <td>${sumYt2}</td>
            <td>${sumYr2}</td>
            <td>${sumXYt}</td>
            <td>${sumXYr}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div class="grid-2">
      <div style="background:rgba(0,19,145,0.07); border:1.5px solid rgba(0,19,145,0.25); border-radius:14px; padding:18px;">
        <div style="font-weight:700; color:var(--accent); margin-bottom:10px; font-size:0.88rem; letter-spacing:0.02em;">r sin corregir (Ítem ${itemIdx + 1} × Total)</div>
        <div style="font-size:0.82rem; color:var(--muted); margin-bottom:8px;">
          Numerador: ${n}×${sumXYt} − ${sumX}×${sumY_total} = <strong>${(n * sumXYt - sumX * sumY_total).toFixed(2)}</strong>
        </div>
        <div style="font-size:0.82rem; color:var(--muted); margin-bottom:12px;">
          Denominador: √(${n}×${sumX2}−${sumX}²) × √(${n}×${sumYt2}−${sumY_total}²)
        </div>
        <div style="background:var(--navy); border-radius:10px; padding:14px; text-align:center;">
          <div style="font-size:0.72rem; color:rgba(255,255,255,0.5); margin-bottom:6px;">r sin corregir</div>
          <div style="font-family:var(--body); font-size:2rem; font-weight:700; color:#ffffff;">${ItemMath.format(rf, 3)}</div>
          <div style="font-size:0.8rem; margin-top:4px; color:rgba(255,255,255,0.75);">Inflada por incluir el ítem: no la uses para decidir</div>
        </div>
      </div>

      <div style="background:rgba(42,73,212,0.07); border:1.5px solid rgba(42,73,212,0.3); border-radius:14px; padding:18px;">
        <div style="font-weight:700; color:#070e46; margin-bottom:10px; font-size:0.88rem; letter-spacing:0.02em;">r corregido (Ítem ${itemIdx + 1} × Resto)</div>
        <div style="font-size:0.82rem; color:var(--muted); margin-bottom:8px;">
          Numerador: ${n}×${sumXYr} − ${sumX}×${sumY_rest} = <strong>${(n * sumXYr - sumX * sumY_rest).toFixed(2)}</strong>
        </div>
        <div style="font-size:0.82rem; color:var(--muted); margin-bottom:12px;">
          Denominador: √(${n}×${sumX2}−${sumX}²) × √(${n}×${sumYr2}−${sumY_rest}²)
        </div>
        <div style="background:linear-gradient(135deg,#070e46,#070e46); border-radius:10px; padding:14px; text-align:center;">
          <div style="font-size:0.72rem; color:rgba(255,255,255,0.5); margin-bottom:6px;">r corregido</div>
          <div style="font-family:var(--body); font-size:2rem; font-weight:700; color:${rc >= 0.3 ? "#85c8ff" : "#ffe761"};">${ItemMath.format(rc, 3)}</div>
          <div style="font-size:0.8rem; margin-top:4px; color:rgba(255,255,255,0.75);">${restReading(rc, false)}</div>
        </div>
      </div>
    </div>

    <div style="margin-top:14px; background:rgba(168,8,8,0.07); border:1px solid rgba(168,8,8,0.2); border-radius:12px; padding:14px 18px; font-size:0.88rem;">
      <strong>Inflación por no corregir:</strong> ${ItemMath.format(rf, 3)} − ${ItemMath.format(rc, 3)} = 
      <strong style="color:#a80808;">${ItemMath.signed(rf - rc, 3)}</strong> — 
      ${rf - rc > 0.1 ? "diferencia relevante: usa el índice corregido para decidir" : "diferencia pequeña, pero el índice corregido es el adecuado para decidir"}
    </div>
  `;
}

// ============================================================
// VALIDEZ
// ============================================================
let valChart = null;
function calcValidez() {
  const rv = parseInt(document.getElementById("val_r").value) / 100;
  document.getElementById("val_r_val").textContent = `r = ${ItemMath.format(rv, 2)}`;
  document.getElementById("val_r_disp").textContent = ItemMath.format(rv, 2);
  const r2 = rv * rv;
  document.getElementById("val_r2").textContent = ItemMath.format(r2, 4);
  document.getElementById("val_pct").textContent = ItemMath.format(r2 * 100, 1) + " %";

  let interp = "",
    cls = "";
  if (rv < 0) {
    interp = "Correlación negativa con el criterio. Revisar la dirección esperada.";
    cls = "bad";
  } else if (rv < 0.1) {
    interp = "Relación trivial: el ítem apenas se relaciona con este criterio.";
    cls = "bad";
  } else if (rv < 0.3) {
    interp = "Relación débil: el ítem explica poca varianza del criterio.";
    cls = "mid";
  } else if (rv < 0.5) {
    interp = "Relación moderada con el criterio: aporta evidencia de validez respecto de él.";
    cls = "good";
  } else {
    interp = "Relación fuerte con el criterio. Sigue siendo una evidencia entre otras, no una prueba de validez.";
    cls = "good";
  }

  const rb = document.getElementById("val_result");
  rb.className = "result-box " + cls;
  document.getElementById("val_interp").textContent = interp;
}

function initValChart() {
  const ctx = document.getElementById("val_chart");
  if (!ctx) return;
  valChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Ítem 1\n(Exploto al enfadar)", "Ítem 2\n(Actúo impulsivo)", "Ítem 3\n(Pienso que me fastidian)"],
      datasets: [
        {
          label: "r Homogeneidad",
          data: [0.638, 0.348, 0.215],
          backgroundColor: "rgba(0,19,145,0.7)",
          borderColor: "#001391",
          borderWidth: 2,
          borderRadius: 6,
        },
        {
          label: "r Validez (vs CA)",
          data: [0.213, 0.348, 0.02],
          backgroundColor: "rgba(185,132,9,0.7)",
          borderColor: "#b98409",
          borderWidth: 2,
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { min: 0, max: 0.8, title: { display: true, text: "Correlación r" } },
        x: { grid: { display: false } },
      },
      plugins: { legend: { display: true, position: "top" } },
    },
  });
}

// ============================================================
// CORRECCIÓN POR AZAR
// ============================================================
let azChart = null;
function calcAzar() {
  const total = Number(document.getElementById("az_total").value);
  const conoce = Math.min(total, Number(document.getElementById("az_conoce").value));
  document.getElementById("az_conoce").max = total;
  document.getElementById("az_con_val").textContent = conoce;
  const estrategia = document.getElementById("az_estrategia").value;
  const k = parseInt(document.getElementById("az_k").value);
  const restantes = total - conoce;

  document.getElementById("az_azar_opts").style.display = estrategia === "azar" ? "block" : "none";
  document.getElementById("az_con_max").textContent = total;
  if (conoce > total) document.getElementById("az_conoce").value = total;

  let Xsin, Xc, interp, cls;
  if (estrategia === "omite") {
    Xsin = conoce;
    Xc = conoce;
    interp = `Omite ${restantes} ítems. Sin penalización. Puntuación observada = ${conoce}.`;
    cls = "good";
  } else {
    const Ra = restantes;
    const aciertos_azar = Ra / k;
    const E = (Ra * (k - 1)) / k;
    Xsin = conoce + aciertos_azar;
    Xc = Xsin - E / (k - 1);

    interp = `Responde al azar ${Ra} ítems → ${ItemMath.format(aciertos_azar, 2)} aciertos y ${ItemMath.format(E, 2)} errores esperados. Corregida: ${ItemMath.format(Xsin, 2)} − ${ItemMath.format(E, 2)}/${k - 1} = ${ItemMath.format(Xc, 2)}, igual a los ${conoce} ítems que sabe, en esperanza y bajo azar uniforme.`;
    cls = "good";
  }

  document.getElementById("az_Xsin").textContent = ItemMath.format(Xsin, 2);
  document.getElementById("az_Xc").textContent = ItemMath.format(Xc, 2);
  document.getElementById("az_interp").textContent = interp;
  const rb = document.getElementById("az_result");
  rb.className = "result-box " + cls;

  const ctx = document.getElementById("az_chart");
  if (!ctx) return;
  if (azChart) azChart.destroy();
  azChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Sujeto Omite", "Sujeto Azar (bruta)", "Sujeto Azar (corregida)"],
      datasets: [
        {
          data: [conoce, Xsin, Xc],
          backgroundColor: ["rgba(42,73,212,0.7)", "rgba(185,132,9,0.7)", "rgba(42,73,212,0.7)"],
          borderColor: ["#2a49d4", "#b98409", "#2a49d4"],
          borderWidth: 2,
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { title: { display: true, text: "Puntuación" } }, x: { grid: { display: false } } },
      plugins: { legend: { display: false } },
    },
  });
}

// ============================================================
// PRÁCTICA GLOBAL
// ============================================================
let practicaChart = null;
const practicaDefaults = [
  [2, 3, 4, 2, 16],
  [3, 4, 1, 3, 21],
  [1, 1, 2, 2, 8],
  [4, 2, 3, 2, 11],
  [2, 4, 4, 2, 12],
  [3, 3, 1, 3, 10],
  [5, 4, 2, 4, 19],
  [2, 3, 5, 1, 14],
];

function initPractica() {
  const tbody = document.getElementById("practica_tbody");
  tbody.innerHTML = "";
  practicaDefaults.forEach((r, i) => {
    const tr = document.createElement("tr");
    let cells = `<td>${i + 1}</td>`;
    for (let c = 0; c < 4; c++) {
      cells += `<td><input class="item-input" id="pr_${i}_${c}" value="${r[c]}" oninput="updatePractica()"></td>`;
    }
    cells += `<td id="pr_tot_${i}" style="font-weight:700;">${r[0] + r[1] + r[2] + r[3]}</td>`;
    cells += `<td><input class="item-input" id="pr_crit_${i}" value="${r[4]}" oninput="updatePractica()"></td>`;
    tr.innerHTML = cells;
    tbody.appendChild(tr);
  });
  updatePractica();
}

function updatePractica() {
  const N = 8;
  const mat = [],
    crits = [];
  for (let s = 0; s < N; s++) {
    const row = [];
    for (let c = 0; c < 4; c++) row.push(readItem(`pr_${s}_${c}`));
    mat.push(row);
    crits.push(readItem(`pr_crit_${s}`));
    const tot = row.reduce((a, v) => a + v, 0);
    const td = document.getElementById(`pr_tot_${s}`);
    if (td) td.textContent = tot;
  }

  const totals = mat.map((r) => r.reduce((a, v) => a + v, 0));
  const means = [0, 1, 2, 3].map((c) => mat.reduce((s, r) => s + r[c], 0) / N);
  const meanTot = totals.reduce((a, v) => a + v, 0) / N;

  for (let c = 0; c < 4; c++) {
    const el = document.getElementById(`pr_m${c + 1}`);
    if (el) el.textContent = ItemMath.format(means[c], 2);
  }
  document.getElementById("pr_mt").textContent = ItemMath.format(meanTot, 2);

  const column = (c) => mat.map((r) => r[c]);
  const rHom = [0, 1, 2, 3].map((c) => ItemMath.pearson(column(c), totals));
  const rVal = [0, 1, 2, 3].map((c) => ItemMath.pearson(column(c), crits));
  const rHomCorr = [0, 1, 2, 3].map((c) => ItemMath.itemRest(column(c), totals));
  const alpha = ItemMath.alpha(mat);
  const alphaDrop = [0, 1, 2, 3].map((c) => ItemMath.alpha(mat.map((row) => row.filter((_, i) => i !== c))));

  const tbody2 = document.getElementById("pr_analysis");
  tbody2.innerHTML = "";
  [0, 1, 2, 3].forEach((c) => {
    const rh = rHom[c],
      rhc = rHomCorr[c],
      rv = rVal[c];
    // Lectura basada en el índice corregido (4 ítems: test corto).
    const dcls = !Number.isFinite(rhc) ? "" : rhc >= 0.3 ? "good-cell" : "bad-cell";
    tbody2.innerHTML += `<tr>
      <td class="bold">Ítem ${c + 1}</td>
      <td>${ItemMath.format(means[c], 2)}</td>
      <td>${ItemMath.format(rh, 3)}</td>
      <td class="${rhc >= 0.3 ? "highlight" : "bad-cell"}" style="font-weight:700;">${ItemMath.format(rhc, 3)}</td>
      <td>${ItemMath.format(rv, 3)}</td>
      <td>${ItemMath.format(alphaDrop[c], 3)}</td>
      <td class="${dcls}">${restReading(rhc, false)}</td>
    </tr>`;
  });
  document.getElementById("pr_alpha").textContent = ItemMath.format(alpha, 3);
  const finiteRest = rHomCorr.filter(Number.isFinite),
    worst = finiteRest.length ? rHomCorr.indexOf(Math.min(...finiteRest)) : -1;
  document.getElementById("pr_min_rest").textContent = worst >= 0 ? ItemMath.format(rHomCorr[worst], 3) : "—";
  document.getElementById("pr_comment").textContent = !Number.isFinite(alpha)
    ? "Alfa no definido: la puntuación total no varía."
    : `α = ${ItemMath.format(alpha, 3)}. ${
        alpha < 0.5
          ? "Los cuatro ítems apenas covarían: sumarlos en una puntuación total tiene poco respaldo empírico."
          : "Interpreta α según el uso previsto del test."
      } ${
        worst >= 0
          ? `El ítem ${worst + 1} tiene la menor correlación ítem-resto (r = ${ItemMath.format(rHomCorr[worst], 3)})${
              rHomCorr[worst] < 0
                ? ": relación inversa con el resto. Antes de retirarlo, comprueba si es un ítem inverso sin recodificar o un error de clave"
                : rHomCorr[worst] < 0.3
                  ? ": revísalo"
                  : ""
            }; sin él, α sería ${ItemMath.format(alphaDrop[worst], 3)}.`
          : ""
      } La validez frente al criterio se valora aparte: un ítem poco homogéneo puede relacionarse con el criterio.`;

  const ctx = document.getElementById("practica_chart");
  if (!ctx) return;
  if (practicaChart) practicaChart.destroy();
  practicaChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Ítem 1", "Ítem 2", "Ítem 3", "Ítem 4"],
      datasets: [
        {
          label: "r ítem-total (sin corregir)",
          data: rHom.map((r) => +ItemMath.format(r, 3)),
          backgroundColor: "rgba(0,19,145,0.65)",
          borderColor: "#001391",
          borderWidth: 2,
          borderRadius: 5,
        },
        {
          label: "r ítem-resto (corregida)",
          data: rHomCorr.map((r) => +ItemMath.format(r, 3)),
          backgroundColor: "rgba(42,73,212,0.7)",
          borderColor: "#2a49d4",
          borderWidth: 2,
          borderRadius: 5,
        },
        {
          label: "r Validez (criterio)",
          data: rVal.map((r) => +ItemMath.format(r, 3)),
          backgroundColor: "rgba(185,132,9,0.7)",
          borderColor: "#b98409",
          borderWidth: 2,
          borderRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { min: -1, max: 1, title: { display: true, text: "Correlación" }, grid: { color: "rgba(0,0,0,0.07)" } },
        x: { grid: { display: false } },
      },
      plugins: {
        legend: { display: true, position: "top", labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: tooltipValue("r"),
        refLine: { value: 0.3, label: "0.30 orientativo" },
      },
    },
    plugins: [refLine],
  });
}

// ============================================================
// QUIZ
// ============================================================
// Los cuestionarios de dificultad y homogeneidad los genera Didactica (claves «analisis_dif» y «analisis_hom»).

// ============================================================
// DISCRIMINACIÓN - SCATTER SIMULADOR
// ============================================================
let discChart = null;
function updateDiscriminacion() {
  const rv = parseInt(document.getElementById("disc_r").value) / 100;
  document.getElementById("disc_r_val").textContent = `r = ${ItemMath.format(rv, 2)}`;
  document.getElementById("disc_r_display").textContent = ItemMath.format(rv, 2);

  // Generate correlated data (Box-Muller + Cholesky)
  const N = 60;
  const pts = [];
  for (let i = 0; i < N; i++) {
    const u1 = Math.max(Number.MIN_VALUE, Math.random()),
      u2 = Math.random();
    const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const z2 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);
    const x = z1;
    const y = rv * z1 + Math.sqrt(1 - rv * rv) * z2;
    // Scale to 1–5 (item) and 10–50 (test total, 10 items Likert 1-5)
    const xi = Math.max(1, Math.min(5, Math.round(x * 1.2 + 3)));
    const yi = Math.max(10, Math.min(50, Math.round(y * 9 + 30)));
    pts.push({ x: xi, y: yi });
  }

  document.getElementById("disc_r_display").textContent = ItemMath.format(
    ItemMath.pearson(
      pts.map((p) => p.x),
      pts.map((p) => p.y),
    ),
    2,
  );
  // Color by item score
  const colors = pts.map((p) => {
    if (p.x <= 2) return "rgba(42,73,212,0.75)";
    if (p.x === 3) return "rgba(0,19,145,0.75)";
    return "rgba(185,132,9,0.85)";
  });

  const ctx = document.getElementById("disc_scatter_chart");
  if (!ctx) return;
  if (discChart) discChart.destroy();
  discChart = new Chart(ctx, {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "Sujetos",
          data: pts,
          backgroundColor: colors,
          pointRadius: 5,
          pointHoverRadius: 7,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: { display: true, text: "Puntuación en el ítem (1–5)" },
          min: 0.5,
          max: 5.5,
          ticks: { stepSize: 1 },
        },
        y: { title: { display: true, text: "Puntuación total del test (10–50)" }, min: 8, max: 52 },
      },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c) => `Ítem: ${c.raw.x}, Total: ${c.raw.y}` } },
      },
    },
  });

  let interp = "",
    advice = "",
    cls = "";
  if (rv < -0.1) {
    interp = "Discrimina en sentido inverso";
    advice =
      "⚠️ Quienes tienen más rasgo puntúan bajo en el ítem. Comprueba si es un ítem inverso sin recodificar (x′ = 6 − x en una escala 1–5) y recalcula.";
    cls = "bad";
  } else if (rv < 0.2) {
    interp = "Discriminación nula o muy baja";
    advice = "❌ El ítem apenas distingue entre niveles del constructo. Revisa su contenido y redacción.";
    cls = "bad";
  } else if (rv < 0.3) {
    interp = "Discriminación débil";
    advice =
      "⚠️ Por debajo de la referencia orientativa de 0.30. Recuerda que en datos reales se aplica a la correlación ítem-resto.";
    cls = "mid";
  } else if (rv < 0.5) {
    interp = "Discriminación adecuada ✅";
    advice = "✅ Distingue de forma adecuada entre personas con distinto nivel del constructo.";
    cls = "good";
  } else {
    interp = "Discriminación alta ✅";
    advice =
      "✅ Distingue muy bien entre niveles del constructo y contribuye a la consistencia interna. Si varios ítems son casi idénticos, comprueba la redundancia.";
    cls = "good";
  }
  document.getElementById("disc_interp").textContent = interp;
  document.getElementById("disc_advice").textContent = advice;
  document.getElementById("disc_result_box").className = "result-box " + cls;
}

// ============================================================
// ALPHA DE CRONBACH - SIMULADOR
// ============================================================
let alphaChart = null;
function calcAlpha() {
  const k = parseInt(document.getElementById("alpha_k").value);
  const r = parseInt(document.getElementById("alpha_r").value) / 100;
  document.getElementById("alpha_k_val").textContent = k + " ítems";
  document.getElementById("alpha_r_val").textContent = `r̄ = ${ItemMath.format(r, 2)}`;

  const alpha = ItemMath.standardizedAlpha(k, r);
  document.getElementById("alpha_val").textContent = ItemMath.format(alpha, 3);

  // Orientaciones según el uso (Nunnally y Bernstein, 1994); no son etiquetas universales.
  let interp = "",
    cls = "";
  if (alpha < 0.7) {
    interp = "Por debajo de 0.70: insuficiente para la mayoría de usos; revisa los ítems con r ítem-resto bajo.";
    cls = "bad";
  } else if (alpha < 0.8) {
    interp = "En torno a 0.70: puede bastar en fases iniciales de investigación.";
    cls = "mid";
  } else if (alpha < 0.9) {
    interp = "En torno a 0.80: adecuado para investigación básica y comparaciones entre grupos.";
    cls = "good";
  } else {
    interp =
      "≥ 0.90: el nivel que suele pedirse para decisiones sobre personas. Si es muy alto, revisa la redundancia.";
    cls = "good";
  }

  document.getElementById("alpha_result").className = "result-box " + cls;
  document.getElementById("alpha_interp").textContent = interp;

  // Curvas de α estandarizado frente a r̄ para varias longitudes (eje x numérico) y la del k elegido.
  const rs = Array.from({ length: 90 }, (_, i) => (i + 1) / 100);
  const kValues = [3, 5, 10, 20];
  const kColors = ["#a80808", "#b98409", "#2a49d4", "#001391"];
  const curve = (kv) => rs.map((rv) => ({ x: rv, y: ItemMath.standardizedAlpha(kv, rv) }));

  const ctx = document.getElementById("alpha_chart");
  if (!ctx) return;
  if (alphaChart) alphaChart.destroy();
  alphaChart = new Chart(ctx, {
    type: "line",
    data: {
      datasets: [
        ...kValues.map((kv, i) => ({
          label: `k = ${kv}`,
          data: curve(kv),
          borderColor: kColors[i],
          backgroundColor: "transparent",
          borderWidth: kv === k ? 3 : 1.5,
          pointRadius: 0,
        })),
        ...(kValues.includes(k)
          ? []
          : [
              {
                label: `k = ${k} (tu elección)`,
                data: curve(k),
                borderColor: "#070e46",
                backgroundColor: "transparent",
                borderDash: [6, 4],
                borderWidth: 2.5,
                pointRadius: 0,
              },
            ]),
        {
          label: `Tu configuración (k = ${k}, r̄ = ${ItemMath.format(r, 2)})`,
          type: "scatter",
          data: [{ x: r, y: alpha }],
          backgroundColor: "#b98409",
          borderColor: "#070e46",
          borderWidth: 2,
          pointRadius: 8,
          pointHoverRadius: 10,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: "linear",
          min: 0,
          max: 0.9,
          title: { display: true, text: "Correlación media entre ítems (r̄)" },
          ticks: { stepSize: 0.1, callback: (v) => ItemMath.format(v, 1) },
        },
        y: {
          title: { display: true, text: "α (estandarizado)" },
          min: 0,
          max: 1,
          ticks: { callback: (v) => ItemMath.format(v, 1) },
        },
      },
      plugins: {
        legend: { display: true, position: "top", labels: { font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: (c) => ` ${c.dataset.label}: r̄ = ${ItemMath.format(c.raw.x, 2)}, α = ${ItemMath.format(c.raw.y, 3)}`,
          },
        },
      },
    },
  });
}

// ============================================================
// ELIMINACIÓN DE ÍTEM - EFECTO SOBRE α
// ============================================================
function calcEliminar() {
  const m = Array.from({ length: 4 }, (_, s) =>
    Array.from({ length: 3 }, (_, j) => readItem("cv_" + (s + 1) + (j + 1))),
  );
  const j = Number(document.getElementById("elim_item").value),
    before = ItemMath.alpha(m),
    after = ItemMath.alpha(m.map((row) => row.filter((_, i) => i !== j)));
  for (const id of ["elim_new_alpha", "elim_after"]) document.getElementById(id).textContent = ItemMath.format(after);
  document.getElementById("elim_before").textContent = ItemMath.format(before);
  document.getElementById("elim_change").textContent = ItemMath.format(after - before);
  document.getElementById("elim_result").className = "result-box";
  document.getElementById("elim_verdict").textContent =
    Number.isFinite(before) && Number.isFinite(after)
      ? "Cambio calculado sobre la matriz. No decidas eliminar solo por el alfa: considera contenido y cobertura del constructo."
      : "Completa la matriz y comprueba que la puntuación total tiene varianza. Alfa no definido.";
}

// ============================================================
// ELECCIÓN MÚLTIPLE — GRUPOS EXTREMOS Y DISTRACTORES
// Todo el texto se inserta con textContent; las respuestas se validan contra A–D.
// ============================================================
const MC_OPTIONS = ["A", "B", "C", "D"];
function mcEl(tag, text, cls) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (cls) node.className = cls;
  return node;
}
function buildMC() {
  const ex = ItemMath.MC_EXAMPLE,
    k = ex.key.length;
  const head = document.getElementById("mc_thead"),
    body = document.getElementById("mc_tbody");
  head.replaceChildren();
  body.replaceChildren();
  const h1 = mcEl("tr");
  h1.append(mcEl("th", "Persona"));
  for (let j = 0; j < k; j++) h1.append(mcEl("th", "Ítem " + (j + 1)));
  h1.append(mcEl("th", "Aciertos"), mcEl("th", "Grupo"));
  const h2 = mcEl("tr", undefined, "mc-key");
  const keyLabel = mcEl("th", "Clave");
  keyLabel.scope = "row";
  h2.append(keyLabel);
  for (let j = 0; j < k; j++) {
    const td = mcEl("td"),
      select = mcEl("select");
    select.id = "mc_key_" + j;
    select.setAttribute("aria-label", `Clave del ítem ${j + 1}`);
    for (const o of MC_OPTIONS) {
      const option = mcEl("option", o);
      option.value = o;
      select.append(option);
    }
    select.value = ex.key[j];
    select.addEventListener("change", updateMC);
    td.append(select);
    h2.append(td);
  }
  h2.append(mcEl("td"), mcEl("td"));
  head.append(h1, h2);
  ex.responses.forEach((row, i) => {
    const tr = mcEl("tr"),
      label = mcEl("th", "Persona " + (i + 1));
    label.scope = "row";
    tr.append(label);
    row.forEach((answer, j) => {
      const td = mcEl("td"),
        input = mcEl("input", undefined, "item-input mc-input");
      input.id = `mc_${i}_${j}`;
      input.maxLength = 1;
      input.autocomplete = "off";
      input.value = answer;
      input.setAttribute("aria-label", `Ítem ${j + 1} · Persona ${i + 1}`);
      td.append(input);
      tr.append(td);
    });
    const total = mcEl("td", "—", "mc-total"),
      group = mcEl("td", "", "mc-group");
    total.id = "mc_tot_" + i;
    group.id = "mc_grp_" + i;
    tr.append(total, group);
    body.append(tr);
  });
  for (const id of ["mc_guess", "mc_item"]) {
    const select = document.getElementById(id),
      keep = select.value;
    select.replaceChildren();
    for (let j = 0; j < k; j++) {
      const option = mcEl("option", "Ítem " + (j + 1));
      option.value = j;
      select.append(option);
    }
    if (keep !== "" && Number(keep) < k) select.value = keep;
  }
  if (!document.getElementById("mc_item").dataset.touched) document.getElementById("mc_item").value = "2";
  updateMC();
}
function readMC() {
  const k = ItemMath.MC_EXAMPLE.key.length,
    n = ItemMath.MC_EXAMPLE.responses.length;
  let invalid = 0;
  const responses = Array.from({ length: n }, (_, i) =>
    Array.from({ length: k }, (_, j) => {
      const input = document.getElementById(`mc_${i}_${j}`),
        v = input.value.trim().toUpperCase();
      if (input.value !== v) input.value = v;
      const ok = v === "" || MC_OPTIONS.includes(v);
      input.setAttribute("aria-invalid", String(!ok));
      if (!ok) invalid++;
      return v;
    }),
  );
  const key = Array.from({ length: k }, (_, j) => document.getElementById("mc_key_" + j).value);
  return { responses, key, invalid };
}
function mcReading(it) {
  if (!Number.isFinite(it.D) || !Number.isFinite(it.rRest)) return ["Índices no definidos (sin variación)", ""];
  if (it.D < 0 || it.rRest < 0) return ["Relación nula o inversa: revisa clave y distractores", "bad-cell"];
  const ebel =
    it.D >= 0.4 ? "D muy buena" : it.D >= 0.3 ? "D buena" : it.D >= 0.2 ? "D marginal: mejorable" : "D pobre: revisar";
  const rest = it.rRest < 0.3 ? " · ítem-resto < 0.30: revisar" : "";
  return [ebel + rest, it.D >= 0.3 && it.rRest >= 0.3 ? "good-cell" : it.D < 0.2 ? "bad-cell" : ""];
}
const MC_DIAGNOSIS = {
  "key-ok": "Clave: la eligen más en el grupo superior",
  "key-review": "Clave: no la eligen más en el grupo superior — revisar",
  never: "Nadie la elige: no funciona como distractor",
  upper: "Atrae más al grupo superior: revisar (¿defendible o ambigua?)",
  ok: "Atrae más al grupo inferior: funciona",
  omission: "Omisiones (puntúan 0)",
  undefined: "No definido: grupos extremos inseparables",
};
function mcDiagnosisText(row) {
  const d = ItemMath.optionDiagnosis(row);
  if (d === "flat")
    return row.upper === 0
      ? "Nadie de los grupos extremos la elige: aporta poco"
      : "Atrae por igual a ambos grupos: no discrimina";
  return MC_DIAGNOSIS[d];
}
function updateMC() {
  const { responses, key, invalid } = readMC(),
    res = invalid ? null : ItemMath.analyzeMultipleChoice(responses, key, MC_OPTIONS),
    status = document.getElementById("mc_status"),
    n = responses.length;
  status.textContent = invalid
    ? `Hay ${invalid === 1 ? "una respuesta no válida" : invalid + " respuestas no válidas"}: usa A, B, C o D, o deja la celda vacía (omisión).`
    : res && !res.groups
      ? "No se pueden formar grupos extremos: la puntuación total no varía lo suficiente."
      : "";
  for (let i = 0; i < n; i++) {
    const tot = document.getElementById("mc_tot_" + i),
      grp = document.getElementById("mc_grp_" + i),
      row = tot.parentElement;
    tot.textContent = res ? String(res.totals[i]) : "—";
    const g = res?.groups ? (res.groups.upper.includes(i) ? "S" : res.groups.lower.includes(i) ? "I" : "") : "";
    grp.textContent = g;
    row.classList.toggle("mc-upper", g === "S");
    row.classList.toggle("mc-lower", g === "I");
    responses[i].forEach((answer, j) =>
      document.getElementById(`mc_${i}_${j}`).classList.toggle("mc-hit", !!answer && answer === key[j]),
    );
  }
  const g = res?.groups;
  document.getElementById("mc_groups").textContent = g
    ? `27 % de ${n} ≈ ${g.size} personas por grupo. Superior (S): ${g.upper.length} con ${g.upperCut} aciertos o más · Inferior (I): ${g.lower.length} con ${g.lowerCut} o menos${g.upper.length > g.size || g.lower.length > g.size ? " (incluye empates en el corte)" : ""}.`
    : "";
  const body = document.getElementById("mc_items_body");
  body.replaceChildren();
  (res?.items || []).forEach((it, j) => {
    const tr = mcEl("tr"),
      [reading, cls] = mcReading(it);
    tr.append(mcEl("td", "Ítem " + (j + 1), "bold"), mcEl("td", key[j]));
    for (const [v, c] of [
      [it.p, ""],
      [it.pUpper, ""],
      [it.pLower, ""],
      [it.D, "highlight"],
      [it.rbp, ""],
      [it.rRest, it.rRest < 0.3 ? "bad-cell" : "highlight"],
    ])
      tr.append(mcEl("td", ItemMath.format(v, 2), c));
    tr.append(mcEl("td", reading, cls));
    body.append(tr);
  });
  if (!res) {
    const tr = mcEl("tr"),
      td = mcEl("td", "—");
    td.colSpan = 9;
    tr.append(td);
    body.append(tr);
  }
  document.getElementById("mc_alpha").textContent = ItemMath.format(res?.alpha, 3);
  updateMCDistractors(res, key);
}
function updateMCDistractors(res, key) {
  const j = Number(document.getElementById("mc_item").value),
    it = res?.items[j],
    body = document.getElementById("mc_dist_body"),
    comment = document.getElementById("mc_dist_comment");
  body.replaceChildren();
  if (!it) {
    comment.textContent = "Completa los datos con respuestas válidas para analizar los distractores.";
    return;
  }
  for (const row of it.options) {
    const tr = mcEl("tr", undefined, row.isKey ? "mc-key-row" : ""),
      d = ItemMath.optionDiagnosis(row);
    tr.append(
      mcEl("td", row.option === "" ? "Omisión" : row.option + (row.isKey ? " (clave)" : ""), "bold"),
      mcEl("td", ItemMath.format(row.total, 2)),
      mcEl("td", ItemMath.format(row.upper, 2)),
      mcEl("td", ItemMath.format(row.lower, 2)),
      mcEl("td", ItemMath.signed(row.diff, 2)),
      mcEl(
        "td",
        mcDiagnosisText(row),
        d === "upper" || d === "key-review" || d === "never"
          ? "bad-cell"
          : d === "ok" || d === "key-ok"
            ? "good-cell"
            : "",
      ),
    );
    body.append(tr);
  }
  const flagged = it.options.filter((o) => ItemMath.optionDiagnosis(o) === "upper"),
    never = it.options.filter((o) => ItemMath.optionDiagnosis(o) === "never"),
    keyRow = it.options.find((o) => o.isKey),
    pct = (x) => ItemMath.format(100 * x, 0) + " %";
  const parts = [
    `Ítem ${j + 1} (clave ${key[j]}): D = ${ItemMath.format(it.D, 2)}; la clave la elige el ${pct(keyRow.upper)} del grupo superior y el ${pct(keyRow.lower)} del inferior.`,
  ];
  for (const o of flagged)
    parts.push(
      `El distractor ${o.option} atrae al ${pct(o.upper)} del grupo superior frente al ${pct(o.lower)} del inferior: comprueba si también es defendible o si el enunciado es ambiguo.`,
    );
  for (const o of never)
    parts.push(`Nadie elige ${o.option}: sustitúyelo por un error plausible o retíralo (tres opciones pueden bastar).`);
  if (!flagged.length && !never.length && keyRow.diff > 0)
    parts.push("Los distractores atraen más al grupo inferior, como se espera.");
  comment.textContent = parts.join(" ");
}
function revealMC(withGuess) {
  const { responses, key, invalid } = readMC(),
    res = invalid ? null : ItemMath.analyzeMultipleChoice(responses, key, MC_OPTIONS),
    fb = document.getElementById("mc_feedback");
  document.getElementById("mc_results").hidden = false;
  if (!withGuess) {
    fb.hidden = true;
    return;
  }
  fb.hidden = false;
  const valid = (res?.items || []).map((it, j) => ({ j, D: it.D, r: it.rRest })).filter((x) => Number.isFinite(x.D));
  if (!valid.length) {
    fb.className = "info-box warn";
    fb.textContent = "Con estos datos no se pueden calcular los índices. Revisa las respuestas.";
    return;
  }
  const worst = valid.reduce((a, b) => (b.D < a.D || (b.D === a.D && b.r < a.r) ? b : a)),
    guess = Number(document.getElementById("mc_guess").value),
    mine = res.items[guess];
  document.getElementById("mc_item").value = String(worst.j);
  updateMCDistractors(res, key);
  const tie = valid.filter((x) => x.D === worst.D).length > 1;
  if (guess === worst.j || (tie && mine.D === worst.D)) {
    fb.className = "info-box success";
    fb.textContent = `✅ Bien visto: el ítem ${guess + 1} es ${tie ? "uno de los que" : "el que"} peor discrimina (D = ${ItemMath.format(mine.D, 2)}, r ítem-resto = ${ItemMath.format(mine.rRest, 2)}). Ahora explica por qué con el análisis de distractores.`;
  } else {
    fb.className = "info-box warn";
    fb.textContent = `El que peor discrimina es el ítem ${worst.j + 1} (D = ${ItemMath.format(worst.D, 2)}); el ítem ${guess + 1} tiene D = ${ItemMath.format(mine.D, 2)}. Pista: compara, columna a columna, cuántas filas S e I aciertan. Abajo tienes los distractores del ítem ${worst.j + 1}.`;
  }
}
function initMC() {
  buildMC();
  document.getElementById("mc_tbody").addEventListener("input", updateMC);
  document.getElementById("mc_item").addEventListener("change", () => {
    document.getElementById("mc_item").dataset.touched = "1";
    updateMC();
  });
  document.getElementById("mc_check").addEventListener("click", () => revealMC(true));
  document.getElementById("mc_skip").addEventListener("click", () => revealMC(false));
  document.getElementById("mc_reset").addEventListener("click", buildMC);
}

// ============================================================
// INIT — add new inits
// ============================================================
window.addEventListener("DOMContentLoaded", () => {
  calcDificultad();
  initDifTable();
  calcPolitomico();
  calcVarianza();
  initHomConceptoChart();
  initPearsonTable();
  calcHomCorr();
  simCorreccion();
  buildPasoTable();
  calcValidez();
  initValChart();
  calcAzar();
  initPractica();
  // NEW
  updateDiscriminacion();
  calcAlpha();
  calcEliminar();
  initMC();
  initSectionPager();
});

// Paginación entre secciones: avance y retroceso al final de cada una (ritmo controlado por el estudiante).
function initSectionPager() {
  const ids = ["intro", "dificultad", "homogeneidad", "validez", "azar", "practica"],
    names = ["Intro", "Dificultad", "Homogeneidad", "Validez", "Corrección por azar", "Práctica global"];
  ids.forEach((id, i) => {
    const sec = document.getElementById(id);
    if (!sec || sec.querySelector(":scope > .dx-pager")) return;
    const nav = document.createElement("nav");
    nav.className = "dx-pager";
    nav.setAttribute("aria-label", "Avanzar o retroceder");
    const btn = (j, label, ghost) => {
      const b = document.createElement("button");
      b.type = "button";
      if (ghost) b.className = "ghost";
      b.textContent = label;
      b.addEventListener("click", () => showSection(ids[j]));
      return b;
    };
    const pos = document.createElement("span");
    pos.className = "dx-pager-pos";
    pos.textContent = `Sección ${i + 1} de ${ids.length}`;
    nav.append(
      i > 0 ? btn(i - 1, "← " + names[i - 1], true) : document.createElement("span"),
      pos,
      i < ids.length - 1 ? btn(i + 1, names[i + 1] + " →") : document.createElement("span"),
    );
    sec.append(nav);
  });
}
