# Rotacion factorial: funciones docentes en R.
# Convencion de GPArotation: A = cargas sin rotar (p x k); las columnas de Tm son los ejes
# rotados (vectores unitarios) en el espacio de los factores sin rotar.
#   Ortogonal: L = A %*% Tm, Phi = I.  Oblicua: P = A %*% t(solve(Tm)), Phi = t(Tm) %*% Tm.
# Fuente ASCII: los textos con tilde usan escapes \u para funcionar con cualquier locale.

rotation_axes <- function(angles) {
  # Angulos en grados medidos desde el eje F1 sin rotar; una columna por eje.
  rbind(cos(angles * pi / 180), sin(angles * pi / 180))
}

rotation_from_axes <- function(A, Tm) {
  A <- as.matrix(A)
  if (ncol(A) != nrow(Tm)) stop("Los ejes deben tener tantas filas como factores sin rotar.")
  if (abs(det(Tm)) < 1e-10) stop("Los ejes son paralelos: la matriz de ejes no es invertible.")
  P <- A %*% t(solve(Tm))
  Phi <- t(Tm) %*% Tm
  rotation_summary(P, Phi, Tm)
}

rotation_manual <- function(A, angles) rotation_from_axes(A, rotation_axes(angles))

rotation_summary <- function(P, Phi = diag(ncol(P)), Tm = NULL) {
  P <- as.matrix(P)
  colnames(P) <- paste0("F", seq_len(ncol(P)))
  S <- P %*% Phi
  h2 <- rowSums(P * S)
  list(pattern = P, structure = S, phi = Phi, h2 = h2, contribution = colSums(P * S), axes = Tm,
       criterion = c(varimax = rotation_varimax_value(P), quartimin = rotation_quartimin_value(P)))
}

# Criterio Varimax de Kaiser: suma de varianzas de las cargas normalizadas al cuadrado.
rotation_varimax_value <- function(L, normalize = TRUE) {
  L <- as.matrix(L)
  if (normalize) L <- L / sqrt(rowSums(L^2))
  sum(apply(L^2, 2, function(x) mean((x - mean(x))^2)))
}

# Criterio Quartimin: suma por item de los productos de cargas al cuadrado entre pares de factores.
rotation_quartimin_value <- function(L) {
  L2 <- as.matrix(L)^2
  (sum(rowSums(L2)^2) - sum(L2^2)) / 2
}

# Ordenacion y reflexion como psych::fa.
rotation_psych_order <- function(L, Phi = NULL, Tm = NULL) {
  s <- sign(colSums(L)); s[s == 0] <- 1
  L <- L %*% diag(s, ncol(L))
  if (!is.null(Tm)) Tm <- Tm %*% diag(s, ncol(L))
  if (!is.null(Phi)) Phi <- diag(s, ncol(L)) %*% Phi %*% diag(s, ncol(L))
  ev <- if (is.null(Phi)) colSums(L^2) else diag(Phi %*% t(L) %*% L)
  o <- order(ev, decreasing = TRUE)
  list(loadings = L[, o, drop = FALSE], phi = if (is.null(Phi)) NULL else Phi[o, o, drop = FALSE],
       axes = if (is.null(Tm)) NULL else Tm[, o, drop = FALSE])
}

# Rotacion analitica con los mismos algoritmos que psych::fa.
rotation_analytic <- function(A, method = c("varimax", "quartimax", "oblimin", "geominQ", "promax"),
                              gamma = 0, kappa = 4, delta = 0.01, order = TRUE) {
  method <- match.arg(method)
  A <- as.matrix(A)
  if (ncol(A) < 2) stop("La rotaci\u00f3n necesita al menos dos factores.")
  r <- switch(method,
    varimax = { v <- stats::varimax(A); list(L = unclass(v$loadings), Tm = v$rotmat, Phi = NULL) },
    quartimax = { g <- GPArotation::quartimax(A); list(L = unclass(g$loadings), Tm = g$Th, Phi = NULL) },
    oblimin = { g <- GPArotation::oblimin(A, gam = gamma); list(L = unclass(g$loadings), Tm = g$Th, Phi = g$Phi) },
    geominQ = { g <- GPArotation::geominQ(A, delta = delta); list(L = unclass(g$loadings), Tm = g$Th, Phi = g$Phi) },
    promax = {
      g <- psych::kaiser(A, rotate = "Promax", m = kappa, pro.m = kappa)
      list(L = unclass(g$loadings), Tm = t(solve(g$rotmat)), Phi = g$Phi)
    })
  dimnames(r$L) <- NULL
  if (order) {
    o <- rotation_psych_order(r$L, r$Phi, r$Tm)
    r$L <- o$loadings; r$Phi <- o$phi; r$Tm <- o$axes
  }
  rotation_summary(r$L, if (is.null(r$Phi)) diag(ncol(A)) else r$Phi, r$Tm)
}

# Cargas sin rotar de una poblacion (ejes principales de Lambda Phi Lambda').
rotation_population <- function(pattern, phi) {
  C <- pattern %*% phi %*% t(pattern)
  e <- eigen(C, symmetric = TRUE)
  k <- ncol(pattern)
  A <- e$vectors[, 1:k, drop = FALSE] %*% diag(sqrt(pmax(0, e$values[1:k])), k)
  A %*% diag(ifelse(colSums(A) < 0, -1, 1), k)
}

# Presets docentes de dos factores (poblacion, sin error muestral).
rotation_presets <- function() {
  simple <- function(a, b) cbind(c(a, rep(0, length(b))), c(rep(0, length(a)), b))
  list(
    relacionados = list(label = "Dos dominios relacionados (\u03a6 = 0,30)", pattern = simple(c(.75, .7, .65, .6), c(.7, .65, .6, .55)), phi = matrix(c(1, .3, .3, 1), 2)),
    independientes = list(label = "Dos dominios independientes (\u03a6 = 0)", pattern = simple(c(.75, .7, .65, .6), c(.7, .65, .6, .55)), phi = diag(2)),
    general = list(label = "Factores muy relacionados (\u03a6 = 0,60)", pattern = simple(c(.75, .7, .65, .6), c(.7, .65, .6, .55)), phi = matrix(c(1, .6, .6, 1), 2)),
    complejo = list(label = "Con dos \u00edtems complejos (\u03a6 = 0,30)", pattern = rbind(simple(c(.75, .7, .65), c(.7, .65, .6)), c(.45, .4), c(.4, .45)), phi = matrix(c(1, .3, .3, 1), 2))
  )
}
