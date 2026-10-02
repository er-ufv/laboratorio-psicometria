(function (root) {
  "use strict";
  const probability = (r) => Number.isFinite(r) && r >= 0 && r <= 1;
  const Z = { 90: 1.6448536269514722, 95: 1.959963984540054, 99: 2.5758293035489004 };
  function decomposition(sdT, sdE) {
    if (!Number.isFinite(sdT) || !Number.isFinite(sdE) || sdT < 0 || sdE < 0) return null;
    const vt = sdT ** 2,
      ve = sdE ** 2,
      vx = vt + ve;
    return { vt, ve, vx, sdX: Math.sqrt(vx), reliability: vx > 0 ? vt / vx : NaN };
  }
  function sem(sd, r) {
    return Number.isFinite(sd) && sd > 0 && probability(r) ? sd * Math.sqrt(1 - r) : NaN;
  }
  function interval(x, sd, r, level) {
    const error = sem(sd, r),
      z = Z[level];
    return Number.isFinite(x) && Number.isFinite(error) && z
      ? { sem: error, z, lower: x - z * error, upper: x + z * error }
      : null;
  }
  function spearmanBrown(r, k) {
    return probability(r) && Number.isFinite(k) && k > 0 ? (k * r) / (1 + (k - 1) * r) : NaN;
  }
  function requiredLength(r, target, n) {
    if (!probability(r) || !probability(target) || !Number.isInteger(n) || n < 2) return null;
    if (target <= r) return { ratio: 1, n, already: true };
    if (r === 0 || target === 1) return { ratio: Infinity, n: Infinity, already: false };
    const ratio = (target * (1 - r)) / (r * (1 - target));
    let length = Math.ceil(n * ratio - 1e-12);
    if (spearmanBrown(r, length / n) < target - 1e-12) length++;
    return { ratio, n: length, already: false };
  }
  function random(seed) {
    let s = seed >>> 0;
    return () => {
      s = (1664525 * s + 1013904223) >>> 0;
      return (s + 0.5) / 4294967296;
    };
  }
  function normalSeries(n, seed) {
    const rng = random(seed),
      a = [];
    while (a.length < n) {
      const radius = Math.sqrt(-2 * Math.log(rng())),
        angle = 2 * Math.PI * rng();
      a.push(radius * Math.cos(angle));
      if (a.length < n) a.push(radius * Math.sin(angle));
    }
    return a;
  }
  /* La muestra 0 conserva la realización documentada (semillas 123, 456, 789). Las siguientes
     mezclan el número de muestra para que semillas consecutivas no den series casi iguales. */
  function sampleSeed(base, sample) {
    if (!sample) return base;
    let h = (base ^ Math.imul(sample, 0x9e3779b1)) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
    return (h ^ (h >>> 16)) >>> 0;
  }
  function simulate(sdT, sdE, n = 120, sample = 0) {
    if (!decomposition(sdT, sdE) || !Number.isInteger(n) || n < 2 || n > 10000) return null;
    if (!Number.isInteger(sample) || sample < 0) return null;
    const t = normalSeries(n, sampleSeed(123, sample)),
      e = normalSeries(n, sampleSeed(456, sample)),
      f = normalSeries(n, sampleSeed(789, sample));
    return {
      t: t.map((x) => 50 + sdT * x),
      x: t.map((x, i) => 50 + sdT * x + sdE * e[i]),
      parallel: t.map((x, i) => 50 + sdT * x + sdE * f[i]),
    };
  }
  // ---------- Dos mitades, Kuder–Richardson y estimación de la puntuación verdadera ----------
  const finiteMatrix = (m) =>
    Array.isArray(m) &&
    m.length >= 2 &&
    Array.isArray(m[0]) &&
    m[0].length >= 2 &&
    m.every((row) => Array.isArray(row) && row.length === m[0].length && row.every(Number.isFinite));
  const sum = (a) => a.reduce((s, x) => s + x, 0);
  /* Varianza con denominador N, como en las fórmulas de Kuder–Richardson (Σpq usa N). */
  const popVariance = (a) => {
    const m = sum(a) / a.length;
    return sum(a.map((x) => (x - m) ** 2)) / a.length;
  };
  function correlation(a, b) {
    const ma = sum(a) / a.length,
      mb = sum(b) / b.length;
    let aa = 0,
      bb = 0,
      ab = 0;
    for (let i = 0; i < a.length; i++) {
      aa += (a[i] - ma) ** 2;
      bb += (b[i] - mb) ** 2;
      ab += (a[i] - ma) * (b[i] - mb);
    }
    return aa > 0 && bb > 0 ? Math.max(-1, Math.min(1, ab / Math.sqrt(aa * bb))) : NaN;
  }
  /* Mitades: «impares-pares» (ítems 1, 3, 5… frente a 2, 4, 6…) o «primera-segunda» mitad. */
  function halves(k, split) {
    const all = Array.from({ length: k }, (_, j) => j);
    return split === "first-second"
      ? [all.slice(0, Math.ceil(k / 2)), all.slice(Math.ceil(k / 2))]
      : [all.filter((j) => j % 2 === 0), all.filter((j) => j % 2 === 1)];
  }
  function splitHalf(matrix, split = "odd-even") {
    if (!finiteMatrix(matrix) || !["odd-even", "first-second"].includes(split)) return null;
    const [A, B] = halves(matrix[0].length, split),
      a = matrix.map((row) => sum(A.map((j) => row[j]))),
      b = matrix.map((row) => sum(B.map((j) => row[j]))),
      x = a.map((v, i) => v + b[i]),
      r = correlation(a, b),
      vx = popVariance(x);
    return {
      itemsA: A.length,
      itemsB: B.length,
      r,
      // Spearman–Brown para longitud doble: supone mitades paralelas.
      spearmanBrown: Number.isFinite(r) && r > -1 ? (2 * r) / (1 + r) : NaN,
      // Guttman–Flanagan (λ4 para esta división): no exige varianzas iguales en las mitades.
      guttman: vx > 0 ? 2 * (1 - (popVariance(a) + popVariance(b)) / vx) : NaN,
    };
  }
  /* Todas las divisiones en dos mitades de igual tamaño (k par, k ≤ 14): mínimo, máximo y media del
     coeficiente de Guttman–Flanagan. La media coincide con alfa (Cronbach, 1951). */
  function splitHalfRange(matrix) {
    if (!finiteMatrix(matrix)) return null;
    const k = matrix[0].length;
    if (k % 2 || k > 14) return null;
    const vx = popVariance(matrix.map(sum));
    if (!(vx > 0)) return null;
    const values = [];
    const visit = (start, chosen) => {
      if (chosen.length === k / 2) {
        if (!chosen.includes(0)) return; // cada división se cuenta una vez (el ítem 1 siempre en A)
        const a = matrix.map((row) => sum(chosen.map((j) => row[j]))),
          b = matrix.map((row, i) => sum(row) - a[i]);
        values.push(2 * (1 - (popVariance(a) + popVariance(b)) / vx));
        return;
      }
      for (let j = start; j < k; j++) visit(j + 1, [...chosen, j]);
    };
    visit(0, []);
    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      mean: sum(values) / values.length,
    };
  }
  const dichotomous = (m) => finiteMatrix(m) && m.every((row) => row.every((v) => v === 0 || v === 1));
  function kr20(matrix) {
    if (!dichotomous(matrix)) return NaN;
    const n = matrix.length,
      k = matrix[0].length,
      vx = popVariance(matrix.map(sum));
    if (!(vx > 0)) return NaN;
    const pq = sum(
      Array.from({ length: k }, (_, j) => {
        const p = sum(matrix.map((row) => row[j])) / n;
        return p * (1 - p);
      }),
    );
    return (k / (k - 1)) * (1 - pq / vx);
  }
  /* KR-21 sustituye Σpq por el valor que tendría si todos los ítems tuvieran la misma dificultad. */
  function kr21(matrix) {
    if (!dichotomous(matrix)) return NaN;
    const k = matrix[0].length,
      totals = matrix.map(sum),
      m = sum(totals) / totals.length,
      vx = popVariance(totals);
    return vx > 0 ? (k / (k - 1)) * (1 - (m * (k - m)) / (k * vx)) : NaN;
  }
  /* Índice de fiabilidad: correlación entre puntuaciones observadas y verdaderas, ρXT = √ρXX′. */
  const reliabilityIndex = (r) => (probability(r) ? Math.sqrt(r) : NaN);
  /* Estimación de Kelley (regresión de T sobre X): T′ = r·X + (1 − r)·media. */
  function kelley(x, mean, r) {
    return Number.isFinite(x) && Number.isFinite(mean) && probability(r) ? r * x + (1 - r) * mean : NaN;
  }
  /* Error típico de estimación de T a partir de X: S_X·√(r(1 − r)). */
  function estimationSE(sd, r) {
    return Number.isFinite(sd) && sd > 0 && probability(r) ? sd * Math.sqrt(r * (1 - r)) : NaN;
  }
  /* Error típico de la diferencia entre dos puntuaciones con errores independientes:
     √(EEM₁² + EEM₂²); con la misma S_X, S_X·√(2 − r₁ − r₂). */
  function differenceSE(sd1, r1, sd2 = sd1, r2 = r1) {
    const a = sem(sd1, r1),
      b = sem(sd2, r2);
    return Number.isFinite(a) && Number.isFinite(b) ? Math.sqrt(a * a + b * b) : NaN;
  }
  /* Ejemplo didáctico 0/1 (10 personas × 6 ítems), reproducido en tests/tct-reference.R. */
  const DICHOTOMOUS_EXAMPLE = Object.freeze(
    ["111110", "111111", "100000", "110000", "111110", "111101", "101010", "000000", "101100", "011000"].map((s) =>
      Object.freeze([...s].map(Number)),
    ),
  );
  root.TCTMath = {
    Z,
    decomposition,
    sem,
    interval,
    spearmanBrown,
    requiredLength,
    simulate,
    splitHalf,
    splitHalfRange,
    kr20,
    kr21,
    reliabilityIndex,
    kelley,
    estimationSE,
    differenceSE,
    DICHOTOMOUS_EXAMPLE,
  };
  if (typeof module !== "undefined") module.exports = root.TCTMath;
})(globalThis);
