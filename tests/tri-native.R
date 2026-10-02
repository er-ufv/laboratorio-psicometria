# Desde la raiz: Rscript tests/tri-native.R (no requiere mirt; tambien con LANG=C).
source("r/modules/tri_math.R")
close <- function(a, b, tol = 1e-10) if (any(abs(a - b) > tol)) stop("Diferencia: ", paste(a, b))
# Fiabilidad condicional: por defecto con varianza latente; variante de Raju et al. (2007).
close(tri_conditional_reliability(4, 1), .8)
close(tri_conditional_reliability(c(0, 1, Inf), 2), c(0, 2 / 3, 1))
close(tri_conditional_reliability(4, 1, "raju"), .75)
close(tri_conditional_reliability(.5, 1, "raju"), -1)
stopifnot(tri_conditional_reliability(0, 1, "raju") == -Inf)
info <- 10^seq(-6, 6, length.out = 50)
rho <- tri_conditional_reliability(info, 1.5)
stopifnot(all(rho >= 0 & rho < 1), all(diff(rho) > 0))
for (bad in list(quote(tri_conditional_reliability(1, 0)), quote(tri_conditional_reliability(-1, 1)), quote(tri_conditional_reliability(NA, 1)))) {
  e <- tryCatch(eval(bad), error = function(e) e)
  stopifnot(inherits(e, "error"), grepl("varianza de referencia positiva", conditionMessage(e), useBytes = TRUE))
}
# Maximo de informacion: forma cerrada (d = 1) frente a optimize; 4PL numerico.
worst <- 0
for (D in c(1, 1.702)) for (a in c(.3, .8, 1.4, 2.5)) for (b in c(-2, 0, 1.3)) for (c in c(0, .05, .2, .35)) for (d in c(1, .9)) {
  r <- tri_max_information(a, b, c, d, D)
  o <- optimize(function(t) tri_dichotomous(t, a, b, c, d, D)$information, c(b - 30 / (D * a), b + 30 / (D * a)), maximum = TRUE, tol = 1e-12)
  stopifnot(r$method == if (d == 1) "closed" else "numeric", r$information >= o$objective - 1e-12)
  worst <- max(worst, abs(r$theta - o$maximum), abs(r$information - o$objective) / o$objective)
  if (c == 0 && d == 1) close(c(r$theta, r$information), c(b, D^2 * a^2 / 4))
}
stopifnot(worst < 1e-6)
# Indeterminacion: theta* = k theta + m, a* = a/k, b* = k b + m conservan P.
p <- tri_dichotomous(c(-2, 0, 1), 1.8, 1.3, .25, .9)$probability
q <- tri_dichotomous(2 * c(-2, 0, 1) + .5, 1.8 / 2, 2 * 1.3 + .5, .25, .9)$probability
close(p, q, 1e-14)
cat("OK: fiabilidad condicional (latente y Raju), 192 maximos de informacion (diferencia maxima", signif(worst, 2), ") e indeterminacion lineal de theta.\n")
