# Desde la raiz de psicometria. Genera referencias exactas para la web offline.
source("r/modules/host.R")
psicometria_utf8()
lib <- Sys.getenv("PSICOMETRIA_R_LIB")
if (nzchar(lib)) .libPaths(c(lib, .libPaths()))
suppressPackageStartupMessages({
  library(psych)
  library(lavaan)
  library(jsonlite)
})
source("r/modules/factor_math.R")
set.seed(2810)
n <- 600
p <- 9
L <- matrix(0, p, 3)
for (i in 1:p) L[i, ceiling(i / 3)] <- c(.75, .8, .7)[(i - 1) %% 3 + 1]
Phi <- matrix(.4, 3, 3)
diag(Phi) <- 1
F <- matrix(rnorm(n * 3), n, 3) %*% chol(Phi)
X <- F %*% t(L) + sweep(matrix(rnorm(n * p), n, p), 2, sqrt(1 - rowSums(L^2)), `*`)
colnames(X) <- paste0("I", 1:p)
O <- apply(X, 2, function(x) as.integer(cut(x, c(-Inf, -1.5, -.8, -.2, .7, Inf), labels = FALSE)))
colnames(O) <- colnames(X)
set.seed(805)
N <- matrix(rnorm(n * p), n, p, dimnames = list(NULL, colnames(X)))
datasets <- list(continua = X, ordinal = O, independiente = N)
dir.create("data", showWarnings = FALSE)
# CRLF en todos los sistemas: los CSV versionados se crearon en Windows.
for (name in names(datasets)) write.csv(datasets[[name]], paste0("data/", name, ".csv"), row.names = FALSE, eol = if (.Platform$OS.type == "windows") "\n" else "\r\n")
entries <- list()
for (name in names(datasets)) for (type in if (name == "ordinal") c("pearson", "poly") else "pearson") {
  key <- paste(name, type, sep = "_")
  x <- datasets[[name]]
  R <- factor_correlation(x, type)
  diagno <- factor_diagnostics(R, n)
  # Analisis paralelo de factores comunes: autovalores de la matriz reducida
  # con CMC (SMC = TRUE), no autovalores de componentes principales.
  set.seed(5041)
  parallel <- factor_parallel(x, type, 100)
  if (type == "pearson") {
    reduced <- R
    diag(reduced) <- psych::smc(R)
    stopifnot(max(abs(eigen(reduced, symmetric = TRUE, only.values = TRUE)$values - parallel$observed)) < 1e-10)
  }
  solutions <- list()
  for (k in 1:3) for (method in c("uls", "pa", "ml")) for (rotation in c("none", "varimax", "oblimin", "promax")) {
    label <- paste(k, method, rotation, sep = "_")
    result <- tryCatch(factor_efa(R, n, k, method, rotation), error = function(e) list(error = conditionMessage(e), heywood = integer()))
    if (!is.null(result$fit)) result$fit <- NULL
    # I(): conserva un vector JSON aunque haya un solo item Heywood.
    result$heywood <- I(as.integer(result$heywood))
    if (!is.null(result$warnings)) result$warnings <- I(result$warnings)
    solutions[[label]] <- result
  }
  entries[[key]] <- list(name = name, correlation = type, n = n, p = p, matrix = R, diagnostics = diagno, parallel = parallel, solutions = solutions)
}
models <- list(tres = "F1 =~ I1 + I2 + I3\nF2 =~ I4 + I5 + I6\nF3 =~ I7 + I8 + I9", uno = paste("G =~", paste(colnames(X), collapse = " + ")))
cfa <- list()
fits <- list()
for (name in c("continua", "ordinal")) for (model in names(models)) {
  ordinal <- name == "ordinal"
  fit <- factor_cfa(datasets[[name]], models[[model]], ordinal)
  key <- paste(name, model, sep = "_")
  fittedCov <- lavaan::fitted(fit$fit)$cov
  m <- fit$measures
  stopifnot(m$moments == if (ordinal) p * (p - 1) / 2 + p * 4 else p * (p + 1) / 2, m$df == m$moments - m$npar)
  if (!ordinal) {
    # Discrepancia ML independiente, con la convencion de n (no n - 1) de lavaan.
    S <- cov(datasets[[name]]) * (n - 1) / n
    Q <- solve(fittedCov)
    discrepancy <- as.numeric(determinant(fittedCov, logarithm = TRUE)$modulus) + sum(diag(S %*% Q)) - as.numeric(determinant(S, logarithm = TRUE)$modulus) - p
    stopifnot(abs(n * discrepancy - fit$indices["chisq"]) < 1e-5)
    # RMSEA, CFI y TLI con sus formulas a partir de chi2, gl y el modelo basal.
    stopifnot(abs(sqrt(max(0, (m$chisq - m$df) / (m$df * n))) - m$rmsea) < 1e-10)
    stopifnot(abs(1 - max(m$chisq - m$df, 0) / max(m$chisq - m$df, m$baselineChisq - m$baselineDf, 0) - m$cfi) < 1e-10)
    stopifnot(abs(((m$baselineChisq / m$baselineDf) - (m$chisq / m$df)) / ((m$baselineChisq / m$baselineDf) - 1) - m$tli) < 1e-10)
  }
  # Identificacion alternativa: indicador marcador (primera carga = 1). El ajuste
  # es equivalente; solo cambia la escala de las cargas no estandarizadas.
  marker <- factor_cfa(datasets[[name]], models[[model]], ordinal, std.lv = FALSE)
  # Con WLSMV el chi2 escalado difiere en ~1e-5 por la convergencia numerica.
  stopifnot(abs(marker$indices["chisq"] - fit$indices["chisq"]) < 1e-4 * max(1, fit$indices["chisq"]), marker$indices["df"] == fit$indices["df"])
  raw <- lavaan::parameterEstimates(fit$fit)
  rawMarker <- lavaan::parameterEstimates(marker$fit)
  stdMarker <- marker$standardized
  load <- raw$op == "=~"
  stopifnot(max(abs(stdMarker$est.std[stdMarker$op == "=~"] - fit$standardized$est.std[fit$standardized$op == "=~"])) < 1e-4)
  fit$identification <- list(stdlv = raw[load, c("lhs", "rhs", "est")], marker = rawMarker[rawMarker$op == "=~", c("lhs", "rhs", "est")], markerChisq = unname(marker$indices["chisq"]))
  fits[[key]] <- fit
  fit$fit <- NULL
  fit$warnings <- I(fit$warnings)
  fit$notes <- I(fit$notes)
  fit$model <- models[[model]]
  cfa[[key]] <- fit
}
comparisons <- list()
for (name in c("continua", "ordinal")) {
  cmp <- factor_cfa_compare(fits[[paste0(name, "_uno")]], fits[[paste0(name, "_tres")]])
  if (name == "continua") {
    # Con ML la diferencia de chi2 es directa: chi2(uno) - chi2(tres), gl 27 - 24.
    a <- cfa$continua_uno$measures
    b <- cfa$continua_tres$measures
    stopifnot(abs(cmp$chisqDiff - (a$chisq - b$chisq)) < 1e-8, cmp$dfDiff == a$df - b$df, abs(cmp$pvalue - pchisq(a$chisq - b$chisq, a$df - b$df, lower.tail = FALSE)) < 1e-12)
  }
  comparisons[[name]] <- c(list(restricted = "uno", general = "tres"), cmp)
}
packages <- list(psych = as.character(packageVersion("psych")), lavaan = as.character(packageVersion("lavaan")), GPArotation = as.character(packageVersion("GPArotation")), R = as.character(getRversion()))
bundle <- list(version = 2, packages = packages, entries = entries, cfa = cfa, cfaComparisons = comparisons,
  heywoodRule = list(limit = factor_heywood_limit, rule = "h2 > 0,99 (u2 < 0,01)"), generator = list(loadings = L, phi = Phi, n = n, seed = 2810))
writeLines(paste0("globalThis.FactorExamples = ", toJSON(bundle, auto_unbox = TRUE, digits = 16, na = "null", null = "null"), ";"), "assets/js/modules/factor/examples.js", useBytes = TRUE)
write_json(bundle, "tests/fixtures/factor-r.json", auto_unbox = TRUE, digits = 16, na = "null", null = "null", pretty = TRUE)
heywood <- unlist(lapply(names(entries), function(k) {
  s <- entries[[k]]$solutions
  hit <- names(s)[vapply(s, function(x) length(x$heywood) > 0, logical(1))]
  if (length(hit)) paste0(k, ":", hit) else character()
}))
cat("Versiones:", paste(names(packages), unlist(packages), collapse = ", "), "\n")
cat("Soluciones con Heywood (h2 > 0,99):", length(heywood), "\n")
for (k in names(entries)) cat(k, "paralelo: media", entries[[k]]$parallel$suggestedMean, "; P95", entries[[k]]$parallel$suggested95, "\n")
cat("OK: cuatro matrices, 144 soluciones AFE, cuatro AFC, dos comparaciones anidadas y 100 replicas de analisis paralelo por matriz.\n")
