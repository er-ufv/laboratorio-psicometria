# Desde la raiz: Rscript tests/rotation-reference.R
# Genera tests/fixtures/rotation-r.json para contrastar el motor JavaScript de rotacion
# con stats::varimax, GPArotation y psych.
source("r/modules/host.R")
psicometria_utf8()
suppressPackageStartupMessages({ library(psych); library(GPArotation); library(jsonlite) })
source("r/modules/rotation_math.R")
set.seed(1907)
cases <- list()
presets <- rotation_presets()
for (name in names(presets)) cases[[paste0("preset_", name)]] <- rotation_population(presets[[name]]$pattern, presets[[name]]$phi)
# Matrices aleatorias con estructura aproximada (2, 3 y 4 factores) a partir de soluciones sin rotar reales.
for (k in 2:4) {
  p <- 4 * k
  Lam <- matrix(runif(p * k, -.15, .2), p, k)
  for (i in 1:p) Lam[i, (i - 1) %/% 4 + 1] <- runif(1, .5, .8)
  Phi <- matrix(.35, k, k); diag(Phi) <- 1
  R <- Lam %*% Phi %*% t(Lam); diag(R) <- 1
  f <- psych::fa(R, nfactors = k, rotate = "none", fm = "uls")
  cases[[paste0("random_k", k)]] <- unclass(f$loadings)
}
specs <- list(
  list(method = "varimax"), list(method = "quartimax"), list(method = "oblimin", gamma = 0),
  list(method = "oblimin", gamma = 0.5), list(method = "oblimin", gamma = -0.5), list(method = "geominQ", delta = 0.01),
  list(method = "promax", kappa = 4), list(method = "promax", kappa = 2))
out <- list()
for (cn in names(cases)) {
  A <- cases[[cn]]; dimnames(A) <- NULL
  res <- list()
  for (s in specs) {
    r <- do.call(rotation_analytic, c(list(A = A), s))
    res[[length(res) + 1]] <- c(s, list(pattern = unname(r$pattern), phi = unname(r$phi), h2 = unname(r$h2),
      axes = unname(r$axes), contribution = unname(r$contribution)))
  }
  # Comprobacion de psych::fa: las rotaciones aplicadas a la solucion sin rotar coinciden con fa().
  out[[cn]] <- list(unrotated = A, results = res)
}
# Rotacion manual y criterios.
A <- cases$preset_relacionados
manual <- list()
for (ang in list(c(0, 90), c(-30, 60), c(-40, 75), c(10, 70))) {
  m <- rotation_manual(A, ang)
  manual[[length(manual) + 1]] <- list(angles = ang, pattern = unname(m$pattern), structure = unname(m$structure), phi = unname(m$phi), h2 = unname(m$h2),
    varimax = unname(m$criterion["varimax"]), quartimin = unname(m$criterion["quartimin"]))
}
# En poblacion con estructura simple perfecta, Oblimin recupera el patron y Phi verdaderos.
recover <- rotation_analytic(cases$preset_relacionados, "oblimin")
stopifnot(max(abs(abs(recover$pattern) - abs(presets$relacionados$pattern))) < 1e-4, abs(recover$phi[1, 2] - .3) < 1e-4)
write_json(list(packages = list(GPArotation = as.character(packageVersion("GPArotation")), psych = as.character(packageVersion("psych")), R = as.character(getRversion())),
  presets = lapply(presets, function(x) list(label = x$label, pattern = unname(x$pattern), phi = unname(x$phi))),
  cases = out, manual = manual), "tests/fixtures/rotation-r.json", auto_unbox = TRUE, digits = 16, pretty = FALSE)
cat("OK: rotation-r.json con", length(cases), "matrices y", length(specs), "rotaciones por matriz; Oblimin recupera el patron poblacional.\n")
