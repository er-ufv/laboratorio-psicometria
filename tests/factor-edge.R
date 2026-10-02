# Desde la raiz: Rscript tests/factor-edge.R (tambien con LANG=C LC_ALL=C).
source("r/modules/host.R")
psicometria_utf8()
source("r/modules/factor_math.R", encoding = "UTF-8")
if (!exists("factor_cfa_compare")) stop("factor_math.R se ha cargado incompleto.")
reject <- function(expr, pattern = NULL) {
  e <- tryCatch(force(expr), error = function(e) e)
  stopifnot(inherits(e, "error"))
  if (!is.null(pattern) && !grepl(pattern, conditionMessage(e), useBytes = TRUE)) stop("Mensaje inesperado: ", conditionMessage(e))
  invisible(conditionMessage(e))
}
set.seed(42)
x <- matrix(rnorm(300), 100, 3)
reject(factor_validate_data(x[1:20, ]))
bad <- x
bad[, 1] <- 1
reject(factor_validate_data(bad))
bad <- x
bad[1, 1] <- NA
reject(factor_validate_data(bad))
reject(factor_validate_data(x, ordinal = TRUE))
reject(factor_validate_data(data.frame(id = letters[1:3], a = 1:3)), "Revisa: id")
reject(factor_validate_matrix(matrix(1, 3, 3)))
reject(factor_validate_matrix(matrix(c(1, .9, .9, .9, 1, -.9, .9, -.9, 1), 3, 3)))
reject(factor_validate_matrix(matrix(c(1, .2, .3, .4, 1, .2, .3, .2, 1), 3, 3)))
reject(factor_efa(cor(x), 100, nfactors = 2))
reject(factor_efa(cor(x), 100, nfactors = NA), "entero")
reject(factor_efa(cor(x), 100, nfactors = 1.5), "entero")

# Lectura de CSV: separador, decimal y separadores iguales.
semicolon <- tempfile(fileext = ".csv")
writeLines(c("I1;I2;I3", sprintf("%s;%s;%s", sub(".", ",", format(x[, 1]), fixed = TRUE), sub(".", ",", format(x[, 2]), fixed = TRUE), sub(".", ",", format(x[, 3]), fixed = TRUE))), semicolon)
comma <- tempfile(fileext = ".csv")
write.csv(data.frame(I1 = x[, 1], I2 = x[, 2], I3 = x[, 3]), comma, row.names = FALSE)
reject(factor_read_table(semicolon, ",", "."), "separador y decimal")
reject(factor_read_table(semicolon, ";", "."), "coma decimal")
reject(factor_read_table(semicolon, ",", ","), "mismo car")
reject(factor_read_table(comma, ";", "."), "una columna")
reject(factor_read_table(comma, ";", ","), "punto decimal|una columna")
stopifnot(max(abs(as.matrix(factor_read_table(semicolon, ";", ",")) - x)) < 1e-5)
stopifnot(identical(dim(factor_read_table(comma, ",", ".")), c(100L, 3L)))
bom <- tempfile(fileext = ".csv")
writeBin(c(as.raw(c(0xef, 0xbb, 0xbf)), readBin(comma, "raw", file.size(comma))), bom)
stopifnot(identical(names(factor_read_table(bom, ",", "."))[1], "I1"))

# Heywood: psych acota u2 cerca de 0,005; la regla h2 > 0,99 lo detecta.
data <- as.matrix(read.csv("data/independiente.csv"))
heywood <- factor_efa(cor(data), nrow(data), 2, "uls", "oblimin")
stopifnot(identical(heywood$heywood, 6L), !heywood$admissible, all(heywood$u2 > 0))
clean <- factor_efa(cor(as.matrix(read.csv("data/continua.csv"))), 600, 3, "uls", "oblimin")
stopifnot(!length(clean$heywood), clean$admissible, identical(colnames(clean$pattern), c("F1", "F2", "F3")))

# Analisis paralelo: no deja mc.cores modificado.
options(mc.cores = NULL)
set.seed(1)
pa <- factor_parallel(data[1:150, 1:4], "pearson", 100)
stopifnot(is.null(getOption("mc.cores")), isTRUE(pa$smc), length(pa$observed) == 4)

# AFC: identificacion, saturacion y sintaxis.
continuous <- as.data.frame(read.csv("data/continua.csv"))
ordinal <- as.data.frame(read.csv("data/ordinal.csv"))
reject(factor_cfa(continuous, "F1 =~ I1 + I2"), "no est\u00e1 identificado.*= -1")
reject(factor_cfa(ordinal, "F1 =~ I1 + I2", ordinal = TRUE), "no est\u00e1 identificado")
reject(factor_cfa(continuous, "F1 =~ no_existe"), "lavaan no pudo ajustar")
reject(factor_cfa(continuous, "F1 =~ I1 +"), "lavaan no pudo ajustar")
reject(factor_cfa(continuous, "   "), "Escribe una estructura")
saturated <- factor_cfa(continuous, "F1 =~ I1 + I2 + I3")
stopifnot(saturated$saturated, saturated$measures$df == 0, length(saturated$notes) == 1, grepl("saturado", saturated$notes, useBytes = TRUE))
identified <- factor_cfa(continuous, "F1 =~ I1 + I2\nF2 =~ I3 + I4")
stopifnot(!identified$saturated, identified$measures$df == 1, identified$measures$moments == 10, identified$measures$npar == 9)
robust <- factor_cfa(ordinal, "F1 =~ I1 + I2 + I3\nF2 =~ I4 + I5 + I6\nF3 =~ I7 + I8 + I9", ordinal = TRUE)
stopifnot(robust$measures$fitIndices == "robust", robust$measures$test == "scaled.shifted", robust$measures$df == 24, robust$measures$moments == 72,
  abs(robust$indices[["rmsea"]] - lavaan::fitMeasures(robust$fit, "rmsea.robust")) < 1e-12,
  abs(robust$indices[["chisq"]] - lavaan::fitMeasures(robust$fit, "chisq.scaled")) < 1e-12)
cat("Factor edge checks passed: data/matrix guards, CSV separator/decimal/BOM, Heywood rule, mc.cores restored, CFA identification (df < 0), saturated model, syntax errors and robust WLSMV indices.\n")
