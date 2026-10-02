# Ejecutar desde la raiz: Rscript tests/tct-reference.R
extra_library <- Sys.getenv("PSICOMETRIA_R_LIB")
if (nzchar(extra_library)) .libPaths(c(extra_library, .libPaths()))
if (!requireNamespace("psych", quietly=TRUE)) stop("Se necesita psych para reproducir el contraste.")
source("r/modules/tct_math.R")
m <- matrix(c(3,2,3,2,3,4,5,5,5,1,1,1,4,3,4,2,2,3),ncol=3,byrow=TRUE)
negative <- matrix(c(1,3,2,2,2,2,3,1,3,4,0,1,0,4,3,2,2,4),ncol=3,byrow=TRUE)
result <- suppressWarnings(psych::alpha(m,check.keys=FALSE,warnings=FALSE))
neg_result <- suppressWarnings(psych::alpha(negative,check.keys=FALSE,warnings=FALSE))
ci <- tct_interval(50,15,.8,.95)
values <- c(
  alpha_raw=result$total$raw_alpha,
  alpha_standard=result$total$std.alpha,
  mean_r=result$total$average_r,
  alpha_deleted_1=result$alpha.drop$raw_alpha[1],
  alpha_deleted_2=result$alpha.drop$raw_alpha[2],
  alpha_deleted_3=result$alpha.drop$raw_alpha[3],
  alpha_negative=neg_result$total$raw_alpha,
  sem=tct_sem(15,.8),
  ci_lower=ci[1],ci_upper=ci[2],
  z90=qnorm(.95),z95=qnorm(.975),z99=qnorm(.995),
  spearman_brown=tct_spearman_brown(.7,2),
  spearman_brown_half=tct_spearman_brown(.7,.5)
)
names(values)[names(values)=="ci_lower.lower"] <- "ci_lower"
names(values)[names(values)=="ci_upper.upper"] <- "ci_upper"
# Dos mitades y Kuder-Richardson con la matriz 0/1 de TCTMath.DICHOTOMOUS_EXAMPLE.
d <- do.call(rbind, lapply(strsplit(c("111110","111111","100000","110000","111110","111101","101010","000000",
                                      "101100","011000"), ""), as.numeric))
colnames(d) <- paste0("i", seq_len(ncol(d)))
oe <- tct_split_half(d, "odd-even"); fs <- tct_split_half(d, "first-second")
# KR-20 = alfa con datos 0/1; psych::splitHalf (covarianzas) da la peor y la mejor division en mitades y su media = alfa.
d_alpha <- suppressWarnings(psych::alpha(d, check.keys=FALSE, warnings=FALSE))$total$raw_alpha
halves <- psych::splitHalf(d, raw=TRUE, covar=TRUE)
stopifnot(abs(tct_kr20(d) - d_alpha) < 1e-12, abs(mean(halves$raw) - d_alpha) < 1e-12,
          abs(oe[["guttman"]] - halves$minrb) < 1e-12, abs(fs[["guttman"]] - halves$maxrb) < 1e-12,
          abs(oe[["spearman_brown"]] - tct_spearman_brown(oe[["r"]], 2)) < 1e-12)
values <- c(values,
  half_r_odd_even=oe[["r"]], half_sb_odd_even=oe[["spearman_brown"]], half_guttman_odd_even=oe[["guttman"]],
  half_r_first_second=fs[["r"]], half_sb_first_second=fs[["spearman_brown"]], half_guttman_first_second=fs[["guttman"]],
  kr20=tct_kr20(d), kr20_psych_alpha=d_alpha, kr21=tct_kr21(d), split_half_mean_psych=mean(halves$raw),
  split_half_min_psych=halves$minrb, split_half_max_psych=halves$maxrb, split_half_count_psych=length(halves$raw)/2,
  reliability_index=tct_reliability_index(.8), kelley=tct_kelley(130,100,.8), se_estimation=tct_se_estimation(15,.8),
  se_difference=tct_se_difference(15,.8), se_difference_unequal=tct_se_difference(15,.8,15,.9)
)
stopifnot(abs(tct_alpha(m)-result$total$raw_alpha)<1e-12)
dir.create("tests/fixtures",showWarnings=FALSE)
write.csv(data.frame(metric=names(values),value=unname(values)),"tests/fixtures/tct-r.csv",row.names=FALSE)
cat("Referencia generada. psych",as.character(packageVersion("psych")),"; R",as.character(getRversion()),"\n")
