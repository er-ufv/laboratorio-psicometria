# Ejecutar desde la raiz de psicometria; requiere mirt.
lib <- Sys.getenv("PSICOMETRIA_R_LIB")
if(nzchar(lib)) .libPaths(c(lib,.libPaths()))
library(mirt)
source("r/modules/tri_math.R")
theta <- c(-4,-2,-.5,0,.7,2,4)
rows <- list()
record <- function(model,D,t,item,category,quantity,value) {
 rows[[length(rows)+1]] <<- data.frame(model,D,theta=t,item,category,quantity,value)
}
build <- function(params,type,K=5) {
 # Datos solo para construir la estructura interna; no se calibran parametros.
 n <- length(params)
 if(type=="graded") dat <- sapply(seq_len(n),function(i) rep(((0:(K-1))+i-1)%%K,20))
 else dat <- sapply(seq_len(n),function(i) rep(c(0,1,1,0)[((0:3)+i-1)%%4+1],25))
 colnames(dat) <- paste0("Item_",seq_len(n))
 vals <- mirt(dat,1,itemtype=type,pars="values",verbose=FALSE)
 for(i in seq_len(n)) {
   item <- paste0("Item_",i)
   for(n in names(params[[i]])) vals$value[vals$item==item & vals$name==n] <- params[[i]][[n]]
 }
 vals$est <- FALSE
 mirt(dat,1,itemtype=type,pars=vals,verbose=FALSE,technical=list(NCYCLES=5))
}
base <- list(list(a=.8,b=-1.3,c=.15,d=.98),list(a=1.4,b=0,c=.2,d=.95),list(a=1.8,b=1.3,c=.25,d=.9))
for(D in c(1,1.702)) for(model in c("1PL","2PL","3PL","4PL")) {
 p <- lapply(base,function(x){if(model=="1PL") x$a<-1;if(model %in% c("1PL","2PL")) x$c<-0;if(model!="4PL") x$d<-1;x})
 # mirt's 2PL with fixed common slopes represents the 1PL; intercept = -D*a*b.
 type <- if(model=="1PL") "2PL" else model
 pars <- lapply(p,function(x) list(a1=D*x$a,d=-D*x$a*x$b,g=x$c,u=x$d))
 obj <- build(pars,type)
 ref <- tri_test(theta,p,D=D)
 for(i in 1:3) {
  item <- extract.item(obj,i);pr <- probtrace(item,matrix(theta,ncol=1));inf <- iteminfo(item,matrix(theta,ncol=1))
  stopifnot(max(abs(pr[,2]-ref$items[[i]]$probability))<1e-11,max(abs(inf-ref$items[[i]]$information))<1e-11)
  for(k in seq_along(theta)){record(model,D,theta[k],i,1,"probability",pr[k,2]);record(model,D,theta[k],i,-1,"information",inf[k])}
 }
 it <- testinfo(obj,matrix(theta,ncol=1));expected <- rowSums(sapply(1:3,function(i) probtrace(extract.item(obj,i),matrix(theta,ncol=1))[,2]))
 stopifnot(max(abs(it-ref$information))<1e-11)
 for(k in seq_along(theta)){record(model,D,theta[k],0,-1,"information",it[k]);record(model,D,theta[k],0,-1,"expected",expected[k]);record(model,D,theta[k],0,-1,"sem",1/sqrt(it[k]))}
}
for(D in c(1,1.702)) for(K in 3:5) {
 label <- paste0("GRM-",K)
 p <- lapply(1:3,function(i) list(a=c(1.2,.8,1.6)[i],b=(seq_len(K-1)-K/2)*1.1+(i-2)*.4))
 pars <- lapply(p,function(x){v<-as.list(c(D*x$a,-D*x$a*x$b));names(v)<-c("a1",paste0("d",seq_len(K-1)));v})
 obj <- build(pars,"graded",K);ref <- tri_test(theta,p,"graded",D)
 for(i in 1:3) {
  item <- extract.item(obj,i);pr<-probtrace(item,matrix(theta,ncol=1));inf<-iteminfo(item,matrix(theta,ncol=1))
  stopifnot(max(abs(pr-ref$items[[i]]$probabilities))<1e-11,max(abs(inf-ref$items[[i]]$information))<1e-11)
  for(k in seq_along(theta)){for(j in 1:K)record(label,D,theta[k],i,j-1,"probability",pr[k,j]);record(label,D,theta[k],i,-1,"information",inf[k])}
 }
 it<-testinfo(obj,matrix(theta,ncol=1));expected<-Reduce(`+`,lapply(1:3,function(i) as.vector(probtrace(extract.item(obj,i),matrix(theta,ncol=1)) %*% (0:(K-1)))))
 stopifnot(max(abs(it-ref$information))<1e-11)
 for(k in seq_along(theta)){record(label,D,theta[k],0,-1,"information",it[k]);record(label,D,theta[k],0,-1,"expected",expected[k]);record(label,D,theta[k],0,-1,"sem",1/sqrt(it[k]))}
}
options(digits=17)
write.csv(do.call(rbind,rows),"tests/fixtures/tri-mirt.csv",row.names=FALSE,eol=if(.Platform$OS.type=="windows")"\n" else "\r\n")
cat("OK: R nativo contrastado con mirt",as.character(packageVersion("mirt")),";",length(rows),"valores.\n")

# Bancos generados de 10 items y extension condicional errorvarianza.
bank <- jsonlite::fromJSON("tests/fixtures/tri-bank-parameters.json",simplifyVector=FALSE)
extra <- list()
for(kind in c("d","g")) for(D in c(1,1.702)) {
 p <- bank[[kind]]
 if(kind=="g") p <- lapply(p,function(x){x$b<-unlist(x$b);x})
 pars <- lapply(p,function(x) if(kind=="d") list(a1=D*x$a,d=-D*x$a*x$b,g=x$c,u=x$d) else {
  v<-as.list(c(D*x$a,-D*x$a*x$b));names(v)<-c("a1",paste0("d",seq_along(x$b)));v
 })
 obj<-build(pars,if(kind=="d")"4PL" else "graded")
 it<-testinfo(obj,matrix(theta,ncol=1));native<-tri_test(theta,p,if(kind=="d")"dichotomous" else "graded",D)
 stopifnot(max(abs(it-native$information))<1e-11)
 for(v in c(.5,1,2)) for(k in seq_along(theta)) {
  # reliability: Raju et al. (2007), 1 - EE2/Var(theta_hat); reliability_latent: s2*I/(s2*I + 1).
  rho<-1-1/(it[k]*v); latent<-v*it[k]/(v*it[k]+1)
  stopifnot(abs(rho-tri_conditional_reliability(native$information[k],v,"raju"))<1e-10,abs(latent-tri_conditional_reliability(native$information[k],v))<1e-10)
  extra[[length(extra)+1]]<-data.frame(kind,D,theta=theta[k],variance=v,information=it[k],sem=1/sqrt(it[k]),reliability=rho,reliability_latent=latent)
 }
}
write.csv(do.call(rbind,extra),"tests/fixtures/tri-bank-mirt.csv",row.names=FALSE,eol=if(.Platform$OS.type=="windows")"\n" else "\r\n")
cat("OK: bancos de diez \u00edtems;",length(extra),"filas de informaci\u00f3n, error y fiabilidad condicional.\n")
