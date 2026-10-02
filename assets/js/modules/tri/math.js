(function (root) {
  "use strict";
  const finite = Number.isFinite;
  function logistic(x) {
    if (x >= 0) return 1 / (1 + Math.exp(-x));
    const e = Math.exp(x);
    return e / (1 + e);
  }
  function effective(model, p) {
    if (!["1PL", "2PL", "3PL", "4PL"].includes(model)) return null;
    return {
      a: model === "1PL" ? 1 : p.a,
      b: p.b,
      c: ["3PL", "4PL"].includes(model) ? p.c : 0,
      d: model === "4PL" ? p.d : 1,
    };
  }
  function valid(p) {
    return p && [p.a, p.b, p.c, p.d].every(finite) && p.a > 0 && p.c >= 0 && p.c < p.d && p.d <= 1;
  }
  function dichotomous(theta, p, D = 1) {
    if (!finite(theta) || !valid(p) || !finite(D) || D <= 0) return null;
    const A = D * p.a,
      x = A * (theta - p.b),
      s = logistic(x),
      q = logistic(-x),
      derivative = (p.d - p.c) * A * s * q;
    const probability = p.c + (p.d - p.c) * s,
      complement = 1 - p.d + (p.d - p.c) * q;
    // Complement is computed independently to retain precision in the upper tail.
    const information = probability > 0 && complement > 0 ? derivative ** 2 / (probability * complement) : 0;
    return { probability, derivative, information };
  }
  function validGraded(p) {
    return (
      p &&
      finite(p.a) &&
      p.a > 0 &&
      Array.isArray(p.b) &&
      p.b.length >= 1 &&
      p.b.every((x, i) => finite(x) && (i === 0 || x > p.b[i - 1]))
    );
  }
  function graded(theta, p, D = 1) {
    if (!finite(theta) || !validGraded(p) || !finite(D) || D <= 0) return null;
    const A = D * p.a,
      x = p.b.map((b) => A * (theta - b)),
      s = x.map(logistic),
      q = x.map((v) => logistic(-v)),
      ds = s.map((v, i) => A * v * q[i]);
    const probabilities = [q[0]],
      derivatives = [-ds[0]];
    for (let i = 1; i < x.length; i++) {
      probabilities.push(x[i] >= 0 ? q[i] - q[i - 1] : s[i - 1] - s[i]);
      derivatives.push(ds[i - 1] - ds[i]);
    }
    probabilities.push(s.at(-1));
    derivatives.push(ds.at(-1));
    const information = probabilities.reduce((sum, v, i) => sum + (v > 0 ? derivatives[i] ** 2 / v : 0), 0);
    return {
      probabilities,
      cumulative: [1, ...s, 0],
      derivatives,
      information,
      expected: probabilities.reduce((sum, v, k) => sum + k * v, 0),
    };
  }
  function test(theta, items, kind = "dichotomous", D = 1) {
    if (!Array.isArray(items) || !items.length) return null;
    const r = items.map((p) => (kind === "graded" ? graded(theta, p, D) : dichotomous(theta, p, D)));
    if (r.some((v) => !v)) return null;
    const information = r.reduce((s, v) => s + v.information, 0),
      expected = r.reduce((s, v) => s + (kind === "graded" ? v.expected : v.probability), 0);
    return { items: r, information, expected, sem: information > 0 ? 1 / Math.sqrt(information) : Infinity };
  }
  // Fiabilidad condicional a partir de I(θ), con EE²(θ) = 1/I(θ).
  // "latent" (por defecto): σ²·I/(σ²·I + 1) = σ²/(σ² + EE²), σ² = varianza latente. Acotada en [0, 1).
  // "raju": 1 − EE²/Var(θ̂) (Raju et al., 2007), Var(θ̂) = varianza observada de las estimaciones.
  function conditionalReliability(information, variance = 1, method = "latent") {
    if (Number.isNaN(information) || information < 0 || !finite(variance) || variance <= 0) return NaN;
    if (method === "latent")
      return information === Infinity ? 1 : (variance * information) / (variance * information + 1);
    if (method !== "raju") return NaN;
    return information === 0 ? -Infinity : 1 - 1 / (information * variance);
  }
  // Máximo de la información de un ítem dicotómico. Con d = 1 (1PL–3PL) hay forma cerrada:
  // θmax = b + ln[(1 + √(1 + 8c))/2]/(D·a); Imax = D²a²[1 − 20c − 8c² + (1 + 8c)^1,5]/[8(1 − c)²].
  // Con c = 0: θmax = b e Imax = D²a²/4. Con d < 1 (4PL) se busca numéricamente.
  function maxInformation(p, D = 1) {
    if (!valid(p) || !finite(D) || D <= 0) return null;
    if (p.d === 1) {
      const c = p.c,
        A = D * p.a;
      return {
        theta: p.b + Math.log((1 + Math.sqrt(1 + 8 * c)) / 2) / A,
        information: (A * A * (1 - 20 * c - 8 * c * c + (1 + 8 * c) ** 1.5)) / (8 * (1 - c) ** 2),
        method: "closed",
      };
    }
    const width = 20 / (D * p.a),
      info = (t) => dichotomous(t, p, D).information,
      n = 4000,
      step = (2 * width) / n;
    let best = p.b - width;
    for (let i = 1; i <= n; i++) {
      const t = p.b - width + i * step;
      if (info(t) > info(best)) best = t;
    }
    let lo = best - step,
      hi = best + step;
    const g = (Math.sqrt(5) - 1) / 2;
    for (let i = 0; i < 100; i++) {
      const x1 = hi - g * (hi - lo),
        x2 = lo + g * (hi - lo);
      if (info(x1) >= info(x2)) hi = x2;
      else lo = x1;
    }
    const theta = (lo + hi) / 2;
    return { theta, information: info(theta), method: "numeric" };
  }
  // Var(θ̂) aproximada para estimaciones ML: σ² + E[EE²(θ)], con θ ~ N(0, σ²) truncada a la rejilla.
  // Orientativa: ignora sesgo y estimaciones infinitas (patrones todo acierto o todo fallo).
  function approximateEstimateVariance(grid, informations, variance = 1) {
    if (!Array.isArray(grid) || grid.length !== informations.length || !finite(variance) || variance <= 0) return NaN;
    let w = 0,
      e = 0;
    grid.forEach((t, i) => {
      const weight = Math.exp((-t * t) / (2 * variance));
      w += weight;
      e += weight * (informations[i] > 0 ? 1 / informations[i] : Infinity);
    });
    return variance + e / w;
  }
  function bank(n = 10, seed = 0, kind = "dichotomous", K = 5) {
    if (
      !Number.isInteger(n) ||
      n < 10 ||
      n > 30 ||
      !["dichotomous", "graded"].includes(kind) ||
      !Number.isInteger(K) ||
      K < 3 ||
      K > 5
    )
      return null;
    let s = seed >>> 0;
    const rng = () => {
        s = (1664525 * s + 1013904223) >>> 0;
        return s / 4294967296;
      },
      round = (x) => Math.round(x * 100) / 100;
    return Array.from({ length: n }, (_, i) => {
      const a = round(0.6 + 1.6 * rng()),
        b = round(-2.5 + (5 * i) / (n - 1) + (rng() - 0.5) * 0.35);
      return kind === "graded"
        ? { a, b: Array.from({ length: K - 1 }, (_, k) => round((k - (K - 2) / 2) * 0.9 + b * 0.55)) }
        : { a, b, c: round(0.1 + 0.2 * rng()), d: round(0.87 + 0.13 * rng()) };
    });
  }
  root.TRIMath = {
    logistic,
    effective,
    valid,
    validGraded,
    dichotomous,
    graded,
    test,
    conditionalReliability,
    maxInformation,
    approximateEstimateVariance,
    bank,
  };
  if (typeof module !== "undefined") module.exports = root.TRIMath;
})(globalThis);
