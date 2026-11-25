suppressMessages({library(randomForest); library(parallel)})
args <- commandArgs(TRUE)
load_function <- function(path, name) {
  exprs <- parse(path)
  found <- Filter(function(x) is.call(x) && identical(x[[1]], as.name('<-')) &&
                    identical(x[[2]], as.name(name)), as.list(exprs))
  stopifnot(length(found) == 1)
  eval(found[[1]], envir = .GlobalEnv)
}
set.seed(42)
train <- data.frame(x1=runif(300), x2=rnorm(300), cat1=sample(0:1,300,TRUE))
y <- as.numeric(train$x1 + 0.15 * train$x2 > 0.5)
models <- lapply(seq_len(10), function(k) randomForest(x=train, y=y, ntree=60))
X <- data.frame(x1=runif(4000), x2=rnorm(4000), cat1=sample(0:1,4000,TRUE))
load_function(args[1], 'predizer_par')
old <- predizer_par
load_function(args[2], 'predict_chunk')
load_function(args[2], 'predizer_par')
new <- predizer_par
reference <- predict_chunk(X)
for (cores in c(2L,4L)) {
  ncores <- cores
  cl <- makeForkCluster(ncores)
  old_value <- old(X)
  new_value <- new(X)
  stopCluster(cl)
  stopifnot(identical(old_value,new_value), identical(new_value,reference))
  cat(sprintf('PASS: %d cores, 4000 cells, 10 actual RF members; means and SDs identical\n',cores))
}
cat(sprintf('Global worker function serialized: %d bytes\n',length(serialize(predict_chunk,NULL))))
