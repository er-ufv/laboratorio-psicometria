# Analisis reales con paquetes estandar. Sin reparacion silenciosa de matrices.
# Archivo en ASCII: los textos usan escapes Unicode para funcionar tambien con
# locales C/POSIX. Los mensajes de error se escriben en castellano.

# Error con mensaje en castellano. Se pasa como objeto condicion para que R no
# traduzca el texto al locale nativo (en C/POSIX mostraria <U+00E1>).
factor_stop <- function(...) stop(structure(class = c("psicometria_error", "error", "condition"), list(message = paste0(...), call = NULL)))
# Lectura de CSV propios con mensajes comprensibles.
factor_read_table <- function(path, sep = ",", dec = ".") {
  if (!is.character(sep) || length(sep) != 1 || !sep %in% c(",", ";", "\t")) factor_stop("Elige como separador de columnas coma, punto y coma o tabulador.")
  if (!is.character(dec) || length(dec) != 1 || !dec %in% c(".", ",")) factor_stop("Elige punto o coma como separador decimal.")
  if (identical(sep, dec)) factor_stop("El separador de columnas y el decimal no pueden ser el mismo car\u00e1cter. Si los decimales usan coma, separa las columnas con punto y coma.")
  x <- tryCatch(withCallingHandlers(utils::read.table(path, header = TRUE, sep = sep, dec = dec, check.names = FALSE, quote = "\"", comment.char = "", strip.white = TRUE, na.strings = c("NA", "")),
    warning = function(w) if (grepl("incomplete final line", conditionMessage(w), fixed = TRUE)) invokeRestart("muffleWarning")),
    error = function(e) factor_stop(paste0("No se pudo leer el CSV. Revisa separador y decimal: deben coincidir con los del archivo. Detalle de R (en ingl\u00e9s): ", conditionMessage(e))),
    warning = function(w) factor_stop(paste0("El CSV no tiene una estructura regular. Revisa separador y decimal, y que todas las filas tengan las mismas columnas. Detalle de R (en ingl\u00e9s): ", conditionMessage(w))))
  if (!nrow(x)) factor_stop("El CSV no contiene filas de datos bajo la cabecera.")
  names(x)[1] <- sub("^\xef\xbb\xbf", "", names(x)[1], useBytes = TRUE)
  if (ncol(x) == 1) {
    content <- paste(c(names(x), utils::head(as.character(x[[1]]), 5)), collapse = " ")
    hint <- if (grepl(";", content, fixed = TRUE)) " El texto contiene \u00ab;\u00bb: elige \u00abPunto y coma\u00bb como separador." else if (grepl(",", content, fixed = TRUE)) " El texto contiene comas: elige \u00abComa\u00bb como separador si separan columnas." else if (grepl("\t", content, fixed = TRUE)) " El texto contiene tabuladores: elige \u00abTabulador\u00bb." else ""
    factor_stop(paste0("Solo se ha le\u00eddo una columna. Revisa el separador de columnas.", hint))
  }
  text_columns <- names(x)[!vapply(x, is.numeric, logical(1))]
  if (length(text_columns)) {
    values <- unlist(lapply(x[text_columns], function(v) utils::head(stats::na.omit(as.character(v)), 50)), use.names = FALSE)
    if (dec == "." && any(grepl("^\\s*-?[0-9]*,[0-9]+\\s*$", values))) factor_stop("Hay valores con coma decimal (por ejemplo, 0,53): elige \u00abComa\u00bb como separador decimal.")
    if (dec == "," && any(grepl("^\\s*-?[0-9]*\\.[0-9]+\\s*$", values))) factor_stop("Hay valores con punto decimal (por ejemplo, 0.53): elige \u00abPunto\u00bb como separador decimal.")
  }
  x
}
factor_validate_data <- function(data, ordinal = FALSE) {
  if (!is.data.frame(data) && !is.matrix(data)) factor_stop("Se necesita una tabla num\u00e9rica: filas de personas y columnas de \u00edtems.")
  numeric <- vapply(as.data.frame(data), is.numeric, logical(1))
  if (!all(numeric)) factor_stop(paste0("Todas las columnas deben ser num\u00e9ricas; excluye nombres e identificadores. Revisa: ", paste(utils::head(names(numeric)[!numeric], 5), collapse = ", "), "."))
  data <- as.matrix(data)
  if (ncol(data) < 3 || ncol(data) > 50 || nrow(data) < 30) factor_stop("Usa entre 3 y 50 \u00edtems y al menos 30 filas. Ese m\u00ednimo t\u00e9cnico no garantiza estabilidad.")
  if (any(!is.finite(data))) factor_stop("Hay datos vac\u00edos o no finitos. Decide su tratamiento antes del an\u00e1lisis; no se eliminan personas silenciosamente.")
  if (any(apply(data, 2, stats::sd) == 0)) factor_stop("Hay un \u00edtem constante: no se puede calcular su correlaci\u00f3n.")
  if (ordinal && any(vapply(as.data.frame(data), function(x) any(x != round(x)) || length(unique(x)) < 2 || length(unique(x)) > 10, logical(1)))) factor_stop("Para polic\u00f3ricas utiliza categor\u00edas enteras ordenadas con 2\u201310 categor\u00edas observadas por \u00edtem.")
  data
}
factor_validate_matrix <- function(R) {
  if (!is.matrix(R) || nrow(R) != ncol(R) || nrow(R) < 3 || any(!is.finite(R))) factor_stop("La matriz debe ser cuadrada, finita y contener al menos tres \u00edtems.")
  if (max(abs(R - t(R))) > 1e-10 || max(abs(diag(R) - 1)) > 1e-10 || any(abs(R) > 1 + 1e-10)) factor_stop("Revisa simetr\u00eda, diagonal igual a 1 y correlaciones entre \u22121 y 1.")
  if (min(eigen(R, symmetric = TRUE, only.values = TRUE)$values) <= 1e-8) factor_stop("La matriz no es definida positiva o es casi singular. Revisa duplicaciones, muestra y correlaciones; no se ajusta autom\u00e1ticamente.")
  invisible(TRUE)
}
factor_correlation <- function(data, type = c("pearson", "poly")) {
  type <- match.arg(type)
  x <- factor_validate_data(data, type == "poly")
  R <- if (type == "pearson") stats::cor(x) else psych::polychoric(x, smooth = FALSE, global = FALSE, correct = .5, progress = FALSE)$rho
  factor_validate_matrix(R)
  R
}
factor_diagnostics <- function(R, n) {
  factor_validate_matrix(R)
  p <- ncol(R)
  if (length(n) != 1 || !is.finite(n) || n <= 1 + (2 * p + 5) / 6) factor_stop("Indica un tama\u00f1o muestral suficiente para el estad\u00edstico de Bartlett.")
  kmo <- psych::KMO(R)
  list(kmo = unname(kmo$MSA), msa = unname(kmo$MSAi), bartlett = psych::cortest.bartlett(R, n = n), eigen = eigen(R, symmetric = TRUE, only.values = TRUE)$values)
}
# Analisis paralelo de factores comunes (psych::fa.parallel, SMC = TRUE).
# Observado: autovalores de la matriz reducida con CMC en la diagonal.
# Referencia (psych 2.4.1): en cada replica, cada columna se remuestrea por
# separado con reposicion (sample(y, n, replace = TRUE)); se calcula la misma
# correlacion y los autovalores de su matriz reducida con CMC. sim = FALSE evita
# la referencia normal simulada, que aqui no se presenta.
factor_parallel <- function(data, type = "pearson", iterations = 100) {
  x <- factor_validate_data(data, type == "poly")
  if (length(iterations) != 1 || !is.finite(iterations) || iterations < 100) factor_stop("Usa al menos 100 r\u00e9plicas para este taller; la estabilidad todav\u00eda debe examinarse.")
  old <- options(mc.cores = 1)
  on.exit(options(old), add = TRUE)
  utils::capture.output(pa <- psych::fa.parallel(x, fa = "fa", fm = "uls", n.iter = iterations, quant = .95, cor = if (type == "poly") "poly" else "cor", SMC = TRUE, sim = FALSE, plot = FALSE))
  null <- pa$values[, paste0("F", seq_len(ncol(x))), drop = FALSE]
  means <- colMeans(null)
  quantiles <- apply(null, 2, stats::quantile, probs = .95)
  if (max(abs(means - pa$fa.simr)) > 1e-10) factor_stop("Las r\u00e9plicas del an\u00e1lisis paralelo no coinciden con la referencia de psych; revisa la versi\u00f3n del paquete.")
  leading <- function(reference) {
    k <- which(pa$fa.values <= reference)
    if (length(k)) k[1] - 1 else length(reference)
  }
  list(observed = unname(pa$fa.values), referenceMean = unname(means), reference95 = unname(quantiles),
    suggestedMean = leading(means), suggested95 = leading(quantiles), iterations = iterations, quantile = .95, smc = TRUE,
    reference = paste0("Remuestreo con reposici\u00f3n de cada columna por separado (psych::fa.parallel, SMC = TRUE): reproduce la distribuci\u00f3n marginal de cada \u00edtem, con variaci\u00f3n de muestreo, y elimina la asociaci\u00f3n entre \u00edtems. En cada r\u00e9plica se calcula el mismo tipo de correlaci\u00f3n y los autovalores de la matriz reducida con correlaciones m\u00faltiples al cuadrado en la diagonal.",
      if (type == "poly") " Las polic\u00f3ricas observadas y de cada r\u00e9plica se estiman con las opciones por defecto de psych::polychoric (umbrales globales), por lo que los autovalores observados pueden diferir ligeramente de los de la matriz analizada en el AFE." else ""))
}
# Regla de casos Heywood: psych acota durante el ajuste la unicidad de ULS y ML
# alrededor de 0,005, de modo que una solucion en ese limite nunca muestra
# u2 <= 0. Se marca como Heywood o cuasi-Heywood toda comunalidad h2 > 0,99
# (u2 < 0,01); con ejes principales, sin cota, aparece ademas como u2 < 0.
factor_heywood_limit <- .99
factor_efa <- function(R, n, nfactors = 3, method = c("uls", "pa", "ml"), rotation = c("oblimin", "none", "varimax", "promax")) {
  factor_validate_matrix(R)
  method <- match.arg(method)
  rotation <- match.arg(rotation)
  p <- ncol(R)
  if (length(nfactors) != 1 || !is.finite(nfactors) || nfactors != round(nfactors) || nfactors < 1) factor_stop("Indica un n\u00famero entero de factores, 1 o m\u00e1s.")
  df <- ((p - nfactors)^2 - p - nfactors) / 2
  if (nfactors >= p || df < 0) factor_stop("Ese n\u00famero de factores deja el modelo sin identificaci\u00f3n suficiente. Reduce factores o ampl\u00eda indicadores.")
  notes <- character()
  fit <- withCallingHandlers(psych::fa(R, nfactors = nfactors, n.obs = n, rotate = if (nfactors == 1) "none" else rotation, fm = method, smooth = FALSE, max.iter = 1000, warnings = TRUE),
    warning = function(w) {
      notes <<- c(notes, conditionMessage(w))
      invokeRestart("muffleWarning")
    })
  P <- unclass(fit$loadings)
  Phi <- if (is.null(fit$Phi)) diag(nfactors) else fit$Phi
  colnames(P) <- paste0("F", seq_len(nfactors))
  dimnames(Phi) <- list(colnames(P), colnames(P))
  S <- P %*% Phi
  common <- P %*% Phi %*% t(P)
  h2 <- diag(common)
  u2 <- 1 - h2
  reproduced <- common + diag(u2)
  residual <- R - reproduced
  heywood <- unname(which(!is.finite(h2) | h2 > factor_heywood_limit | u2 < 1 - factor_heywood_limit))
  admissible <- all(is.finite(P)) && !length(heywood) && all(h2 >= 0) && isTRUE(min(eigen(Phi, symmetric = TRUE, only.values = TRUE)$values) > 0)
  convergence <- if (is.null(fit$converged)) !any(grepl("converg|iterations exceeded", notes, ignore.case = TRUE)) else isTRUE(fit$converged)
  list(pattern = P, structure = S, phi = Phi, h2 = h2, u2 = u2, reproduced = reproduced, residual = residual,
    rmsr = sqrt(mean(residual[lower.tri(residual)]^2)), df = df, admissible = admissible, heywood = heywood,
    converged = convergence, warnings = unique(notes), fit = fit)
}
# Valor de un indice de lavaan; NA si no existe.
factor_measure <- function(metrics, name) if (name %in% names(metrics)) unname(metrics[[name]]) else NA_real_
factor_cfa <- function(data, model, ordinal = FALSE, std.lv = TRUE) {
  x <- factor_validate_data(data, ordinal)
  if (is.null(colnames(x))) colnames(x) <- paste0("I", seq_len(ncol(x)))
  if (!is.character(model) || length(model) != 1 || !nzchar(trimws(model))) factor_stop("Escribe una estructura de medici\u00f3n antes de ajustar AFC.")
  notes <- character()
  fit <- tryCatch(withCallingHandlers(lavaan::cfa(model, data = as.data.frame(x), std.lv = std.lv, estimator = if (ordinal) "WLSMV" else "ML", ordered = if (ordinal) colnames(x) else NULL),
    warning = function(w) {
      notes <<- c(notes, conditionMessage(w))
      invokeRestart("muffleWarning")
    }),
    error = function(e) factor_stop(paste0("lavaan no pudo ajustar el modelo. Revisa la sintaxis (Factor =~ I1 + I2 + I3), que los indicadores coincidan con las columnas del CSV y la identificaci\u00f3n. Detalle de lavaan (en ingl\u00e9s): ", trimws(conditionMessage(e)))))
  if (!isTRUE(lavaan::lavInspect(fit, "converged"))) factor_stop("El AFC no converge. Revisa identificaci\u00f3n, datos y estructura antes de interpretar \u00edndices.")
  npar <- as.integer(lavaan::lavInspect(fit, "npar"))
  df <- lavaan::lavInspect(fit, "test")[[1]]$df
  if (!is.finite(df) || df < 0) factor_stop(paste0("El modelo no est\u00e1 identificado: gl = momentos \u2212 par\u00e1metros libres = ", df + npar, " \u2212 ", npar, " = ", df, ". A\u00f1ade indicadores o restricciones; un factor aislado necesita al menos tres indicadores."))
  if (any(grepl("not identified|could not be inverted|not be inverted", notes, ignore.case = TRUE))) factor_stop("La matriz de informaci\u00f3n no es invertible: el modelo no est\u00e1 identificado o lo est\u00e1 muy d\u00e9bilmente con estos datos. Revisa la especificaci\u00f3n y cada factor (al menos tres indicadores, o dos con correlaciones distintas de cero).")
  admissible <- isTRUE(lavaan::lavInspect(fit, "post.check"))
  metrics <- lavaan::fitMeasures(fit)
  scaled <- ordinal
  pick <- function(name, type) {
    value <- factor_measure(metrics, if (type == "standard") name else paste0(name, ".", type))
    if (type == "robust" && !is.finite(value)) value <- factor_measure(metrics, paste0(name, ".scaled"))
    value
  }
  chi <- if (scaled) "scaled" else "standard"
  approx <- if (scaled) "robust" else "standard"
  robustAvailable <- !scaled || all(is.finite(c(metrics["rmsea.robust"], metrics["cfi.robust"], metrics["tli.robust"])))
  indices <- c(chisq = pick("chisq", chi), df = pick("df", chi), pvalue = pick("pvalue", chi), rmsea = pick("rmsea", approx),
    rmseaLower = pick("rmsea.ci.lower", approx), rmseaUpper = pick("rmsea.ci.upper", approx), cfi = pick("cfi", approx), tli = pick("tli", approx),
    srmr = factor_measure(metrics, "srmr"))
  measures <- list(chisq = indices[["chisq"]], df = indices[["df"]], pvalue = indices[["pvalue"]], rmsea = indices[["rmsea"]],
    rmseaLower = indices[["rmseaLower"]], rmseaUpper = indices[["rmseaUpper"]], cfi = indices[["cfi"]], tli = indices[["tli"]], srmr = indices[["srmr"]],
    npar = npar, moments = df + npar, ntotal = factor_measure(metrics, "ntotal"),
    aic = factor_measure(metrics, "aic"), bic = factor_measure(metrics, "bic"), logl = factor_measure(metrics, "logl"),
    baselineChisq = pick("baseline.chisq", chi), baselineDf = pick("baseline.df", chi),
    chisqStandard = factor_measure(metrics, "chisq"),
    rmseaScaled = if (scaled) factor_measure(metrics, "rmsea.scaled") else NA_real_,
    cfiScaled = if (scaled) factor_measure(metrics, "cfi.scaled") else NA_real_,
    tliScaled = if (scaled) factor_measure(metrics, "tli.scaled") else NA_real_,
    test = if (scaled) "scaled.shifted" else "standard", fitIndices = if (!scaled) "standard" else if (robustAvailable) "robust" else "scaled")
  saturated <- df == 0
  remarks <- character()
  if (saturated) remarks <- c(remarks, "Modelo saturado (gl = 0): reproduce exactamente las asociaciones observadas, as\u00ed que \u03c7\u00b2, RMSEA, CFI y TLI no eval\u00faan su ajuste.")
  if (scaled && !robustAvailable) remarks <- c(remarks, "lavaan no ofrece aqu\u00ed los \u00edndices robustos; se muestran RMSEA, CFI y TLI escalados.")
  list(fit = fit, admissible = admissible, warnings = unique(notes), notes = remarks, saturated = saturated, estimator = if (ordinal) "WLSMV" else "ML",
    indices = indices, measures = measures, standardized = lavaan::standardizedSolution(fit), implied = lavaan::lavInspect(fit, "cor.ov"))
}
# Diferencia de chi2 entre modelos anidados: estandar con ML; ajustada
# (lavTestLRT, metodo satorra.2000) con WLSMV.
factor_cfa_compare <- function(restricted, general) {
  if (!identical(restricted$estimator, general$estimator)) factor_stop("Compara modelos ajustados con el mismo estimador.")
  test <- suppressWarnings(lavaan::lavTestLRT(general$fit, restricted$fit))
  row <- utils::tail(as.data.frame(test), 1)
  list(chisqDiff = unname(row[["Chisq diff"]]), dfDiff = unname(row[["Df diff"]]), pvalue = unname(row[["Pr(>Chisq)"]]),
    method = if (general$estimator == "ML") "standard" else "satorra.2000")
}
