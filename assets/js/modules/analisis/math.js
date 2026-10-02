/* Cálculos auditables utilizados por las calculadoras recuperadas del HTML. */
(function (root) {
  "use strict";
  const finite = (a) => Array.isArray(a) && a.every(Number.isFinite);
  function pearson(a, b) {
    if (!finite(a) || !finite(b) || a.length !== b.length || a.length < 2) return NaN;
    const n = a.length,
      ma = a.reduce((s, x) => s + x, 0) / n,
      mb = b.reduce((s, x) => s + x, 0) / n;
    let aa = 0,
      bb = 0,
      ab = 0;
    for (let i = 0; i < n; i++) {
      const x = a[i] - ma,
        y = b[i] - mb;
      aa += x * x;
      bb += y * y;
      ab += x * y;
    }
    return aa > 0 && bb > 0 ? Math.max(-1, Math.min(1, ab / Math.sqrt(aa * bb))) : NaN;
  }
  function variance(a) {
    if (!finite(a) || a.length < 2) return NaN;
    const m = a.reduce((s, x) => s + x, 0) / a.length;
    return a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1);
  }
  function alpha(matrix) {
    if (!Array.isArray(matrix) || matrix.length < 2) return NaN;
    const k = matrix[0]?.length;
    if (k < 2 || matrix.some((r) => !finite(r) || r.length !== k)) return NaN;
    const totals = matrix.map((r) => r.reduce((s, x) => s + x, 0)),
      vt = variance(totals);
    if (!(vt > 0)) return NaN;
    const sum = Array.from({ length: k }, (_, j) => variance(matrix.map((r) => r[j]))).reduce((s, v) => s + v, 0);
    return (k / (k - 1)) * (1 - sum / vt);
  }
  function corrected(r, q) {
    const v = 1 - 2 * r * q + q * q;
    return Number.isFinite(r) && Math.abs(r) <= 1 && q > 0 && v > 0 ? (r - q) / Math.sqrt(v) : NaN;
  }
  function standardizedAlpha(k, r) {
    return Number.isInteger(k) && k >= 2 && Number.isFinite(r) && r > -1 / (k - 1) && r <= 1
      ? (k * r) / (1 + (k - 1) * r)
      : NaN;
  }
  function difficulty(n, a, k = 2) {
    return Number.isInteger(n) && n > 0 && Number.isInteger(a) && a >= 0 && a <= n && Number.isInteger(k) && k >= 2
      ? { p: a / n, corrected: (a - (n - a) / (k - 1)) / n }
      : null;
  }
  /* Formato con punto decimal (convención de este módulo). Evita «-0.000». */
  function format(x, n = 3) {
    if (!Number.isFinite(x)) return "—";
    const s = x.toFixed(n);
    return /^-0\.?0*$/.test(s) ? s.slice(1) : s;
  }
  /* Igual que format, con signo explícito para diferencias: +0.094, -0.020, 0.000. */
  function signed(x, n = 3) {
    const s = format(x, n);
    return s === "—" || s.startsWith("-") || Number(s) === 0 ? s : "+" + s;
  }

  // ---------- Elección múltiple: puntuación, grupos extremos, discriminación y distractores ----------
  const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  /* Respuestas (letras; "" = omisión) → matriz 0/1. Una omisión puntúa 0. */
  function scoreKey(responses, key) {
    return responses.map((row) => row.map((answer, j) => (answer === key[j] ? 1 : 0)));
  }
  /* Grupos extremos: el 27 % superior e inferior según la puntuación total (Kelley, 1939).
     Con empates en el punto de corte se incluyen todas las personas empatadas, de modo que el
     resultado no depende del orden de las filas; por eso un grupo puede superar el 27 %. */
  function extremeGroups(totals, fraction = 0.27) {
    if (!finite(totals) || totals.length < 4 || !(fraction > 0 && fraction <= 0.5)) return null;
    const n = totals.length,
      size = Math.max(1, Math.round(fraction * n)),
      sorted = [...totals].sort((a, b) => b - a),
      upperCut = sorted[size - 1],
      lowerCut = sorted[n - size];
    if (!(upperCut > lowerCut)) return null;
    const pick = (test) => totals.reduce((a, t, i) => (test(t) ? [...a, i] : a), []);
    return { size, upperCut, lowerCut, upper: pick((t) => t >= upperCut), lower: pick((t) => t <= lowerCut) };
  }
  /* D = p del grupo superior − p del grupo inferior. */
  function discriminationIndex(item, groups) {
    if (!groups || !finite(item)) return NaN;
    const p = (idx) => mean(idx.map((i) => item[i]));
    return p(groups.upper) - p(groups.lower);
  }
  /* Correlación biserial-puntual: r_bp = (M_p − M_q) / S_X · √(p·q), con S_X de denominador N.
     Es algebraicamente igual a la correlación de Pearson entre el ítem 0/1 y el total. */
  function pointBiserial(item, total) {
    if (!finite(item) || !finite(total) || item.length !== total.length || item.length < 2) return NaN;
    if (item.some((x) => x !== 0 && x !== 1)) return NaN;
    const n = item.length,
      p = mean(item),
      q = 1 - p,
      m = mean(total),
      sx = Math.sqrt(total.reduce((s, x) => s + (x - m) ** 2, 0) / n);
    if (p === 0 || p === 1 || !(sx > 0)) return NaN;
    const mp = mean(total.filter((_, i) => item[i] === 1)),
      mq = mean(total.filter((_, i) => item[i] === 0));
    return ((mp - mq) / sx) * Math.sqrt(p * q);
  }
  function itemRest(item, total) {
    return pearson(
      item,
      total.map((t, i) => t - item[i]),
    );
  }
  /* Proporción de cada opción en la muestra y en los grupos extremos; marca la clave. */
  function distractorTable(column, keyAnswer, options, groups) {
    const prop = (idx, o) => (idx.length ? idx.filter((i) => column[i] === o).length / idx.length : NaN);
    const all = column.map((_, i) => i),
      list = column.some((x) => x === "") ? [...options, ""] : options;
    return list.map((option) => {
      const upper = groups ? prop(groups.upper, option) : NaN,
        lower = groups ? prop(groups.lower, option) : NaN;
      return {
        option,
        isKey: option === keyAnswer,
        count: column.filter((x) => x === option).length,
        total: prop(all, option),
        upper,
        lower,
        diff: upper - lower,
      };
    });
  }
  /* Diagnóstico orientativo de cada opción (no sustituye la revisión del contenido). */
  function optionDiagnosis(row) {
    if (row.option === "") return "omission";
    if (row.isKey) return !Number.isFinite(row.diff) ? "undefined" : row.diff > 0 ? "key-ok" : "key-review";
    if (row.count === 0) return "never";
    if (!Number.isFinite(row.diff)) return "undefined";
    return row.diff > 0 ? "upper" : row.diff === 0 ? "flat" : "ok";
  }
  function analyzeMultipleChoice(responses, key, options = ["A", "B", "C", "D"], fraction = 0.27) {
    const k = key.length;
    if (
      !Array.isArray(responses) ||
      responses.length < 4 ||
      responses.some((r) => !Array.isArray(r) || r.length !== k || r.some((x) => x !== "" && !options.includes(x))) ||
      key.some((x) => !options.includes(x))
    )
      return null;
    const scored = scoreKey(responses, key),
      totals = scored.map((r) => r.reduce((s, x) => s + x, 0)),
      groups = extremeGroups(totals, fraction);
    const items = key.map((answer, j) => {
      const item = scored.map((r) => r[j]);
      return {
        p: mean(item),
        D: discriminationIndex(item, groups),
        pUpper: groups ? mean(groups.upper.map((i) => item[i])) : NaN,
        pLower: groups ? mean(groups.lower.map((i) => item[i])) : NaN,
        rbp: pointBiserial(item, totals),
        rRest: itemRest(item, totals),
        options: distractorTable(
          responses.map((r) => r[j]),
          answer,
          options,
          groups,
        ),
      };
    });
    return { scored, totals, groups, items, alpha: alpha(scored) };
  }
  /* Ejemplo didáctico simulado (24 personas × 8 ítems, opciones A–D). Lo reproduce
     tests/analisis-discriminacion-reference.R. No procede de un test real. */
  const MC_EXAMPLE = Object.freeze({
    key: Object.freeze(["B", "D", "A", "C", "D", "B", "A", "C"]),
    responses: Object.freeze(
      [
        "BDCCDBAC",
        "BDAAAACC",
        "BDACBCAC",
        "CCAADDBC",
        "ADABDACC",
        "BDACDBAC",
        "BDCCDBAC",
        "BDCCDBAC",
        "DDABDABC",
        "ADDBDACD",
        "BDCCDBAA",
        "DDBBCABD",
        "BDCCDBAC",
        "BABCDAAB",
        "BDACACBB",
        "ADACBCCC",
        "CDACBDAD",
        "BCBADABB",
        "BDABDBAC",
        "ADDCBDDA",
        "ADACDAAC",
        "DBAADABD",
        "BDACBBBC",
        "BDBBCBAB",
      ].map((row) => Object.freeze(row.split(""))),
    ),
  });
  root.ItemMath = {
    MC_EXAMPLE,
    pearson,
    variance,
    alpha,
    corrected,
    standardizedAlpha,
    difficulty,
    format,
    signed,
    scoreKey,
    extremeGroups,
    discriminationIndex,
    pointBiserial,
    itemRest,
    distractorTable,
    optionDiagnosis,
    analyzeMultipleChoice,
  };
  if (typeof module !== "undefined") module.exports = root.ItemMath;
})(globalThis);
