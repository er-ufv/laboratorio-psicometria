/* Integración visual, accesibilidad y validación de las herramientas originales. */
Chart.defaults.font.family = "'Neue Haas Grotesk Text Pro','Helvetica Neue',Arial,sans-serif";
Chart.defaults.color = "#4d4d4d";
Chart.defaults.animation = false;
const validationMessages = new Map();
function validInputs(ids, predicate = Number.isFinite) {
  return ids.every((id) => {
    const input = document.getElementById(id);
    const ok = predicate(readItem(id));
    input?.setAttribute("aria-invalid", String(!ok));
    return ok;
  });
}
function invalidateOutputs(ids, charts = []) {
  for (const id of ids) {
    const node = document.getElementById(id);
    if (node) node.textContent = "—";
  }
  for (const id of charts) {
    const chart = Chart.getChart(id);
    if (chart) {
      for (const ds of chart.data.datasets) ds.data = [];
      chart.update();
    }
  }
}
function guarded(name, validate, message, outputs = [], charts = []) {
  const original = window[name];
  window[name] = function (...args) {
    const ok = validate();
    if (!ok) {
      validationMessages.set(name, message);
      invalidateOutputs(outputs, charts);
    } else {
      validationMessages.delete(name);
      original.apply(this, args);
    }
    const notice = document.getElementById("calculation-notice");
    notice.hidden = validationMessages.size === 0;
    notice.textContent = [...validationMessages.values()].join(" ");
  };
}
guarded(
  "calcPolitomico",
  () =>
    validInputs(["pol_N"], (x) => Number.isInteger(x) && x >= 2 && x <= 200) &&
    validInputs(["pol_A"], (x) => Number.isInteger(x) && x >= 0 && x <= readItem("pol_N")),
  "Elección múltiple: introduce N entre 2 y 200 y un número entero de aciertos entre 0 y N.",
  ["pol_Dj", "pol_Dc", "pol_diff", "pol_interp"],
  ["pol_chart"],
);
guarded(
  "calcAzar",
  () => validInputs(["az_total"], (x) => Number.isInteger(x) && x >= 10 && x <= 200),
  "Corrección por azar: introduce un número entero de ítems entre 10 y 200.",
  ["az_Xsin", "az_Xc", "az_interp"],
  ["az_chart"],
);
const cvIds = Array.from({ length: 4 }, (_, s) =>
  Array.from({ length: 3 }, (_, j) => "cv_" + (s + 1) + (j + 1)),
).flat();
const cvOutputs = Array.from({ length: 3 }, (_, j) => [
  "hc_r" + (j + 1) + "_bot",
  "hc_rc" + (j + 1) + "_bot",
  "hc_diff" + (j + 1),
]).flat();
guarded(
  "calcHomCorr",
  () => validInputs(cvIds),
  "Tabla comparativa: completa cada celda con un número. Una casilla vacía no equivale a cero.",
  cvOutputs,
  ["hom_corr_chart"],
);
const refreshHomCorr = window.calcHomCorr;
window.calcHomCorr = function () {
  refreshHomCorr();
  calcEliminar();
};
guarded(
  "calcEliminar",
  () => validInputs(cvIds),
  "Alfa al eliminar: se necesitan todos los datos de la tabla comparativa.",
  ["elim_before", "elim_after", "elim_change", "elim_new_alpha"],
);
function pasoIds() {
  return Array.from({ length: readItem("paso_nsuj") }, (_, s) =>
    Array.from({ length: readItem("paso_nitems") }, (_, j) => "paso_" + s + "_" + j),
  ).flat();
}
guarded(
  "calcPaso",
  () => validInputs(pasoIds()),
  "Paso a paso: completa todos los valores de la matriz.",
  ["paso_summary_body", "paso_detail"],
  ["paso_chart"],
);
const prIds = Array.from({ length: 8 }, (_, s) => [
  ...Array.from({ length: 4 }, (_, j) => "pr_" + s + "_" + j),
  "pr_crit_" + s,
]).flat();
guarded(
  "updatePractica",
  () => validInputs(prIds),
  "Práctica global: completa los ítems y el criterio externo con números finitos.",
  ["pr_m1", "pr_m2", "pr_m3", "pr_m4", "pr_mt", "pr_analysis", "pr_alpha", "pr_min_rest", "pr_comment"],
  ["practica_chart"],
);
const difIds = Array.from({ length: 5 }, (_, s) =>
  Array.from({ length: 3 }, (_, j) => "dt_" + (s + 1) + "_" + (j + 1)),
).flat();
guarded(
  "updateDifTable",
  () =>
    difIds.every((id) => {
      const input = document.getElementById(id),
        v = input?.value.trim();
      const ok = v === "" || v === "0" || v === "1";
      input?.setAttribute("aria-invalid", String(!ok));
      return ok;
    }),
  "Matriz dicotómica: usa 0, 1 o deja la celda vacía para excluir esa respuesta del denominador del ítem.",
  ["dif_d1", "dif_d2", "dif_d3", "dif_i1", "dif_i2", "dif_i3"],
  ["dif_chart"],
);
const oldPearson = calcPearson;
window.calcPearson = function () {
  for (const id of ["p_sumX", "p_sumY", "p_sumX2", "p_sumY2", "p_sumXY", "pearson_r"])
    document.getElementById(id).textContent = "—";
  document.getElementById("pearson_result").className = "result-box";
  document.getElementById("pearson_interp").textContent =
    "Introduce al menos dos pares completos y variables con variación.";
  document.getElementById("pearson_marker").style.left = "50%";
  oldPearson();
};
const oldSection = showSection;
window.showSection = function (id) {
  oldSection(id);
  document
    .querySelectorAll(".nav-btn")
    .forEach((b) => b.setAttribute("aria-pressed", String(b.classList.contains("active"))));
  requestAnimationFrame(() => Object.values(Chart.instances).forEach((c) => c.resize()));
};
window.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".overview-card").forEach((card) => {
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        card.click();
      }
    });
  });
  document.querySelectorAll("input,select").forEach((input) => {
    const parent = input.closest("div"),
      label = parent?.querySelector("label");
    if (label && !label.htmlFor && !label.contains(input)) label.htmlFor = input.id;
    if (!input.labels?.length) {
      const cell = input.closest("td"),
        table = input.closest("table");
      const head = cell && table?.querySelector("thead tr")?.children[cell.cellIndex];
      input.setAttribute(
        "aria-label",
        (head?.textContent.trim() || "Valor") +
          " · " +
          (cell?.parentElement?.firstElementChild?.textContent.trim() || input.id),
      );
    }
  });
  document
    .querySelectorAll(".nav-btn,.tab-btn")
    .forEach((b) => b.setAttribute("aria-pressed", String(b.classList.contains("active"))));
  document
    .getElementById("disc_r_val")
    .insertAdjacentHTML(
      "afterend",
      '<span class="small"> · parámetro latente; el resultado muestra r de la nube redondeada</span>',
    );
  document
    .getElementById("hom_hom_alpha")
    .insertAdjacentHTML(
      "afterbegin",
      '<div class="module-note">La fórmula basada en la correlación media corresponde al alfa estandarizado. El alfa al eliminar se calcula con las varianzas de la tabla comparativa. Un alfa alto no demuestra unidimensionalidad.</div>',
    );
});
