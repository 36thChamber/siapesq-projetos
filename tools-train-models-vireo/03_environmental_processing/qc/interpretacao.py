#!/usr/bin/env python3
# interpretacao.py — MÁQUINA DE INTERPRETAÇÃO (determinística, sem IA).
#
# Transforma os NÚMEROS calculados pelos módulos de QC em CONHECIMENTO PRÁTICO: para
# cada análise gera o bloco padrão do laudo —
#     Resultado → Diagnóstico → O que significa → Impacto no SDM → Ação recomendada
# — com status 🟢🟡🔴, usando SEMPRE os dados reais da espécie (nunca texto fixo).
# Também monta: Resumo Executivo, Problemas encontrados, Próximos passos e a
# Interpretação ecológica por variável. Todos os limiares vêm de `limiares.py`.

from __future__ import annotations

import numpy as np
import pandas as pd

from . import limiares as L


# ---------------------------------------------------------------------------
# Utilitários
# ---------------------------------------------------------------------------
def _bloco(status, resultado, diagnostico, significado, impacto, acao) -> dict:
    return {"status": status, "resultado": resultado, "diagnostico": diagnostico,
            "significado": significado, "impacto": impacto, "acao": acao}


def _pior(*status) -> str:
    if L.VERMELHO in status:
        return L.VERMELHO
    if L.AMARELO in status:
        return L.AMARELO
    return L.VERDE


def _num(v, casas=1):
    try:
        if v is None or (isinstance(v, float) and not np.isfinite(v)):
            return "n/d"
        return f"{float(v):.{casas}f}"
    except (TypeError, ValueError):
        return "n/d"


def _serie(qc, conjunto, var):
    df = qc.conjuntos.get(conjunto)
    if df is None or var not in df.columns:
        return np.array([])
    return df[var].dropna().to_numpy(dtype="float64")


# ---------------------------------------------------------------------------
# 5. Integridade
# ---------------------------------------------------------------------------
def _integridade(qc, resultados) -> dict:
    d = resultados["integridade"]["completo"]
    problemas = []
    st = L.VERDE
    if d["faltantes_total"] > 0:
        st = _pior(st, L.AMARELO); problemas.append(f"{d['faltantes_total']} valor(es) faltante(s)")
    if d["duplicados"] > 0:
        st = _pior(st, L.AMARELO); problemas.append(f"{d['duplicados']} registro(s) duplicado(s)")
    consts = d["constantes"] + d["variancia_quase_zero"]
    if consts:
        st = _pior(st, L.VERMELHO); problemas.append(f"variável(is) sem variação: {consts}")
    resultado = (f"{d['n_total']} registros ({d['n_presencas']} presenças, "
                 f"{d['n_ausencias']} pseudoausências); {d['n_continuas']} variáveis "
                 f"contínuas e {d['n_categoricas']} categóricas.")
    diagnostico = "Dados íntegros." if st == L.VERDE else "; ".join(problemas) + "."
    bloco = _bloco(
        st, resultado, diagnostico,
        "A integridade é a checagem inicial: contagens, faltantes, duplicados e "
        "variáveis sem variação (que não ajudam a discriminar ambientes).",
        "Duplicados inflam artificialmente o sinal; variáveis constantes são inúteis; "
        "faltantes reduzem a amostra efetiva.",
        "Nenhuma ação." if st == L.VERDE else
        "Remover variáveis constantes; verificar duplicados e a origem dos faltantes.")
    return {"status": st, "blocos": [bloco]}


# ---------------------------------------------------------------------------
# 6. Descritiva (interpretação textual por variável)
# ---------------------------------------------------------------------------
def _descritiva(qc, resultados) -> dict:
    tab = resultados["descritiva"]["completo"]
    por_var = {}
    st_sec = L.VERDE
    for var, row in tab.iterrows():
        sk = row.get("assimetria")
        media = row.get("media"); cv = row.get("coef_variacao")
        st = L.VERDE
        if pd.notna(sk) and abs(sk) > L.SKEW_FORTE:
            st = L.AMARELO
            forma = ("fortemente assimétrica à direita (poucos valores muito altos)"
                     if sk > 0 else "fortemente assimétrica à esquerda")
        elif pd.notna(sk) and abs(sk) > L.SKEW_MODERADA:
            forma = "moderadamente assimétrica"
        else:
            forma = "aproximadamente simétrica"
        txt = (f"Média {_num(media, 2)} · assimetria {_num(sk, 2)} · curtose "
               f"{_num(row.get('curtose'), 2)}. Distribuição {forma}.")
        if st == L.AMARELO:
            txt += " Assimetria forte: considere transformar (ex.: log) antes de modelar."
        por_var[var] = {"status": st, "texto": txt}
        st_sec = _pior(st_sec, st)
    n_ass = sum(1 for v in por_var.values() if v["status"] == L.AMARELO)
    bloco = _bloco(
        st_sec, f"{len(por_var)} variáveis resumidas; {n_ass} com assimetria forte.",
        "Cada variável tem forma e dispersão próprias.",
        "A estatística descritiva mostra escala, dispersão e formato de cada variável — "
        "base para entender distribuições e outliers.",
        "Variáveis muito assimétricas podem exigir transformação; escalas muito "
        "diferentes afetam alguns algoritmos.",
        "Nenhuma ação." if n_ass == 0 else
        f"Avaliar transformação das {n_ass} variável(is) assimétrica(s).")
    return {"status": st_sec, "blocos": [bloco], "por_variavel": por_var}


# ---------------------------------------------------------------------------
# 7. Distribuições (poder discriminatório presença × ausência)
# ---------------------------------------------------------------------------
def _cohen_d(a, b):
    if len(a) < 2 or len(b) < 2:
        return np.nan
    va, vb = np.var(a, ddof=1), np.var(b, ddof=1)
    n1, n2 = len(a), len(b)
    sp = np.sqrt(((n1 - 1) * va + (n2 - 1) * vb) / max(n1 + n2 - 2, 1))
    if sp == 0:
        return np.nan
    return (np.mean(a) - np.mean(b)) / sp


def _distribuicoes(qc, resultados) -> dict:
    por_var = {}
    st_sec = L.VERDE
    boas = 0
    for var in qc.continuas:
        pres = _serie(qc, "presencas", var); aus = _serie(qc, "ausencias", var)
        d = _cohen_d(pres, aus)
        ad = abs(d) if np.isfinite(d) else 0.0
        if ad >= L.COHEN_GRANDE:
            st = L.VERDE; sep = "boa separação"; cap = "boa capacidade discriminatória"
        elif ad >= L.COHEN_MEDIO:
            st = L.VERDE; sep = "separação moderada"; cap = "capacidade discriminatória razoável"
        elif ad >= L.COHEN_PEQUENO:
            st = L.AMARELO; sep = "pouca separação"; cap = "capacidade discriminatória limitada"
        else:
            st = L.AMARELO; sep = "distribuições praticamente sobrepostas"; cap = "baixo poder de distinguir ambientes"
        if st == L.VERDE:
            boas += 1
        st_sec = _pior(st_sec, st)
        por_var[var] = {"status": st, "d": (round(float(d), 2) if np.isfinite(d) else None),
                        "texto": (f"Presenças × pseudoausências: {sep} "
                                  f"(|d de Cohen| = {_num(ad, 2)}). "
                                  f"Esta variável provavelmente terá {cap} na modelagem.")}
    n = max(len(qc.continuas), 1)
    st_sec = L.VERDE if boas >= n / 2 else L.AMARELO
    bloco = _bloco(
        st_sec, f"{boas}/{n} variáveis com boa/média separação presença×ausência.",
        "Quanto menos as curvas de presença e ausência se sobrepõem, mais a variável "
        "ajuda o modelo a separar ambiente favorável de desfavorável.",
        "A forma da distribuição revela assimetrias e, principalmente, o poder de "
        "separação de cada variável.",
        "Variáveis sem separação adicionam ruído; variáveis com boa separação sustentam "
        "o modelo.",
        "Nenhuma ação." if st_sec == L.VERDE else
        "Priorizar as variáveis com maior separação; as sobrepostas contribuem pouco.")
    return {"status": st_sec, "blocos": [bloco], "por_variavel": por_var}


# ---------------------------------------------------------------------------
# 8. Correlação (maior par + gradientes redundantes)
# ---------------------------------------------------------------------------
def _gradientes(mat, limiar):
    """Agrupa variáveis conectadas por |r| >= limiar (componentes conexas)."""
    if mat is None or mat.empty:
        return []
    cols = list(mat.columns)
    pai = {c: c for c in cols}

    def find(x):
        while pai[x] != x:
            pai[x] = pai[pai[x]]; x = pai[x]
        return x

    for i in range(len(cols)):
        for j in range(i + 1, len(cols)):
            r = mat.iloc[i, j]
            if pd.notna(r) and abs(r) >= limiar:
                pai[find(cols[i])] = find(cols[j])
    grupos = {}
    for c in cols:
        grupos.setdefault(find(c), []).append(c)
    return [g for g in grupos.values() if len(g) > 1]


def _correlacao(qc, resultados) -> dict:
    top = resultados["correlacao"]["completo"]["top"]
    pear = [p for p in top if p["metodo"] == "pearson"]
    mat = resultados["correlacao"]["completo"]["matrizes"].get("pearson")
    grad = _gradientes(mat, L.CORR_ALTA)
    maior = pear[0] if pear else None
    n_muito = sum(1 for p in pear if p["abs_r"] >= L.CORR_MUITO_ALTA)
    n_alta = sum(1 for p in pear if L.CORR_ALTA <= p["abs_r"] < L.CORR_MUITO_ALTA)
    st = L.VERDE if n_muito == 0 and n_alta == 0 else (L.VERMELHO if n_muito else L.AMARELO)
    if maior:
        resultado = (f"Maior correlação: {L.nome_legivel(maior['var1'])} × "
                     f"{L.nome_legivel(maior['var2'])}, r = {maior['r']:+.2f} "
                     f"({maior['classificacao']}).")
    else:
        resultado = "Correlações não calculadas (variáveis insuficientes)."
    grad_txt = [" e ".join(L.nome_legivel(v) for v in g) for g in grad]
    diagnostico = (f"{n_muito} par(es) muito alto(s) (|r|≥0,9) e {n_alta} alto(s) "
                   f"(0,8–0,9).")
    if grad_txt:
        diagnostico += " Grupos que representam o MESMO gradiente ambiental: " + \
                       "; ".join(grad_txt) + "."
    bloco = _bloco(
        st, resultado, diagnostico,
        "Correlação mede o quanto duas variáveis andam juntas (−1 a +1). Pares muito "
        "correlacionados carregam praticamente a MESMA informação ambiental — o modelo "
        "distribui a importância entre elas.",
        "Alta correlação reduz a interpretabilidade e desestabiliza os coeficientes.",
        "Nenhuma ação." if st == L.VERDE else
        "Se o VIF também for alto, considere manter apenas UMA variável de cada par/grupo "
        "muito correlacionado.")
    return {"status": st, "blocos": [bloco], "maior": maior, "gradientes": grad}


# ---------------------------------------------------------------------------
# 9. VIF (remoção recomendada, ordenada)
# ---------------------------------------------------------------------------
def _vif(qc, resultados) -> dict:
    tab = resultados["vif"]["completo"]
    remover = []
    if "vif" in tab and len(tab):
        alto = tab[tab["vif"] >= L.VIF_REMOVER].sort_values("vif", ascending=False)
        remover = [(r["variavel"], float(r["vif"])) for _, r in alto.iterrows()]
    n5 = int(((tab.get("vif", pd.Series(dtype=float)) >= L.VIF_ATENCAO) &
              (tab.get("vif", pd.Series(dtype=float)) < L.VIF_REMOVER)).sum()) if "vif" in tab else 0
    st = L.VERMELHO if remover else (L.AMARELO if n5 else L.VERDE)
    if remover:
        lista = ", ".join(f"{L.nome_legivel(v)} (VIF {vv:.1f})" for v, vv in remover)
        resultado = f"Variáveis com multicolinearidade alta (VIF≥10): {lista}."
        acao = ("Considere REMOVER, começando pela de maior VIF (" +
                L.nome_legivel(remover[0][0]) + "), e recalcular.")
    else:
        resultado = ("Nenhuma variável apresentou multicolinearidade preocupante."
                     if n5 == 0 else f"{n5} variável(is) em zona de atenção (VIF 5–10).")
        acao = "Nenhuma ação." if n5 == 0 else "Monitorar as variáveis em atenção."
    bloco = _bloco(
        st, resultado,
        f"{len(remover)} variável(is) para remoção; {n5} em atenção.",
        "O VIF mede se uma variável é 'explicada' pelas outras juntas (redundância que a "
        "correlação por pares não capta). VIF alto = variável redundante. Ex.: se altitude "
        "e temperatura carregam o mesmo gradiente, uma delas tende a ter VIF alto.",
        "VIF alto torna os coeficientes instáveis e o modelo sensível a pequenas mudanças.",
        acao)
    return {"status": st, "blocos": [bloco], "remover": remover}


# ---------------------------------------------------------------------------
# 10. Outliers · 11. Faltantes · 12. Categóricas
# ---------------------------------------------------------------------------
def _outliers(qc, resultados) -> dict:
    tab = resultados["outliers"]["completo"]["por_var"]
    pct = float(tab["pct_robust_z"].mean()) if len(tab) else 0.0
    afet = resultados["outliers"]["completo"].get("variaveis_afetadas", [])
    # Outliers NÃO são bloqueio (não removemos automaticamente) → no máximo AMARELO
    # ("monitorar"), nunca crítico. Evita superdimensionar na conclusão executiva.
    st = L.AMARELO if pct >= L.OUTLIER_MODERADO else L.VERDE
    bloco = _bloco(
        st, f"Média de {_num(pct)}% de pontos extremos por variável (Z-robusto).",
        "Poucos outliers." if st == L.VERDE else f"Concentração em: {afet[:5]}.",
        "Outliers são valores extremos: podem ser erros de dado OU condições ambientais "
        "raras. O Z-robusto (mediana/MAD) é o mais confiável.",
        "Outliers reais ampliam o nicho; errôneos enviesam o modelo.",
        "Nenhuma ação (não removemos automaticamente)." if st == L.VERDE else
        "Investigar as variáveis mais afetadas (erro de unidade × ambiente raro).")
    return {"status": st, "blocos": [bloco]}


def _faltantes(qc, resultados) -> dict:
    d = resultados["integridade"]["completo"]
    n_cells = d["n_total"] * (d["n_continuas"] + d["n_categoricas"])
    pct = 100 * d["faltantes_total"] / n_cells if n_cells else 0.0
    st = L.VERMELHO if pct >= L.FALTANTES_CRITICO else (L.AMARELO if pct >= L.FALTANTES_ATENCAO else L.VERDE)
    bloco = _bloco(
        st, f"{d['faltantes_total']} valores ausentes ({_num(pct, 2)}% das células).",
        "Sem faltantes." if st == L.VERDE else "Há células ausentes.",
        "Faltantes reduzem a amostra efetiva e podem enviesar se não forem aleatórios "
        "(ex.: pontos costeiros sem dado terrestre).",
        "Muitos faltantes forçam descartar registros ou imputar — ambos com custo.",
        "Nenhuma ação." if st == L.VERDE else
        "Verificar se os faltantes se concentram em alguma variável/classe.")
    return {"status": st, "blocos": [bloco]}


def _categoricas(qc, resultados) -> dict:
    from env_providers.legendas_uso_solo import rotulo
    dados = resultados["categoricas"]["completo"]
    blocos = []
    st_sec = L.VERDE
    for var, info in dados.items():
        sh = info.get("shannon", 0.0)
        st = L.AMARELO if sh < L.SHANNON_BAIXA else L.VERDE
        st_sec = _pior(st_sec, st)
        dom = rotulo(var, info["classe_dominante"])  # "código — Nome da classe"
        blocos.append(_bloco(
            st, f"{L.nome_legivel(var)}: {info['n_classes']} classes · classe dominante: "
                f"{dom} · Shannon {sh}.",
            "Boa variedade de ambientes." if st == L.VERDE else
            "Uma classe domina fortemente (pouca variedade).",
            "O Índice de Shannon mede a variedade de classes de uso do solo amostradas — "
            "alto = muitas classes bem distribuídas.",
            "Baixa diversidade limita a capacidade do modelo de generalizar entre ambientes.",
            "Nenhuma ação." if st == L.VERDE else
            "Verificar se a amostragem cobre os ambientes esperados para a espécie."))
    if not blocos:
        blocos = [_bloco(L.VERDE, "Sem variáveis categóricas.", "", "", "", "Nenhuma ação.")]
    return {"status": st_sec, "blocos": blocos}


# ---------------------------------------------------------------------------
# 13. PCA · 14. Cobertura ambiental
# ---------------------------------------------------------------------------
def _cobertura_pca(qc, resultados) -> tuple[dict, dict]:
    cob = resultados["cobertura"]
    razao = cob.get("razao_presencas_completo")
    pct = int(razao * 100) if razao is not None else None
    st = (L.VERDE if (razao is not None and razao >= L.COBERTURA_BOA) else
          L.AMARELO if (razao is not None and razao >= L.COBERTURA_MODERADA) else L.VERMELHO)
    if pct is not None:
        res_cob = f"As presenças ocupam {pct}% do espaço ambiental amostrado."
        concl = ("nicho ambiental bem representado" if st == L.VERDE else
                 "nicho relativamente restrito" if st == L.AMARELO else
                 "nicho pouco representado")
        impacto = ("O modelo prevê com boa segurança dentro do amostrado."
                   if st == L.VERDE else
                   "O modelo poderá EXTRAPOLAR com menor segurança para ambientes não amostrados.")
    else:
        res_cob = "Cobertura ambiental não estimada (dados insuficientes)."
        concl = "indeterminado"; impacto = "—"
    bloco_cob = _bloco(
        st, res_cob, f"Conclusão: {concl}.",
        "A cobertura avalia se os registros representam bem o espaço ambiental disponível. "
        "Presenças cobrindo pouco do espaço = nicho mal representado.",
        impacto,
        "Nenhuma ação." if st == L.VERDE else
        "Buscar mais ocorrências em ambientes sub-representados; interpretar mapas de "
        "predição com cautela nas regiões extrapoladas.")
    # PCA
    p = (resultados.get("pca") or {}).get("completo")
    if p is not None:
        r = p["explained_variance_ratio"]
        acum2 = float(p["explained_cumulative"][min(1, len(r) - 1)]) * 100
        res_pca = (f"Os 2 primeiros componentes explicam {acum2:.0f}% da variação "
                   f"ambiental (PC1 = {r[0]*100:.0f}%).")
        st_pca = L.VERDE
        bloco_pca = _bloco(
            st_pca, res_pca,
            "Quanto mais concentrada nos primeiros componentes, maior a redundância "
            "entre variáveis.",
            "O PCA resume as variáveis em poucos eixos (só diagnóstico — NÃO reduzimos "
            "as variáveis). No gráfico PC1×PC2, veja se presenças e ausências se separam.",
            "Presenças e ausências misturadas no gráfico sugerem baixo poder de separação "
            "do conjunto como um todo.",
            "Usar como diagnóstico da estrutura dos dados.")
    else:
        bloco_pca = _bloco(L.AMARELO, "PCA não calculado.", "", "", "", "—")
        st_pca = L.AMARELO
    return ({"status": st_pca, "blocos": [bloco_pca]},
            {"status": st, "blocos": [bloco_cob], "pct_ocupacao": pct})


# ---------------------------------------------------------------------------
# 15. Interpretação ECOLÓGICA (nicho da espécie, por variável)
# ---------------------------------------------------------------------------
def _texto_ecologico(tipo, med, mn, mx, p25, p75):
    if tipo == "temperatura":
        pref = ("quentes" if med >= 22 else "amenos/subtropicais" if med >= 15 else "frios/de altitude")
        return (f"A maioria das ocorrências está entre {_num(p25)}°C e {_num(p75)}°C "
                f"(mediana {_num(med)}°C). Interpretação: afinidade por ambientes {pref}.")
    if tipo == "altitude":
        pref = ("baixas altitudes (terras baixas)" if p75 < 800 else
                "altitudes médias" if p75 < 1500 else "altas altitudes/montanhas")
        return (f"A espécie ocorre entre {_num(mn, 0)} m e {_num(mx, 0)} m; 75% das "
                f"ocorrências abaixo de {_num(p75, 0)} m. Interpretação: preferência por {pref}.")
    if tipo == "vegetacao":
        pref = ("ambientes bem vegetados (matas/florestas)" if med >= 0.6 else
                "vegetação moderada" if med >= 0.3 else "áreas abertas/vegetação esparsa")
        return (f"NDVI mediano {_num(med, 2)} (entre {_num(p25, 2)} e {_num(p75, 2)}). "
                f"Interpretação: forte associação com {pref}.")
    if tipo == "solo_argila":
        pref = ("solos arenosos" if med < 20 else "solos de textura intermediária"
                if med < 40 else "solos argilosos")
        return (f"A maior parte das ocorrências em solos com {_num(p25)}–{_num(p75)}% de "
                f"argila (mediana {_num(med)}%). Interpretação: preferência por {pref}.")
    if tipo == "agua_solo":
        pref = ("boa" if med >= 12 else "moderada" if med >= 8 else "baixa")
        return (f"Água disponível mediana {_num(med)} v%. Interpretação: solos com {pref} "
                f"retenção de água.")
    if tipo == "relevo":
        pref = ("relevo plano" if med < 3 else "relevo ondulado" if med < 15 else "relevo acidentado")
        return (f"Declividade mediana {_num(med)}° (até {_num(p75)}°). Interpretação: "
                f"associação a {pref}.")
    if tipo == "chuva":
        return (f"Acumulado diário mediano de {_num(med)} mm (entre {_num(p25)} e "
                f"{_num(p75)} mm) nos dias/locais de ocorrência.")
    if tipo == "evaporacao":
        return (f"Evaporação diária mediana de {_num(med)} mm (magnitude típica dos "
                f"locais de ocorrência).")
    return f"Faixa observada: {_num(mn)}–{_num(mx)} (mediana {_num(med)})."


def _ecologica(qc, resultados) -> dict:
    out = {}
    for var, meta in L.VARS_ECO.items():
        if var not in qc.continuas:
            continue
        x = _serie(qc, "presencas", var)
        if x.size == 0:
            x = _serie(qc, "completo", var)
        if x.size == 0:
            continue
        conv = meta.get("conv", lambda v: v)
        x = conv(x)
        med = float(np.median(x)); mn = float(x.min()); mx = float(x.max())
        p25, p75 = (float(v) for v in np.percentile(x, [25, 75]))
        out[var] = {
            "nome": meta["nome"], "unidade": meta["unidade"],
            "faixa": f"{_num(mn)}–{_num(mx)} {meta['unidade']}".strip(),
            "texto": _texto_ecologico(meta["tipo"], med, mn, mx, p25, p75),
        }
    return out


# ---------------------------------------------------------------------------
# 1. Resumo Executivo · 3. Problemas · 4. Próximos passos
# ---------------------------------------------------------------------------
_DIMENSOES = [
    ("Nº de ocorrências", "n_presencas_dim"),
    ("Correlação", "correlacao"), ("VIF", "vif"), ("Outliers", "outliers"),
    ("Valores ausentes", "faltantes"), ("Cobertura ambiental", "cobertura"),
    ("Distribuições", "distribuicoes"), ("Uso do solo", "categoricas"),
]


def gerar(qc, resultados, readiness_res) -> dict:
    """Produz TODAS as interpretações do laudo a partir dos resultados calculados."""
    sec = {
        "integridade": _integridade(qc, resultados),
        "descritiva": _descritiva(qc, resultados),
        "distribuicoes": _distribuicoes(qc, resultados),
        "correlacao": _correlacao(qc, resultados),
        "vif": _vif(qc, resultados),
        "outliers": _outliers(qc, resultados),
        "faltantes": _faltantes(qc, resultados),
        "categoricas": _categoricas(qc, resultados),
    }
    pca_i, cob_i = _cobertura_pca(qc, resultados)
    sec["pca"] = pca_i
    sec["cobertura"] = cob_i
    ecologica = _ecologica(qc, resultados)

    # Dimensão "nº de ocorrências" (do readiness)
    crit_np = next((c for c in readiness_res["criterios"] if c["chave"] == "n_presencas"), None)
    st_np = crit_np["status"] if crit_np else L.VERDE

    # --- Resumo Executivo (semáforo por dimensão) ---
    _sit = {L.VERDE: "🟢 Excelente", L.AMARELO: "🟡 Atenção", L.VERMELHO: "🔴 Crítica"}
    _imp = {L.VERDE: "Nenhuma ação necessária", L.AMARELO: "Revisar/monitorar",
            L.VERMELHO: "Ação recomendada antes de modelar"}
    resumo = []
    for rotulo, chave in _DIMENSOES:
        st = st_np if chave == "n_presencas_dim" else sec[chave]["status"]
        resumo.append({"item": rotulo, "status": st, "situacao": _sit[st], "impacto": _imp[st]})

    # --- Problemas encontrados ---
    problemas = {"criticos": [], "atencao": [], "sem": []}
    for rotulo, chave in _DIMENSOES:
        s = sec.get(chave)
        st = st_np if chave == "n_presencas_dim" else s["status"]
        b = (s["blocos"][0] if s and s.get("blocos") else None)
        item = {"dimensao": rotulo,
                "descricao": (b["resultado"] if b else ""),
                "impacto": (b["impacto"] if b else ""),
                "recomendacao": (b["acao"] if b else "")}
        (problemas["criticos"] if st == L.VERMELHO else
         problemas["atencao"] if st == L.AMARELO else problemas["sem"]).append(item)

    # --- Próximos passos (ações objetivas) ---
    passos = []
    for v, vv in sec["vif"].get("remover", []):
        passos.append(f"Remover **{L.nome_legivel(v)}** (VIF {vv:.1f} — multicolinearidade alta).")
    if sec["correlacao"]["status"] != L.VERDE and sec["correlacao"].get("gradientes"):
        for g in sec["correlacao"]["gradientes"]:
            nomes = " e ".join(L.nome_legivel(x) for x in g)
            passos.append(f"Manter apenas UMA variável do grupo correlacionado ({nomes}).")
    if st_np == L.VERMELHO:
        passos.append("Aumentar o número de ocorrências (poucas presenças).")
    elif st_np == L.AMARELO:
        passos.append("Se possível, reunir mais ocorrências para robustez.")
    if sec["cobertura"]["status"] != L.VERDE:
        passos.append("Buscar ocorrências em ambientes sub-representados (cobertura limitada) "
                      "e interpretar os mapas com cautela nas áreas extrapoladas.")
    if resultados["integridade"]["completo"]["constantes"]:
        passos.append("Remover variáveis constantes/sem variação.")
    if not problemas["criticos"] and not passos:
        passos = ["✔ Pode iniciar a modelagem — nenhuma correção obrigatória detectada."]

    # --- Conclusão executiva ---
    r = readiness_res
    if not problemas["criticos"] and not problemas["atencao"]:
        conclusao = (f"A qualidade geral do conjunto é {r['classificacao'].lower()} "
                     f"({r['score']:.0f}/100). O modelo pode ser treinado.")
    elif problemas["criticos"]:
        nomes = ", ".join(p["dimensao"] for p in problemas["criticos"])
        conclusao = (f"O conjunto apresenta LIMITAÇÕES IMPORTANTES em: {nomes}. "
                     f"Recomenda-se revisar esses pontos antes da modelagem "
                     f"(nota {r['score']:.0f}/100 — {r['classificacao']}).")
    else:
        nomes = ", ".join(p["dimensao"] for p in problemas["atencao"])
        conclusao = (f"A qualidade é {r['classificacao'].lower()} ({r['score']:.0f}/100), "
                     f"com pontos de atenção em: {nomes}. Pode-se modelar, revisando "
                     f"esses itens.")

    return {"secoes": sec, "ecologica": ecologica, "resumo_executivo": resumo,
            "conclusao_executiva": conclusao, "problemas": problemas,
            "proximos_passos": passos}
