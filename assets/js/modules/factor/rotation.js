/*
 * Motor de rotación factorial para el navegador.
 *
 * Reproduce los algoritmos que usan R y psych:
 *   - Varimax de stats::varimax (normalización de Kaiser, eps = 1e-5).
 *   - Proyección del gradiente (GPA) de GPArotation (Bernaards y Jennrich, 2005):
 *     GPForth (ortogonal) y GPFoblq (oblicua) con los criterios varimax, quartimax,
 *     oblimin (gamma), quartimin y geomin.
 *   - Promax de psych (kaiser(..., rotate = "Promax"), m = 4).
 *   - Ordenación y reflexión de factores como psych::fa.
 *
 * Convención (la de GPArotation): A son las cargas sin rotar (p × k) y T es una matriz
 * k × k cuyas columnas son los ejes rotados, vectores unitarios expresados en el espacio
 * de los factores sin rotar.
 *   Ortogonal: Λ = A·T, Φ = I.
 *   Oblicua:   patrón P = A·(T′)⁻¹, Φ = T′T, estructura S = P·Φ = A·T.
 * Geometría: el patrón da las coordenadas paralelas a los ejes; la estructura, las
 * proyecciones perpendiculares (correlaciones ítem-factor).
 */
(function (root) {
  "use strict";

  // ---------- Álgebra básica ----------
  const transpose = (A) => A[0].map((_, j) => A.map((row) => row[j]));
  const multiply = (A, B) => A.map((row) => B[0].map((_, j) => row.reduce((s, x, k) => s + x * B[k][j], 0)));
  const identity = (k) => Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => (i === j ? 1 : 0)));
  const map2 = (A, B, f) => A.map((row, i) => row.map((x, j) => f(x, B[i][j], i, j)));
  const scale = (A, s) => A.map((row) => row.map((x) => x * s));
  const sumSq = (A) => A.reduce((s, row) => s + row.reduce((t, x) => t + x * x, 0), 0);
  const colSums = (A) => A[0].map((_, j) => A.reduce((s, row) => s + row[j], 0));
  const diagOf = (A) => A.map((row, i) => row[i]);
  const clone = (A) => A.map((row) => [...row]);

  function inverse(A) {
    const n = A.length,
      X = A.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
    for (let k = 0; k < n; k++) {
      let p = k;
      for (let i = k + 1; i < n; i++) if (Math.abs(X[i][k]) > Math.abs(X[p][k])) p = i;
      if (Math.abs(X[p][k]) < 1e-14) return null;
      [X[k], X[p]] = [X[p], X[k]];
      const t = X[k][k];
      X[k] = X[k].map((x) => x / t);
      for (let i = 0; i < n; i++)
        if (i !== k) {
          const u = X[i][k];
          if (u !== 0) X[i] = X[i].map((x, j) => x - u * X[k][j]);
        }
    }
    return X.map((row) => row.slice(n));
  }

  // Autovalores y autovectores de una matriz simétrica (Jacobi cíclico).
  function eigenSymmetric(S) {
    const n = S.length,
      A = clone(S),
      V = identity(n);
    for (let sweep = 0; sweep < 100; sweep++) {
      let off = 0;
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i][j] * A[i][j];
      if (off < 1e-30) break;
      for (let p = 0; p < n; p++)
        for (let q = p + 1; q < n; q++) {
          if (Math.abs(A[p][q]) < 1e-300) continue;
          const theta = (A[q][q] - A[p][p]) / (2 * A[p][q]),
            t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1)),
            c = 1 / Math.sqrt(t * t + 1),
            s = t * c;
          for (let k = 0; k < n; k++) {
            const akp = A[k][p],
              akq = A[k][q];
            A[k][p] = c * akp - s * akq;
            A[k][q] = s * akp + c * akq;
          }
          for (let k = 0; k < n; k++) {
            const apk = A[p][k],
              aqk = A[q][k];
            A[p][k] = c * apk - s * aqk;
            A[q][k] = s * apk + c * aqk;
          }
          for (let k = 0; k < n; k++) {
            const vkp = V[k][p],
              vkq = V[k][q];
            V[k][p] = c * vkp - s * vkq;
            V[k][q] = s * vkp + c * vkq;
          }
        }
    }
    const order = diagOf(A)
      .map((v, i) => [v, i])
      .sort((a, b) => b[0] - a[0]);
    return { values: order.map((o) => o[0]), vectors: V.map((row) => order.map((o) => row[o[1]])) };
  }

  // Factor polar ortogonal de X (U·V′ de su SVD): X·(X′X)^(-1/2).
  function polar(X) {
    const { values, vectors: V } = eigenSymmetric(multiply(transpose(X), X));
    if (values.some((v) => !(v > 1e-300))) return null;
    const invRoot = multiply(
      V.map((row) => row.map((x, j) => x / Math.sqrt(values[j]))),
      transpose(V),
    );
    return multiply(X, invRoot);
  }

  // ---------- Criterios (vgQ de GPArotation) ----------
  const criteria = {
    varimax(L) {
      const p = L.length,
        means = colSums(L.map((r) => r.map((x) => x * x))).map((s) => s / p),
        QL = L.map((r) => r.map((x, j) => x * x - means[j]));
      return { Gq: map2(L, QL, (l, q) => -l * q), f: -sumSq(QL) / 4 };
    },
    quartimax(L) {
      return {
        Gq: L.map((r) => r.map((x) => -x * x * x)),
        f: -L.reduce((s, r) => s + r.reduce((t, x) => t + x ** 4, 0), 0) / 4,
      };
    },
    oblimin(L, args = {}) {
      const gam = args.gam || 0,
        p = L.length,
        k = L[0].length,
        L2 = L.map((r) => r.map((x) => x * x));
      let X = L2.map((r) => r.map((_, j) => r.reduce((s, x, m) => s + (m === j ? 0 : x), 0)));
      if (gam !== 0) {
        const means = colSums(X).map((s) => (s * gam) / p);
        X = X.map((r) => r.map((x, j) => x - means[j]));
      }
      void k;
      return {
        Gq: map2(L, X, (l, x) => l * x),
        f: L2.reduce((s, r, i) => s + r.reduce((t, x, j) => t + x * X[i][j], 0), 0) / 4,
      };
    },
    quartimin(L) {
      return criteria.oblimin(L, { gam: 0 });
    },
    geomin(L, args = {}) {
      const delta = args.delta ?? 0.01,
        k = L[0].length,
        L2 = L.map((r) => r.map((x) => x * x + delta)),
        pro = L2.map((r) => Math.exp(r.reduce((s, x) => s + Math.log(x), 0) / k));
      return {
        Gq: L.map((r, i) => r.map((x, j) => ((2 / k) * x * pro[i]) / L2[i][j])),
        f: pro.reduce((s, x) => s + x, 0),
      };
    },
  };

  const rowNorms = (A) => A.map((r) => Math.sqrt(r.reduce((s, x) => s + x * x, 0)));

  // GPArotation::GPForth
  function gpForth(A0, opts = {}) {
    const method = opts.method || "varimax",
      args = opts.args || {},
      eps = opts.eps ?? 1e-5,
      maxit = opts.maxit ?? 1000,
      vgQ = criteria[method];
    let A = A0,
      W = null;
    if (opts.normalize) {
      W = rowNorms(A0);
      A = A0.map((r, i) => r.map((x) => x / W[i]));
    }
    let T = opts.T ? clone(opts.T) : identity(A[0].length),
      al = 1,
      L = multiply(A, T),
      Q = vgQ(L, args),
      G = multiply(transpose(A), Q.Gq),
      f = Q.f,
      s = Infinity,
      iter = 0;
    for (iter = 0; iter <= maxit; iter++) {
      const M = multiply(transpose(T), G),
        S = map2(M, transpose(M), (a, b) => (a + b) / 2),
        Gp = map2(G, multiply(T, S), (a, b) => a - b);
      s = Math.sqrt(sumSq(Gp));
      if (s < eps) break;
      al *= 2;
      let Tt, Lt, Qt;
      for (let i = 0; i <= 10; i++) {
        Tt = polar(map2(T, Gp, (t, g) => t - al * g));
        Lt = multiply(A, Tt);
        Qt = vgQ(Lt, args);
        if (Qt.f < f - 0.5 * s * s * al) break;
        al /= 2;
      }
      T = Tt;
      L = Lt;
      f = Qt.f;
      G = multiply(transpose(A), Qt.Gq);
    }
    if (W) L = L.map((r, i) => r.map((x) => x * W[i]));
    return { loadings: L, T, f, iterations: Math.min(iter, maxit), converged: s < eps, gradient: s, orthogonal: true };
  }

  // GPArotation::GPFoblq
  function gpFoblq(A0, opts = {}) {
    const method = opts.method || "quartimin",
      args = opts.args || {},
      eps = opts.eps ?? 1e-5,
      maxit = opts.maxit ?? 1000,
      vgQ = criteria[method];
    let A = A0,
      W = null;
    if (opts.normalize) {
      W = rowNorms(A0);
      A = A0.map((r, i) => r.map((x) => x / W[i]));
    }
    let T = opts.T ? clone(opts.T) : identity(A[0].length),
      al = 1,
      Ti = inverse(T),
      L = multiply(A, transpose(Ti)),
      Q = vgQ(L, args),
      G = scale(transpose(multiply(multiply(transpose(L), Q.Gq), Ti)), -1),
      f = Q.f,
      s = Infinity,
      iter = 0;
    for (iter = 0; iter <= maxit; iter++) {
      const d = colSums(map2(T, G, (t, g) => t * g)),
        Gp = G.map((r, i) => r.map((g, j) => g - T[i][j] * d[j]));
      s = Math.sqrt(sumSq(Gp));
      if (s < eps) break;
      al *= 2;
      let Tt, Lt, Qt, Tti;
      for (let i = 0; i <= 10; i++) {
        const X = map2(T, Gp, (t, g) => t - al * g),
          v = colSums(X.map((r) => r.map((x) => x * x))).map((x) => 1 / Math.sqrt(x));
        Tt = X.map((r) => r.map((x, j) => x * v[j]));
        Tti = inverse(Tt);
        if (!Tti) {
          al /= 2;
          continue;
        }
        Lt = multiply(A, transpose(Tti));
        Qt = vgQ(Lt, args);
        if (f - Qt.f > 0.5 * s * s * al) break;
        al /= 2;
      }
      T = Tt;
      L = Lt;
      f = Qt.f;
      G = scale(transpose(multiply(multiply(transpose(L), Qt.Gq), Tti)), -1);
    }
    if (W) L = L.map((r, i) => r.map((x) => x * W[i]));
    return {
      loadings: L,
      T,
      phi: multiply(transpose(T), T),
      f,
      iterations: Math.min(iter, maxit),
      converged: s < eps,
      gradient: s,
      orthogonal: false,
    };
  }

  // stats::varimax (Kaiser, 1958), normalización de Kaiser por defecto.
  function varimaxKaiser(A0, opts = {}) {
    const normalize = opts.normalize ?? true,
      eps = opts.eps ?? 1e-5,
      k = A0[0].length,
      p = A0.length;
    const sc = normalize ? rowNorms(A0) : A0.map(() => 1),
      x = A0.map((r, i) => r.map((v) => v / sc[i]));
    let TT = identity(k),
      d = 0,
      iter = 0;
    for (iter = 1; iter <= 1000; iter++) {
      const z = multiply(x, TT),
        z2mean = colSums(z.map((r) => r.map((v) => v * v))).map((s) => s / p),
        inner = z.map((r) => r.map((v, j) => v * v * v - v * z2mean[j])),
        B = multiply(transpose(x), inner),
        U = polar(B);
      TT = U;
      const dpast = d;
      // Suma de valores singulares de B = traza(U′B).
      d = diagOf(multiply(transpose(U), B)).reduce((s, v) => s + v, 0);
      if (d < dpast * (1 + eps)) break;
    }
    const z = multiply(x, TT).map((r, i) => r.map((v) => v * sc[i]));
    return { loadings: z, T: TT, iterations: iter, converged: true, orthogonal: true };
  }

  // psych::kaiser(f, rotate = "Promax") → psych::Promax(m = 4).
  function promaxPsych(A0, opts = {}) {
    const m = opts.m ?? 4,
      h = rowNorms(A0),
      w = A0.map((r, i) => r.map((v) => v / h[i])),
      vm = opts.varimax ? opts.varimax(w) : varimaxKaiser(w),
      x = vm.loadings,
      Qm = x.map((r) => r.map((v) => v * Math.abs(v) ** (m - 1))),
      xtx = multiply(transpose(x), x),
      U0 = multiply(inverse(xtx), multiply(transpose(x), Qm)),
      d = diagOf(inverse(multiply(transpose(U0), U0))),
      U1 = U0.map((r) => r.map((v, j) => v * Math.sqrt(d[j]))),
      z = multiply(x, U1),
      U = multiply(vm.T, U1),
      Ui = inverse(U),
      phi = multiply(Ui, transpose(Ui));
    return {
      loadings: z.map((r, i) => r.map((v) => v * h[i])),
      T: transpose(Ui),
      phi,
      iterations: vm.iterations,
      converged: true,
      orthogonal: false,
      target: Qm,
      vmLoadings: x,
    };
  }

  // Reflexión y orden de factores como psych::fa (signo de la suma de cargas;
  // orden por varianza explicada, diag(Φ·Λ′Λ) en oblicuas).
  function psychOrder(L, phi, T) {
    const k = L[0].length,
      sign = colSums(L).map((s) => (s < 0 ? -1 : 1)),
      L1 = L.map((r) => r.map((v, j) => v * sign[j])),
      T1 = T ? T.map((r) => r.map((v, j) => v * sign[j])) : null,
      P1 = phi ? phi.map((r, i) => r.map((v, j) => v * sign[i] * sign[j])) : null,
      ev = P1 ? diagOf(multiply(P1, multiply(transpose(L1), L1))) : colSums(L1.map((r) => r.map((v) => v * v))),
      order = Array.from({ length: k }, (_, j) => j).sort((a, b) => ev[b] - ev[a] || a - b);
    return {
      loadings: L1.map((r) => order.map((j) => r[j])),
      phi: P1 ? order.map((i) => order.map((j) => P1[i][j])) : null,
      T: T1 ? T1.map((r) => order.map((j) => r[j])) : null,
      order,
      sign,
    };
  }

  // Resumen común de una solución: patrón, estructura, Φ, h², contribución por factor.
  function summarize(pattern, phi) {
    const k = pattern[0].length,
      Phi = phi || identity(k),
      structure = multiply(pattern, Phi),
      h2 = pattern.map((r, i) => r.reduce((s, v, j) => s + v * structure[i][j], 0)),
      contribution = Array.from({ length: k }, (_, j) => pattern.reduce((s, r, i) => s + r[j] * structure[i][j], 0));
    return { pattern, structure, phi: Phi, h2, contribution, totalCommon: h2.reduce((s, v) => s + v, 0) };
  }

  const METHODS = {
    none: { label: "Sin rotar", oblique: false },
    varimax: { label: "Varimax", oblique: false },
    quartimax: { label: "Quartimax", oblique: false },
    oblimin: { label: "Oblimin", oblique: true },
    geominQ: { label: "Geomin oblicua", oblique: true },
    promax: { label: "Promax", oblique: true },
  };

  // Generador reproducible (mulberry32) y matrices ortogonales para inicios múltiples.
  function seeded(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function randomStarts(k, n, seed = 2026) {
    const rnd = seeded(seed),
      starts = [identity(k)];
    if (k === 2)
      for (let a = 15; a < 90; a += 15) {
        const c = Math.cos((a * Math.PI) / 180),
          s = Math.sin((a * Math.PI) / 180);
        starts.push([
          [c, -s],
          [s, c],
        ]);
      }
    while (starts.length < n) {
      const X = Array.from({ length: k }, () =>
        Array.from({ length: k }, () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd())),
      );
      starts.push(polar(X));
    }
    return starts.slice(0, Math.max(n, 1));
  }

  // Una ejecución desde la matriz inicial T0 (ortogonal; null = identidad, como R).
  function runOnce(A, method, opts, T0) {
    const k = A[0].length,
      start = T0 || identity(k),
      // Modo estricto (varios inicios): tolerancia 1e-9 en GPA; Varimax por GPA normalizado, porque el
      // algoritmo de stats::varimax (tolerancia relativa 1e-5) se detiene antes en superficies planas.
      tol = opts.strict ? { eps: opts.strictEps ?? 1e-7, maxit: 3000 } : {};
    if (method === "varimax" && opts.strict)
      return gpForth(A, Object.assign({ method: "varimax", normalize: opts.normalize ?? true, T: start }, tol));
    if (method === "varimax") {
      // stats::varimax parte siempre de I: se rota antes A y se compone el resultado.
      const v = varimaxKaiser(T0 ? multiply(A, start) : A, { normalize: opts.normalize ?? true });
      return Object.assign(v, { T: T0 ? multiply(start, v.T) : v.T });
    }
    if (method === "quartimax")
      return gpForth(A, Object.assign({ method: "quartimax", normalize: !!opts.normalize, T: start }, tol));
    if (method === "oblimin")
      return gpFoblq(
        A,
        Object.assign(
          { method: "oblimin", args: { gam: opts.gamma || 0 }, normalize: !!opts.normalize, T: start },
          tol,
        ),
      );
    if (method === "geominQ")
      return gpFoblq(
        A,
        Object.assign(
          { method: "geomin", args: { delta: opts.delta ?? 0.01 }, normalize: !!opts.normalize, T: start },
          tol,
        ),
      );
    if (method === "promax")
      return promaxPsych(A, {
        m: opts.kappa ?? 4,
        varimax: opts.strict ? (w) => runOnce(w, "varimax", { strict: true }, T0) : null,
      });
    throw new Error("Rotación desconocida: " + method);
  }
  // Valor del criterio que optimiza cada método (menor = mejor). Promax se juzga por su Varimax interno.
  function objective(method, r) {
    if (method === "varimax") return -varimaxValue(r.loadings, true);
    if (method === "promax") return -varimaxValue(r.vmLoadings, true);
    return r.f;
  }

  /**
   * rotate(A, method, opts)
   *   method: "none" | "varimax" | "quartimax" | "oblimin" | "geominQ" | "promax"
   *   opts.gamma (oblimin; 0 = quartimin), opts.kappa (promax; 4), opts.delta (geomin; 0,01),
   *   opts.normalize (Kaiser en quartimax/oblimin/geomin; false como psych), opts.order (true: como psych),
   *   opts.starts: número de inicios. 1 (por defecto) reproduce R, que parte de la solución sin rotar;
   *   con más inicios se conserva el mejor criterio y localOptimum indica si el inicio único se quedaba corto.
   */
  function rotate(A, method = "varimax", opts = {}) {
    const k = A[0].length;
    let r,
      nStarts = 1;
    if (method === "none" || k < 2)
      r = { loadings: clone(A), T: identity(k), iterations: 0, converged: true, orthogonal: true };
    else {
      const starts = opts.starts > 1 ? randomStarts(k, opts.starts, opts.seed) : [null];
      let best = null,
        bestValue = Infinity,
        firstValue = null;
      nStarts = starts.length;
      if (nStarts === 1) {
        best = runOnce(A, method, opts, null);
        bestValue = firstValue = objective(method, best);
      } else firstValue = objective(method, runOnce(A, method, opts, null));
      if (nStarts > 1)
        starts.forEach((T0, i) => {
          const run = runOnce(A, method, Object.assign({}, opts, { strict: true }), i === 0 ? null : T0),
            value = objective(method, run);
          if (value < bestValue - 1e-10) {
            best = run;
            bestValue = value;
          }
        });
      r = best;
      // Solo se avisa si el inicio único se quedaba claramente lejos (no por redondeo ni por la
      // tolerancia relativa 1e-5 de stats::varimax en superficies planas).
      r.localOptimum = nStarts > 1 && firstValue > bestValue + 1e-3 * Math.max(1, Math.abs(bestValue));
      r.singleValue = firstValue;
      r.bestValue = bestValue;
    }
    let { loadings, T } = r,
      phi = r.orthogonal ? null : r.phi;
    if (opts.order !== false && k > 1) ({ loadings, phi, T } = psychOrder(loadings, phi, T));
    return Object.assign(summarize(loadings, phi), {
      method,
      oblique: !r.orthogonal,
      T,
      iterations: r.iterations,
      // Convergencia con el criterio estándar de GPArotation (‖gradiente proyectado‖ < 1e-5).
      converged: r.gradient !== undefined ? r.gradient < 1e-5 : r.converged,
      starts: nStarts,
      localOptimum: !!r.localOptimum,
      singleValue: r.singleValue,
      bestValue: r.bestValue,
      criterion: criterionValues(A, loadings),
    });
  }

  // ---------- Criterios en la escala que se enseña ----------
  // Varimax de Kaiser: Σ_j varianza_i(λ̃²_ij), con λ̃ = λ/h (normalización por filas).
  function varimaxValue(L, normalize = true) {
    const p = L.length,
      h = normalize ? rowNorms(L) : L.map(() => 1);
    return L[0]
      .map((_, j) => {
        const sq = L.map((r, i) => (r[j] / (h[i] || 1)) ** 2),
          mean = sq.reduce((s, v) => s + v, 0) / p;
        return sq.reduce((s, v) => s + (v - mean) ** 2, 0) / p;
      })
      .reduce((s, v) => s + v, 0);
  }
  // Quartimin: Σ_i Σ_{j<m} λ²_ij·λ²_im (menor = estructura más simple).
  function quartiminValue(L) {
    return L.reduce((s, r) => {
      let t = 0;
      for (let j = 0; j < r.length; j++) for (let m = j + 1; m < r.length; m++) t += r[j] * r[j] * r[m] * r[m];
      return s + t;
    }, 0);
  }
  function geominValue(L, delta = 0.01) {
    const k = L[0].length;
    return L.reduce((s, r) => s + Math.exp(r.reduce((t, x) => t + Math.log(x * x + delta), 0) / k), 0);
  }
  function criterionValues(A, L) {
    return { varimax: varimaxValue(L), quartimin: quartiminValue(L), geomin: geominValue(L) };
  }

  // ---------- Rotación manual en un plano ----------
  // Ejes con ángulos α1 y α2 (grados) medidos desde el eje F1 sin rotar.
  function axesFromAngles(angles) {
    return transpose(angles.map((a) => [Math.cos((a * Math.PI) / 180), Math.sin((a * Math.PI) / 180)]));
  }
  function fromAxes(A, T) {
    const Ti = inverse(T);
    if (!Ti) return null;
    const pattern = multiply(A, transpose(Ti)),
      phi = multiply(transpose(T), T);
    return Object.assign(summarize(pattern, phi), { T, criterion: criterionValues(A, pattern) });
  }
  function manual(A, angles) {
    return fromAxes(A, axesFromAngles(angles));
  }
  // Ángulos (grados) de los ejes de una solución rotada de 2 factores.
  function axisAngles(T) {
    return transpose(T).map((v) => (Math.atan2(v[1], v[0]) * 180) / Math.PI);
  }

  // Cargas sin rotar de una población: Λ verdadera y Φ → ejes principales de ΛΦΛ′.
  function principalAxes(pattern, phi) {
    const C = multiply(multiply(pattern, phi), transpose(pattern)),
      k = pattern[0].length,
      { values, vectors } = eigenSymmetric(C);
    const A = vectors.map((r) => r.slice(0, k).map((v, j) => v * Math.sqrt(Math.max(0, values[j]))));
    // Signo: suma positiva de cada columna, como psych.
    const sg = colSums(A).map((s) => (s < 0 ? -1 : 1));
    return A.map((r) => r.map((v, j) => v * sg[j]));
  }

  // Coeficiente de congruencia de Tucker entre columnas de dos matrices de cargas.
  function congruence(A, B) {
    return A[0].map((_, i) =>
      B[0].map((__, j) => {
        let ab = 0,
          aa = 0,
          bb = 0;
        A.forEach((r, p) => {
          ab += r[i] * B[p][j];
          aa += r[i] * r[i];
          bb += B[p][j] * B[p][j];
        });
        return ab / Math.sqrt(aa * bb);
      }),
    );
  }

  // Lectura de una matriz pegada (tabulador, punto y coma, espacios; coma o punto decimal).
  function parseMatrix(text) {
    const lines = String(text || "")
      .replace(/\r/g, "")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));
    if (!lines.length) return { error: "Pega una matriz: una fila por ítem y una columna por factor." };
    const split = (l) => {
      if (l.includes("\t")) return l.split("\t");
      if (l.includes(";")) return l.split(";");
      // Con coma decimal y espacios como separador, las comas son decimales.
      if (/\d,\d/.test(l) && /\s/.test(l.trim())) return l.split(/\s+/);
      if (/,\s/.test(l) || (l.match(/,/g) || []).length >= 1) return l.split(",");
      return l.split(/\s+/);
    };
    const rows = lines.map((l) =>
      split(l)
        .map((c) => c.trim())
        .filter((c) => c !== ""),
    );
    const names = [];
    let header = null;
    const num = (c) =>
      /^[-+−]?(\d+([.,]\d*)?|[.,]\d+)([eE][-+]?\d+)?$/.test(c) ? Number(c.replace(/−/g, "-").replace(",", ".")) : NaN;
    // Fila de datos: todo números, o una etiqueta seguida de números.
    const isData = (r) =>
      r.every((c) => Number.isFinite(num(c))) || (r.length > 1 && r.slice(1).every((c) => Number.isFinite(num(c))));
    if (!isData(rows[0])) header = rows.shift();
    if (!rows.length) return { error: "Falta al menos una fila de cargas debajo de la cabecera." };
    if (rows.some((r) => !isData(r))) return { error: "Hay celdas que no son números." };
    if (header && !Number.isFinite(num(rows[0][0])) && header.length === rows[0].length) header = header.slice(1);
    const data = rows.map((r, i) => {
      let cells = r;
      if (cells.length && !Number.isFinite(num(cells[0]))) {
        names.push(cells[0]);
        cells = cells.slice(1);
      } else names.push("I" + (i + 1));
      return cells.map(num);
    });
    const k = data[0].length;
    if (data.some((r) => r.length !== k)) return { error: "Todas las filas deben tener el mismo número de columnas." };
    if (data.some((r) => r.some((x) => !Number.isFinite(x)))) return { error: "Hay celdas que no son números." };
    if (k < 2 || k > 8) return { error: "Usa entre 2 y 8 factores (columnas)." };
    if (data.length < k + 1 || data.length > 80) return { error: "Usa entre k + 1 y 80 ítems (filas)." };
    if (data.some((r) => r.reduce((s, x) => s + x * x, 0) >= 1.0000001))
      return { error: "Alguna fila tiene h² ≥ 1: con cargas estandarizadas sin rotar, Σλ² debe ser menor que 1." };
    if (data.some((r) => r.every((x) => x === 0))) return { error: "Hay un ítem con todas las cargas a cero." };
    return { matrix: data, names, header: header && header.length === k ? header : null };
  }

  root.RotationMath = {
    transpose,
    multiply,
    inverse,
    identity,
    eigenSymmetric,
    polar,
    criteria,
    gpForth,
    gpFoblq,
    varimaxKaiser,
    promaxPsych,
    psychOrder,
    summarize,
    rotate,
    METHODS,
    varimaxValue,
    quartiminValue,
    geominValue,
    axesFromAngles,
    fromAxes,
    manual,
    axisAngles,
    principalAxes,
    congruence,
    parseMatrix,
  };
  if (typeof module !== "undefined") module.exports = root.RotationMath;
})(globalThis);
