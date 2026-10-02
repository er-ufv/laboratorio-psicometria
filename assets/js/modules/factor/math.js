(function (root) {
  "use strict";
  const zeros = (r, c) => Array.from({ length: r }, () => Array(c).fill(0)),
    transpose = (A) => A[0].map((_, j) => A.map((row) => row[j]));
  const multiply = (A, B) => A.map((row) => B[0].map((_, j) => row.reduce((s, x, k) => s + x * B[k][j], 0)));
  function inverse(A) {
    const n = A.length,
      X = A.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
    for (let k = 0; k < n; k++) {
      let p = k;
      for (let i = k + 1; i < n; i++) if (Math.abs(X[i][k]) > Math.abs(X[p][k])) p = i;
      if (Math.abs(X[p][k]) < 1e-12) return null;
      [X[k], X[p]] = [X[p], X[k]];
      const t = X[k][k];
      X[k] = X[k].map((x) => x / t);
      for (let i = 0; i < n; i++)
        if (i !== k) {
          const u = X[i][k];
          X[i] = X[i].map((x, j) => x - u * X[k][j]);
        }
    }
    return X.map((row) => row.slice(n));
  }
  function cholesky(A) {
    const n = A.length,
      L = zeros(n, n);
    for (let i = 0; i < n; i++)
      for (let j = 0; j <= i; j++) {
        let s = A[i][j];
        for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
        if (i === j) {
          if (s <= 1e-10) return null;
          L[i][j] = Math.sqrt(s);
        } else L[i][j] = s / L[j][j];
      }
    return L;
  }
  function eigenvalues(A) {
    const n = A.length,
      X = A.map((row) => [...row]);
    for (let it = 0; it < 200 * n * n; it++) {
      let p = 0,
        q = 1,
        m = 0;
      for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++)
          if (Math.abs(X[i][j]) > m) {
            m = Math.abs(X[i][j]);
            p = i;
            q = j;
          }
      if (m < 1e-13) break;
      const angle = 0.5 * Math.atan2(2 * X[p][q], X[q][q] - X[p][p]),
        c = Math.cos(angle),
        s = Math.sin(angle),
        a = X[p][p],
        b = X[q][q],
        u = X[p][q];
      for (let k = 0; k < n; k++)
        if (k !== p && k !== q) {
          const xp = X[k][p],
            xq = X[k][q];
          X[k][p] = X[p][k] = c * xp - s * xq;
          X[k][q] = X[q][k] = s * xp + c * xq;
        }
      X[p][p] = c * c * a - 2 * c * s * u + s * s * b;
      X[q][q] = s * s * a + 2 * c * s * u + c * c * b;
      X[p][q] = X[q][p] = 0;
    }
    return X.map((row, i) => row[i]).sort((a, b) => b - a);
  }
  function logGamma(z) {
    const p = [
      0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
      12.507343278686905, -0.13857109526572012, 9.984369578019572e-6, 1.5056327351493116e-7,
    ];
    if (z < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
    z--;
    let x = p[0];
    for (let i = 1; i < p.length; i++) x += p[i] / (z + i);
    const t = z + 7.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }
  function gammaQ(a, x) {
    if (x === 0) return 1;
    if (a <= 0 || x < 0) return NaN;
    const exponent = a * Math.log(x) - x - logGamma(a);
    if (x < a + 1) {
      let sum = 1 / a,
        delta = sum,
        ap = a;
      for (let i = 1; i < 10000; i++) {
        ap++;
        delta *= x / ap;
        sum += delta;
        if (Math.abs(delta) < Math.abs(sum) * 1e-15) break;
      }
      return Math.max(0, 1 - sum * Math.exp(exponent));
    }
    let b = x + 1 - a,
      c = 1e300,
      d = 1 / b,
      h = d;
    for (let i = 1; i < 10000; i++) {
      const an = -i * (i - a);
      b += 2;
      d = an * d + b;
      if (Math.abs(d) < 1e-300) d = 1e-300;
      c = b + an / c;
      if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d;
      const delta = d * c;
      h *= delta;
      if (Math.abs(delta - 1) < 1e-15) break;
    }
    return Math.max(0, Math.min(1, Math.exp(exponent) * h));
  }
  function diagnostics(R, n) {
    const p = R.length;
    if (p < 3 || R.some((row) => row.length !== p) || !Number.isInteger(n) || n <= 1 + (2 * p + 5) / 6)
      return { error: "Indica una matriz cuadrada de al menos tres ítems y un tamaño muestral adecuado." };
    for (let i = 0; i < p; i++)
      for (let j = 0; j < p; j++)
        if (
          !Number.isFinite(R[i][j]) ||
          Math.abs(R[i][j]) > 1 ||
          Math.abs(R[i][j] - R[j][i]) > 1e-10 ||
          (i === j && Math.abs(R[i][j] - 1) > 1e-10)
        )
          return { error: "Revisa valores finitos, simetría y diagonal igual a 1." };
    const L = cholesky(R);
    if (!L)
      return {
        error:
          "La matriz no es definida positiva o es casi singular. Revisa correlaciones y duplicaciones; no se modifica automáticamente.",
      };
    const Q = inverse(R),
      msa = [],
      sums = [0, 0];
    for (let i = 0; i < p; i++) {
      let r = 0,
        q = 0;
      for (let j = 0; j < p; j++)
        if (i !== j) {
          r += R[i][j] ** 2;
          q += Q[i][j] ** 2 / (Q[i][i] * Q[j][j]);
        }
      msa.push(r + q > 0 ? r / (r + q) : NaN);
      sums[0] += r;
      sums[1] += q;
    }
    const logdet = 2 * L.reduce((s, row, i) => s + Math.log(row[i]), 0),
      chisq = -(n - 1 - (2 * p + 5) / 6) * logdet,
      df = (p * (p - 1)) / 2;
    return {
      kmo: sums[0] + sums[1] > 0 ? sums[0] / (sums[0] + sums[1]) : NaN,
      msa,
      chisq,
      df,
      pvalue: gammaQ(df / 2, Math.max(0, chisq) / 2),
      eigen: eigenvalues(R),
    };
  }
  function common(pattern, phi) {
    return multiply(multiply(pattern, phi), transpose(pattern));
  }
  function geometry(loadings, angle, separation = 90) {
    if (!Number.isFinite(angle) || !Number.isFinite(separation) || separation <= 5 || separation >= 175) return null;
    const t = (angle * Math.PI) / 180,
      u = ((angle + separation) * Math.PI) / 180,
      B = [
        [Math.cos(t), Math.cos(u), 0],
        [Math.sin(t), Math.sin(u), 0],
        [0, 0, 1],
      ],
      inv = inverse(B),
      pattern = multiply(loadings, transpose(inv)),
      phi = multiply(transpose(B), B);
    return { basis: B, pattern, phi, structure: multiply(pattern, phi), common: common(pattern, phi) };
  }
  function rmsea(chisq, df, n) {
    return [chisq, df, n].every(Number.isFinite) && chisq >= 0 && df > 0 && n > 1
      ? Math.sqrt(Math.max(0, (chisq - df) / (df * n)))
      : NaN;
  }
  root.FactorMath = {
    transpose,
    multiply,
    inverse,
    cholesky,
    eigenvalues,
    logGamma,
    gammaQ,
    diagnostics,
    common,
    geometry,
    rmsea,
  };
  if (typeof module !== "undefined") module.exports = root.FactorMath;
})(globalThis);
