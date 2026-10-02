# Funciones puras de TCT; no requieren Shiny ni modifican datos.
tct_sem <- function(sd, reliability) {
  if (!is.finite(sd) || sd <= 0 || !is.finite(reliability) || reliability < 0 || reliability > 1) return(NA_real_)
  sd * sqrt(1 - reliability)
}
tct_interval <- function(score, sd, reliability, level = .95) {
  error <- tct_sem(sd, reliability)
  if (!is.finite(score) || !is.finite(error) || !level %in% c(.90, .95, .99)) return(c(lower=NA_real_, upper=NA_real_))
  margin <- qnorm((1 + level)/2) * error
  c(lower=score-margin, upper=score+margin)
}
tct_spearman_brown <- function(reliability, ratio) {
  if (!is.finite(reliability) || reliability < 0 || reliability > 1 || !is.finite(ratio) || ratio <= 0) return(NA_real_)
  ratio * reliability / (1 + (ratio - 1) * reliability)
}
tct_alpha <- function(data) {
  data <- as.matrix(data)
  if (nrow(data) < 2 || ncol(data) < 2 || any(!is.finite(data))) return(NA_real_)
  s <- cov(data); total_variance <- sum(s)
  if (total_variance <= 0) return(NA_real_)
  ncol(data)/(ncol(data)-1) * (1-sum(diag(s))/total_variance)
}

# ---------- Dos mitades, Kuder-Richardson y estimacion de T (equivalentes de assets/js/modules/tct/math.js) ----------
# Varianzas con denominador N, como en las formulas de Kuder-Richardson.
tct_pop_var <- function(x) mean((x - mean(x))^2)
tct_halves <- function(k, split = c("odd-even", "first-second")) {
  split <- match.arg(split)
  if (split == "first-second") list(a = seq_len(ceiling(k / 2)), b = setdiff(seq_len(k), seq_len(ceiling(k / 2))))
  else list(a = seq(1, k, by = 2), b = seq(2, k, by = 2))
}
tct_split_half <- function(data, split = c("odd-even", "first-second")) {
  data <- as.matrix(data)
  if (nrow(data) < 2 || ncol(data) < 2 || any(!is.finite(data))) return(c(r = NA_real_, spearman_brown = NA_real_, guttman = NA_real_))
  h <- tct_halves(ncol(data), match.arg(split))
  a <- rowSums(data[, h$a, drop = FALSE]); b <- rowSums(data[, h$b, drop = FALSE]); vx <- tct_pop_var(a + b)
  r <- if (tct_pop_var(a) > 0 && tct_pop_var(b) > 0) cor(a, b) else NA_real_
  c(r = r,
    spearman_brown = if (is.finite(r) && r > -1) 2 * r / (1 + r) else NA_real_,
    guttman = if (vx > 0) 2 * (1 - (tct_pop_var(a) + tct_pop_var(b)) / vx) else NA_real_)
}
tct_is_dichotomous <- function(data) {
  data <- as.matrix(data)
  nrow(data) >= 2 && ncol(data) >= 2 && all(is.finite(data)) && all(data %in% c(0, 1))
}
tct_kr20 <- function(data) {
  if (!tct_is_dichotomous(data)) return(NA_real_)
  data <- as.matrix(data); k <- ncol(data); vx <- tct_pop_var(rowSums(data)); p <- colMeans(data)
  if (vx <= 0) return(NA_real_)
  k / (k - 1) * (1 - sum(p * (1 - p)) / vx)
}
tct_kr21 <- function(data) {
  if (!tct_is_dichotomous(data)) return(NA_real_)
  data <- as.matrix(data); k <- ncol(data); total <- rowSums(data); m <- mean(total); vx <- tct_pop_var(total)
  if (vx <= 0) return(NA_real_)
  k / (k - 1) * (1 - m * (k - m) / (k * vx))
}
tct_valid_r <- function(r) is.finite(r) && r >= 0 && r <= 1
tct_reliability_index <- function(reliability) if (tct_valid_r(reliability)) sqrt(reliability) else NA_real_
tct_kelley <- function(score, mean, reliability) {
  if (!is.finite(score) || !is.finite(mean) || !tct_valid_r(reliability)) return(NA_real_)
  reliability * score + (1 - reliability) * mean
}
tct_se_estimation <- function(sd, reliability) {
  if (!is.finite(sd) || sd <= 0 || !tct_valid_r(reliability)) return(NA_real_)
  sd * sqrt(reliability * (1 - reliability))
}
tct_se_difference <- function(sd1, reliability1, sd2 = sd1, reliability2 = reliability1) {
  sqrt(tct_sem(sd1, reliability1)^2 + tct_sem(sd2, reliability2)^2)
}
