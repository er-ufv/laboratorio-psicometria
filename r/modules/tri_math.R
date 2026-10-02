# Formulas unidimensionales con parametros conocidos; no ajustan modelos.
# Archivo en ASCII: los mensajes usan escapes Unicode.
tri_stop <- function(...) stop(structure(class = c("psicometria_error", "error", "condition"), list(message = paste0(...), call = NULL)))
# Fiabilidad condicional a partir de la informacion I(theta).
# "latent" (por defecto): rho = s2*I/(s2*I + 1) = s2/(s2 + EE2), con EE2 = 1/I y
#   s2 = varianza latente de theta en la poblacion de referencia. Acotada en [0, 1).
# "raju": rho = 1 - EE2/Var(theta_hat) (Raju et al., 2007), donde Var(theta_hat)
#   es la varianza observada de las estimaciones; puede ser negativa.
tri_conditional_reliability <- function(information, variance = 1, method = c("latent", "raju")) {
  method <- match.arg(method)
  if (length(variance) != 1 || !is.finite(variance) || variance <= 0 || any(is.na(information)) || any(information < 0))
    tri_stop("La informaci\u00f3n debe ser no negativa y la varianza de referencia positiva.")
  if (method == "latent") ifelse(is.infinite(information), 1, variance * information / (variance * information + 1))
  else 1 - 1 / (information * variance)
}
tri_valid <- function(a,b,c=0,d=1,D=1) {
  all(vapply(list(a,b,c,d,D),function(x) is.numeric(x)&&length(x)==1,logical(1))) && all(is.finite(c(a,b,c,d,D))) &&
    a>0 && D>0 && c>=0 && c<d && d<=1
}
tri_dichotomous <- function(theta,a,b,c=0,d=1,D=1) {
  if(!tri_valid(a,b,c,d,D) || any(!is.finite(theta)))
    tri_stop("Revisa los par\u00e1metros: a y D positivos, b finito, 0 <= c < d <= 1.")
  s <- plogis(D*a*(theta-b)); q <- plogis(-D*a*(theta-b))
  p <- c+(d-c)*s; complement <- (1-d)+(d-c)*q
  derivative <- (d-c)*D*a*s*q
  info <- numeric(length(theta)); ok <- p>0 & complement>0
  info[ok] <- derivative[ok]^2/(p[ok]*complement[ok])
  data.frame(theta,probability=p,derivative,information=info)
}
tri_graded <- function(theta,a,b,D=1) {
  if(length(a)!=1 || !is.finite(a) || a<=0 || length(D)!=1 ||
     !is.finite(D) || D<=0 || !length(b) || any(!is.finite(b)) ||
     any(diff(b)<=0) || any(!is.finite(theta)))
    tri_stop("Revisa a, D y los umbrales: deben ser num\u00e9ricos y estrictamente crecientes.")
  x <- outer(theta,b,function(t,v) D*a*(t-v))
  s <- plogis(x); q <- plogis(-x); ds <- D*a*s*q
  prob <- matrix(0,length(theta),length(b)+1); deriv <- prob
  prob[,1] <- q[,1]; deriv[,1] <- -ds[,1]
  if(length(b)>1) for(i in 2:length(b)) {
    prob[,i] <- ifelse(x[,i]>=0,q[,i]-q[,i-1],s[,i-1]-s[,i])
    deriv[,i] <- ds[,i-1]-ds[,i]
  }
  prob[,length(b)+1] <- s[,length(b)]; deriv[,length(b)+1] <- ds[,length(b)]
  terms <- matrix(0,nrow(prob),ncol(prob)); ok <- prob>0
  terms[ok] <- deriv[ok]^2/prob[ok]
  list(probabilities=prob,cumulative=cbind(1,s,0),derivatives=deriv,
       information=rowSums(terms),expected=as.vector(prob %*% (0:length(b))))
}
tri_test <- function(theta,items,kind=c("dichotomous","graded"),D=1) {
  kind <- match.arg(kind)
  if(!length(items)) tri_stop("El test necesita al menos un \u00edtem.")
  r <- lapply(items,function(p) do.call(if(kind=="graded") tri_graded else tri_dichotomous,
                                        c(list(theta=theta,D=D),p)))
  information <- Reduce(`+`,lapply(r,function(x) x$information))
  expected <- Reduce(`+`,lapply(r,function(x) if(kind=="graded") x$expected else x$probability))
  list(items=r,information=information,expected=expected,
       sem=ifelse(information>0,1/sqrt(information),Inf))
}
# Maximo de la informacion de un item dicotomico.
# d = 1 (1PL, 2PL, 3PL): forma cerrada (Birnbaum; Lord, 1980)
#   theta_max = b + ln[(1 + sqrt(1 + 8c))/2]/(D a)
#   I_max = D^2 a^2 [1 - 20c - 8c^2 + (1 + 8c)^(3/2)] / [8 (1 - c)^2]; con c = 0, D^2 a^2/4 en theta = b.
# d < 1 (4PL): busqueda numerica.
tri_max_information <- function(a, b, c = 0, d = 1, D = 1) {
  if(!tri_valid(a,b,c,d,D)) tri_stop("Revisa los par\u00e1metros: a y D positivos, b finito, 0 <= c < d <= 1.")
  if(d == 1) {
    theta <- b + log((1 + sqrt(1 + 8*c))/2)/(D*a)
    information <- D^2*a^2*(1 - 20*c - 8*c^2 + (1 + 8*c)^1.5)/(8*(1 - c)^2)
    return(list(theta = theta, information = information, method = "closed"))
  }
  width <- 20/(D*a)
  grid <- seq(b - width, b + width, length.out = 4001)
  info <- tri_dichotomous(grid,a,b,c,d,D)$information
  k <- which.max(info); step <- grid[2] - grid[1]
  best <- stats::optimize(function(t) tri_dichotomous(t,a,b,c,d,D)$information, c(grid[k] - step, grid[k] + step), maximum = TRUE, tol = 1e-12)
  list(theta = best$maximum, information = best$objective, method = "numeric")
}
