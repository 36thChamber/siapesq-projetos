# Subamostragem reprodutível 1:1, após filtrar preditores não finitos.
preparar_treino_balanceado <- function(df, preditores, seed = 42L) {
  obrigatorias <- c("sp", preditores)
  faltando <- setdiff(obrigatorias, names(df))
  if (length(faltando)) stop("Faltam colunas de treino: ", paste(faltando, collapse = ", "))
  if (anyNA(df$sp) || any(!df$sp %in% c(0, 1))) stop("sp deve conter apenas 0 e 1.")
  if (!all(vapply(df[preditores], is.numeric, logical(1)))) stop("Preditores devem ser numéricos.")
  n_entrada <- nrow(df)
  ok <- complete.cases(df[obrigatorias]) &
    Reduce(`&`, lapply(df[preditores], is.finite))
  df <- df[ok, , drop = FALSE]
  antes <- c(sum(df$sp == 0), sum(df$sp == 1))
  n <- min(antes)
  if (n == 0L) stop("Sem as duas classes após filtrar os preditores inválidos.")
  set.seed(seed)
  selecionados <- unlist(lapply(c(0, 1), function(v) {
    ii <- which(df$sp == v)
    # sample(ii, n) tem semântica especial quando ii é um único inteiro.
    if (length(ii) > n) ii[sample.int(length(ii), n)] else ii
  }))
  df <- df[sort(selecionados), , drop = FALSE]
  list(dados = df, auditoria = data.frame(
    classe = c(0, 1), casos_completos = antes, treino_balanceado = c(n, n),
    descartados_balanceamento = antes - n, entrada = n_entrada, seed = seed))
}
