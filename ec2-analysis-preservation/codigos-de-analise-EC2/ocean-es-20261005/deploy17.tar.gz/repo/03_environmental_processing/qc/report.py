#!/usr/bin/env python3
# report.py — LAUDO TÉCNICO de Qualidade de Dados para SDM (HTML + MD + JSON).
#
# O HTML é o produto principal: um laudo NAVEGÁVEL (menu lateral, índice, tabelas
# recolhíveis, gráficos clicáveis, semáforos 🟢🟡🔴, caixas de alerta, responsivo e
# otimizado para impressão) — AUTOSSUFICIENTE (CSS/JS/imagens embutidos; abre offline).
# Cada análise segue Resultado → Diagnóstico → O que significa → Impacto no SDM → Ação,
# além de um bloco conceitual ("o que é / por que importa") — tudo gerado dos dados reais.

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

from . import plots, limiares as L
from .dados import ROTULOS

# Conceito curto por seção (o QUE é / por QUE importa) — complementa a interpretação.
CONCEITO = {
    "integridade": ("Contagem básica: registros, presenças, ausências, variáveis, "
                    "faltantes, duplicados e variáveis sem variação.",
                    "É a checagem inicial — dados incompletos ou variáveis constantes "
                    "enviesam ou quebram o modelo."),
    "descritiva": ("Resumo numérico de cada variável (média, dispersão, quartis, "
                   "assimetria, curtose).",
                   "Mostra escala, dispersão e formato — base para distribuições e outliers."),
    "distribuicoes": ("Forma de cada variável e comparação presença × pseudoausência.",
                      "Curvas separadas indicam variável que ajuda a distinguir ambientes."),
    "correlacao": ("O quanto duas variáveis andam juntas (−1 a +1).",
                   "Variáveis muito correlacionadas carregam a mesma informação e "
                   "desestabilizam o modelo."),
    "vif": ("Fator de Inflação da Variância: redundância de uma variável frente a TODAS "
            "as outras.",
            "VIF alto = variável explicada pelas demais (redundante)."),
    "outliers": ("Valores extremos (IQR, Z-score, Z-robusto).",
                 "Podem ser erros de dado ou condições ambientais raras."),
    "faltantes": ("Quantidade e % de valores ausentes por variável.",
                  "Faltantes reduzem a amostra e podem enviesar."),
    "categoricas": ("Uso do solo: frequência das classes e Índice de Shannon.",
                    "Mede a variedade de ambientes amostrados."),
    "pca": ("Resume as variáveis em poucos eixos (só diagnóstico).",
            "Mostra redundância e como presenças/ausências se organizam."),
    "cobertura": ("Avalia se os registros cobrem bem o espaço ambiental.",
                  "Cobertura baixa = nicho mal representado, risco de extrapolação."),
}

# Ordem das 16 seções do laudo: (id, título, [chave_conceito|None])
_SECOES = [
    ("resumo", "1. Resumo Executivo", None),
    ("score", "2. SDM Readiness Score", None),
    ("problemas", "3. Problemas encontrados", None),
    ("passos", "4. Próximos passos", None),
    ("integridade", "5. Integridade dos dados", "integridade"),
    ("descritiva", "6. Estatística descritiva", "descritiva"),
    ("distribuicoes", "7. Distribuições das variáveis", "distribuicoes"),
    ("correlacao", "8. Correlação", "correlacao"),
    ("vif", "9. Multicolinearidade (VIF)", "vif"),
    ("outliers", "10. Outliers", "outliers"),
    ("faltantes", "11. Valores ausentes", "faltantes"),
    ("categoricas", "12. Variáveis categóricas", "categoricas"),
    ("pca", "13. PCA", "pca"),
    ("cobertura", "14. Cobertura ambiental", "cobertura"),
    ("ecologica", "15. Interpretação ecológica", None),
    ("conclusao", "16. Conclusão geral", None),
]

_CSS = """
:root{--bg:#f5f7f9;--card:#ffffff;--ink:#1b2733;--muted:#5b6b7b;--line:#e2e7ec;
--accent:#0e6b7a;--accent2:#0a4f5c;--verde:#1a7f37;--amarelo:#b26a00;--vermelho:#b3261e;
--verdeBg:#e7f5ec;--amareloBg:#fdf3e3;--vermelhoBg:#fbeceb;}
*{box-sizing:border-box}
body{margin:0;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:var(--bg);color:var(--ink);line-height:1.5}
a{color:var(--accent);text-decoration:none}
.layout{display:flex;align-items:flex-start}
nav.side{position:sticky;top:0;height:100vh;overflow:auto;min-width:250px;max-width:250px;
background:var(--accent2);color:#dfeef1;padding:18px 14px;font-size:13.5px}
nav.side h2{color:#fff;font-size:15px;margin:0 0 4px}
nav.side .sub{color:#9fc6cd;font-size:12px;margin-bottom:14px}
nav.side a{display:block;color:#cfe6ea;padding:6px 8px;border-radius:6px;margin:1px 0}
nav.side a:hover{background:rgba(255,255,255,.08)}
nav.side a.active{background:#fff;color:var(--accent2);font-weight:600}
main{flex:1;max-width:1000px;margin:0 auto;padding:26px 30px}
h1{font-size:26px;margin:0 0 4px} h2{font-size:21px;margin:34px 0 6px;scroll-margin-top:12px}
h3{font-size:16px;margin:16px 0 6px}
.muted{color:var(--muted);font-size:13px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:18px 20px;margin:12px 0;box-shadow:0 1px 2px rgba(20,40,60,.04)}
.concept{background:#eef4f6;border-left:4px solid var(--accent);border-radius:6px;padding:10px 14px;margin:8px 0;font-size:13.5px}
.badge{display:inline-block;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:700;vertical-align:middle}
.b-verde{background:var(--verdeBg);color:var(--verde)} .b-amarelo{background:var(--amareloBg);color:var(--amarelo)} .b-vermelho{background:var(--vermelhoBg);color:var(--vermelho)}
.laudo{border:1px solid var(--line);border-left-width:5px;border-radius:10px;padding:12px 16px;margin:10px 0}
.laudo.verde{border-left-color:var(--verde)} .laudo.amarelo{border-left-color:var(--amarelo)} .laudo.vermelho{border-left-color:var(--vermelho)}
.laudo .row{display:flex;gap:8px;margin:3px 0;font-size:14px}
.laudo .k{min-width:150px;color:var(--muted);font-weight:600}
table{border-collapse:collapse;width:100%;font-size:13px}
th,td{border:1px solid var(--line);padding:5px 8px;text-align:right} th{background:#eef2f5;text-align:center}
td:first-child,th:first-child{text-align:left}
details{margin:8px 0} summary{cursor:pointer;font-weight:600;color:var(--accent2);padding:4px 0}
.tablewrap{overflow-x:auto}
img.fig{max-width:100%;border:1px solid var(--line);border-radius:8px;cursor:zoom-in;margin:6px 0}
.score-wrap{text-align:center;padding:8px}
.stars{font-size:40px;color:#f2b705;letter-spacing:4px}
.score-num{font-size:56px;font-weight:800;line-height:1}
.classif{font-size:20px;font-weight:700}
.exec table td{ text-align:left }
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
ul.clean{margin:6px 0;padding-left:20px} ul.clean li{margin:3px 0}
.alert{border-radius:8px;padding:10px 14px;margin:8px 0;font-size:14px}
.alert.vermelho{background:var(--vermelhoBg);border:1px solid #f0c4c1}
.alert.amarelo{background:var(--amareloBg);border:1px solid #f0d9ad}
.alert.verde{background:var(--verdeBg);border:1px solid #bfe3c9}
#lightbox{display:none;position:fixed;inset:0;background:rgba(10,20,28,.9);z-index:99;align-items:center;justify-content:center;cursor:zoom-out}
#lightbox img{max-width:94%;max-height:94%;border-radius:8px}
.topbar{display:none}
@media (max-width:820px){
  .layout{flex-direction:column} nav.side{position:static;height:auto;min-width:0;max-width:none;width:100%}
  main{padding:16px} .grid2{grid-template-columns:1fr}
}
@media print{
  nav.side{display:none} main{max-width:none} .card{break-inside:avoid;box-shadow:none}
  details{ } details>summary{display:none} details>*{display:block!important}
  a{color:var(--ink)} body{background:#fff}
}
"""

_JS = """
(function(){
  // Lightbox: clicar num gráfico amplia
  var lb=document.getElementById('lightbox'), lbimg=lb.querySelector('img');
  document.querySelectorAll('img.fig').forEach(function(im){
    im.addEventListener('click',function(){lbimg.src=im.src;lb.style.display='flex';});
  });
  lb.addEventListener('click',function(){lb.style.display='none';lbimg.src='';});
  // Scrollspy: destaca a seção ativa no menu
  var links=[].slice.call(document.querySelectorAll('nav.side a[href^="#"]'));
  var secs=links.map(function(a){return document.getElementById(a.getAttribute('href').slice(1));});
  function spy(){var y=window.scrollY+120,idx=0;
    for(var i=0;i<secs.length;i++){if(secs[i]&&secs[i].offsetTop<=y)idx=i;}
    links.forEach(function(a){a.classList.remove('active');});
    if(links[idx])links[idx].classList.add('active');}
  window.addEventListener('scroll',spy); spy();
})();
"""


def _emoji(st):
    return L.EMOJI.get(st, "")


def _badge(st):
    return f"<span class='badge b-{st}'>{_emoji(st)} {L.ROTULO_STATUS[st]}</span>"


def _laudo(b: dict) -> str:
    """Card de 5 passos (Resultado→Diagnóstico→Significado→Impacto→Ação)."""
    st = b.get("status", L.VERDE)
    linhas = [("Resultado", b.get("resultado")), ("Diagnóstico", b.get("diagnostico")),
              ("O que significa", b.get("significado")), ("Impacto no SDM", b.get("impacto")),
              ("Ação recomendada", b.get("acao"))]
    body = "".join(f"<div class='row'><div class='k'>{k}</div><div>{v}</div></div>"
                   for k, v in linhas if v)
    return f"<div class='laudo {st}'>{_badge(st)}{body}</div>"


def _df_html(df, floatfmt="{:.3f}", casas=None):
    if df is None or (hasattr(df, "empty") and df.empty):
        return "<p class='muted'>(sem dados)</p>"
    d = df.copy()
    for c in d.columns:
        if pd.api.types.is_float_dtype(d[c]):
            d[c] = d[c].map(lambda v: "" if pd.isna(v) else floatfmt.format(v))
    return "<div class='tablewrap'>" + d.to_html(index=True, border=0, na_rep="") + "</div>"


def _collapsible(titulo, html):
    return f"<details><summary>{titulo}</summary>{html}</details>"


def _img(b64, titulo, descricao):
    if not b64:
        return ""
    return (f"<figure style='margin:8px 0'><img class='fig' src='data:image/png;base64,{b64}'>"
            f"<figcaption class='muted'><b>{titulo}</b> — {descricao}</figcaption></figure>")


def _json_safe(o):
    if isinstance(o, dict):
        return {k: _json_safe(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [_json_safe(v) for v in o]
    if isinstance(o, pd.DataFrame):
        return o.reset_index().to_dict(orient="records")
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, (np.floating,)):
        return None if np.isnan(o) else float(o)
    if isinstance(o, np.ndarray):
        return _json_safe(o.tolist())
    return o


def gerar(qc, resultados, interp, figuras, readiness_res, out_dir: Path) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    integ = resultados["integridade"]
    sec = interp["secoes"]
    r = readiness_res

    # missing_report.csv
    linhas_miss = []
    for nome, d in integ.items():
        n = max(d["n_total"], 1)
        for var, q in d["faltantes_por_var"].items():
            linhas_miss.append({"conjunto": nome, "variavel": var, "faltantes": q,
                                "percentual": round(100 * q / n, 2)})
    pd.DataFrame(linhas_miss).to_csv(out_dir / qc.arq("missing_report.csv"), index=False)

    H = []

    # menu lateral
    itens = "".join(f"<a href='#{sid}'>{tit}</a>" for sid, tit, _ in _SECOES)
    nav = (f"<nav class='side'><h2>Laudo de Qualidade</h2>"
           f"<div class='sub'>{qc.especie}</div>{itens}</nav>")

    H.append(f"<h1>Laudo Técnico de Qualidade de Dados — SDM</h1>"
             f"<p class='muted'>Espécie: <b>{qc.especie}</b> · arquivo {qc.csv_path.name} · "
             f"{len(qc.continuas)} variáveis contínuas, {len(qc.categoricas)} categóricas · "
             f"análises em 3 conjuntos (completo / presenças / pseudoausências).</p>")

    # 1. Resumo Executivo
    rows = "".join(
        f"<tr><td>{x['item']}</td><td>{x['situacao']}</td><td>{'Nenhuma ação necessária' if x['status']==L.VERDE else 'Revisar/monitorar' if x['status']==L.AMARELO else 'Ação recomendada'}</td></tr>"
        for x in interp["resumo_executivo"])
    concl_cls = (L.VERDE if not interp["problemas"]["criticos"] and not interp["problemas"]["atencao"]
                 else L.VERMELHO if interp["problemas"]["criticos"] else L.AMARELO)
    H.append(f"<section id='resumo' class='card exec'><h2>1. Resumo Executivo</h2>"
             f"<table><tr><th>Item</th><th>Situação</th><th>Impacto</th></tr>{rows}</table>"
             f"<div class='alert {concl_cls}' style='margin-top:12px'><b>Conclusão executiva:</b> "
             f"{interp['conclusao_executiva']}</div></section>")

    # 2. Readiness Score
    crit_rows = "".join(
        f"<tr><td>{c['rotulo']}</td><td>{_emoji(c['status'])}</td><td>{c['pontos']:.1f} / {c['peso']}</td><td>{c['fator']}</td></tr>"
        for c in r["criterios"])
    pos = "".join(f"<li>✔ {x}</li>" for x in r["positivos"]) or "<li class='muted'>—</li>"
    ate = "".join(f"<li>⚠ {x}</li>" for x in r["atencao"]) or "<li class='muted'>—</li>"
    cri = "".join(f"<li>🔴 {x}</li>" for x in r["criticos"]) or "<li class='muted'>—</li>"
    H.append(f"<section id='score' class='card'><h2>2. SDM Readiness Score</h2>"
             f"<div class='concept'>Índice de 0 a 100 que resume, de forma objetiva, se o "
             f"conjunto está pronto para gerar um modelo confiável.</div>"
             f"<div class='score-wrap'><div class='stars'>{r['estrelas_txt']}</div>"
             f"<div class='score-num'>{r['score']:.0f}<span style='font-size:22px'> / 100</span></div>"
             f"<div class='classif'>Classificação: {r['classificacao']}</div>"
             f"<div class='muted'>{r['status']}</div></div>"
             f"<div class='grid2'><div><b>✔ Fatores positivos</b><ul class='clean'>{pos}</ul></div>"
             f"<div><b>⚠ Pontos de atenção</b><ul class='clean'>{ate}</ul>"
             f"<b>🔴 Problemas críticos</b><ul class='clean'>{cri}</ul></div></div>"
             + _collapsible("Ver contribuição de cada critério",
                            f"<table><tr><th>Critério</th><th> </th><th>Pontos</th><th>Fator</th></tr>{crit_rows}</table>")
             + "</section>")

    # 3. Problemas encontrados
    def _probs(lst, cls, titulo):
        if not lst:
            return f"<p class='muted'>{titulo}: nenhum.</p>"
        cards = "".join(
            f"<div class='laudo {cls}'><b>{p['dimensao']}</b><div class='row'><div class='k'>Descrição</div><div>{p['descricao']}</div></div>"
            f"<div class='row'><div class='k'>Impacto</div><div>{p['impacto']}</div></div>"
            f"<div class='row'><div class='k'>Recomendação</div><div>{p['recomendacao']}</div></div></div>"
            for p in lst)
        return f"<h3>{titulo}</h3>{cards}"
    H.append(f"<section id='problemas' class='card'><h2>3. Problemas encontrados</h2>"
             + _probs(interp["problemas"]["criticos"], "vermelho", "🔴 Problemas críticos")
             + _probs(interp["problemas"]["atencao"], "amarelo", "🟡 Pontos de atenção")
             + f"<p class='muted'>🟢 Sem problemas: "
               f"{', '.join(p['dimensao'] for p in interp['problemas']['sem']) or '—'}.</p></section>")

    # 4. Próximos passos
    passos = "".join(f"<li>{p}</li>" for p in interp["proximos_passos"])
    H.append(f"<section id='passos' class='card'><h2>4. Próximos passos</h2>"
             f"<ul class='clean'>{passos}</ul></section>")

    def _sec_card(sid, titulo, chave, extra_html=""):
        s = sec[chave]
        conc = CONCEITO.get(chave)
        conc_html = (f"<div class='concept'><b>O que é:</b> {conc[0]}<br><b>Por que importa:</b> {conc[1]}</div>"
                     if conc else "")
        blocos = "".join(_laudo(b) for b in s.get("blocos", []))
        return (f"<section id='{sid}' class='card'><h2>{titulo} {_badge(s['status'])}</h2>"
                f"{conc_html}{blocos}{extra_html}</section>")

    # 5. Integridade
    resumo_tab = pd.DataFrame([
        {"Conjunto": ROTULOS.get(k, k), "n": d["n_total"], "presenças": d["n_presencas"],
         "ausências": d["n_ausencias"], "contínuas": d["n_continuas"],
         "categóricas": d["n_categoricas"], "faltantes": d["faltantes_total"],
         "duplicados": d["duplicados"]} for k, d in integ.items()])
    H.append(_sec_card("integridade", "5. Integridade dos dados", "integridade",
                       _df_html(resumo_tab.set_index("Conjunto"), casas=0)))

    # 6. Descritiva
    pv = sec["descritiva"]["por_variavel"]
    dl = "".join(f"<div class='laudo {v['status']}'><b>{L.nome_legivel(var)}</b> "
                 f"{_emoji(v['status'])}<br>{v['texto']}</div>" for var, v in pv.items())
    tabs = "".join(_collapsible(f"Tabela — {ROTULOS.get(k,k)}", _df_html(resultados['descritiva'][k]))
                   for k in resultados["descritiva"])
    H.append(_sec_card("descritiva", "6. Estatística descritiva", "descritiva", dl + tabs))

    # 7. Distribuições
    figs = figuras.get("distribuicoes", {})
    dblocks = []
    for var in qc.continuas:
        v = sec["distribuicoes"]["por_variavel"].get(var, {})
        dblocks.append(f"<div class='laudo {v.get('status',L.VERDE)}'><b>{L.nome_legivel(var)}</b> "
                       f"{_emoji(v.get('status',L.VERDE))}<br>{v.get('texto','')}</div>"
                       + _img(plots.b64(figs.get(var)), var,
                              "Presenças (azul) × pseudoausências (vermelho)."))
    H.append(_sec_card("distribuicoes", "7. Distribuições das variáveis", "distribuicoes",
                       "".join(dblocks)))

    # 8. Correlação
    top = resultados["correlacao"]["completo"]["top"][:15]
    top_tab = _df_html(pd.DataFrame(top)) if top else ""
    grad = sec["correlacao"].get("gradientes", [])
    grad_html = ("<h3>Gradientes ambientais redundantes</h3><ul class='clean'>" +
                 "".join(f"<li>{' e '.join(L.nome_legivel(x) for x in g)} — representam o mesmo gradiente</li>" for g in grad) +
                 "</ul>") if grad else ""
    H.append(_sec_card("correlacao", "8. Correlação", "correlacao",
                       _img(plots.b64(figuras.get("heatmap")), "Mapa de correlação (Pearson)",
                            "Azul = positiva, vermelho = negativa; cor forte = |r| alto.")
                       + grad_html + _collapsible("Maiores correlações (top 15)", top_tab)))

    # 9. VIF
    H.append(_sec_card("vif", "9. Multicolinearidade (VIF)", "vif",
                       _collapsible("Tabela VIF (conjunto completo)", _df_html(resultados["vif"]["completo"]))))

    # 10. Outliers
    H.append(_sec_card("outliers", "10. Outliers", "outliers",
                       "".join(_collapsible(f"Outliers — {ROTULOS.get(k,k)}",
                               _df_html(resultados["outliers"][k]["por_var"])) for k in resultados["outliers"])))

    # 11. Faltantes
    H.append(_sec_card("faltantes", "11. Valores ausentes", "faltantes",
                       _collapsible("Detalhe por variável/conjunto", _df_html(pd.DataFrame(linhas_miss)))))

    # 12. Categóricas — SEMPRE com a CATEGORIA (nome da classe), não só o código.
    from env_providers import legendas_uso_solo as leg
    cat_extra = []
    fontes_vistas = set()
    for k, dd in resultados["categoricas"].items():
        for var, info in dd.items():
            codes = list(info["freq_abs"].keys())
            tab = pd.DataFrame({
                "classe": [leg.nome_classe(var, c) or "—" for c in codes],
                "freq_abs": [info["freq_abs"][c] for c in codes],
                "freq_rel": [info["freq_rel"][c] for c in codes],
            }, index=[f"cód. {c}" for c in codes])
            tab.index.name = "código"
            cat_extra.append(_collapsible(
                f"{ROTULOS.get(k,k)} — {L.nome_legivel(var)} (classes presentes; "
                f"Shannon {info['shannon']})", _df_html(tab)))
            fontes_vistas.add(var)
    # Referência: legenda OFICIAL completa de cada fonte de uso do solo presente.
    for var in fontes_vistas:
        legd = leg.legenda_da_coluna(var)
        if legd:
            ref = pd.DataFrame({"classe": list(legd.values())},
                               index=[f"cód. {c}" for c in legd.keys()])
            ref.index.name = "código"
            cat_extra.append(_collapsible(
                f"📖 Legenda oficial completa — {leg.fonte_da_coluna(var)}", _df_html(ref)))
    H.append(_sec_card("categoricas", "12. Variáveis categóricas", "categoricas", "".join(cat_extra)))

    # 13. PCA
    H.append(_sec_card("pca", "13. PCA", "pca",
                       _img(plots.b64(figuras.get("pca")), "PCA — Scree e PC1×PC2",
                            "Variância por componente + separação presença×ausência.")))

    # 14. Cobertura
    amp = resultados["cobertura"]["por_conjunto"]["completo"]["amplitude"]
    H.append(_sec_card("cobertura", "14. Cobertura ambiental", "cobertura",
                       _collapsible("Amplitude por variável", _df_html(amp))))

    # 15. Interpretação ecológica
    eco = interp["ecologica"]
    eco_cards = "".join(
        f"<div class='laudo verde'><b>{v['nome']}</b> <span class='muted'>({v['faixa']})</span>"
        f"<br>{v['texto']}</div>" for v in eco.values())
    H.append(f"<section id='ecologica' class='card'><h2>15. Interpretação ecológica</h2>"
             f"<div class='concept'>Traduz os números em ECOLOGIA: a faixa ambiental preferida "
             f"pela espécie (nicho realizado), a partir das ocorrências.</div>"
             f"{eco_cards or '<p class=muted>(sem variáveis contínuas reconhecidas)</p>'}</section>")

    # 16. Conclusão geral
    H.append(f"<section id='conclusao' class='card'><h2>16. Conclusão geral</h2>"
             f"<div class='score-wrap'><div class='stars'>{r['estrelas_txt']}</div>"
             f"<div class='classif'>{r['score']:.0f}/100 — {r['classificacao']}</div></div>"
             f"<div class='alert {concl_cls}'>{interp['conclusao_executiva']}</div>"
             f"<p class='muted'>Laudo gerado automaticamente pelo QC ambiental (processo.py). "
             f"Não modifica os dados — é diagnóstico.</p></section>")

    body = f"<div class='layout'>{nav}<main>{''.join(H)}</main></div>" \
           f"<div id='lightbox'><img alt='ampliado'></div>"
    html = (f"<!doctype html><html lang='pt-br'><head><meta charset='utf-8'>"
            f"<meta name='viewport' content='width=device-width, initial-scale=1'>"
            f"<title>Laudo QC — {qc.especie}</title><style>{_CSS}</style></head>"
            f"<body>{body}<script>{_JS}</script></body></html>")
    (out_dir / qc.arq("environmental_summary.html")).write_text(html, encoding="utf-8")

    # JSON (enriquecido) + MD
    payload = {
        "especie": qc.especie, "arquivo": qc.csv_path.name,
        "sdm_readiness": _json_safe(readiness_res),
        "resumo_executivo": _json_safe(interp["resumo_executivo"]),
        "conclusao_executiva": interp["conclusao_executiva"],
        "problemas": _json_safe(interp["problemas"]),
        "proximos_passos": interp["proximos_passos"],
        "interpretacao_ecologica": _json_safe(interp["ecologica"]),
        "integridade": _json_safe(integ),
        "descritiva": _json_safe(resultados["descritiva"]),
        "correlacao_top": _json_safe(resultados["correlacao"]["completo"]["top"][:30]),
        "vif": _json_safe(resultados["vif"]),
    }
    (out_dir / qc.arq("environmental_summary.json")).write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    md = [f"# Laudo de Qualidade — {qc.especie}", "",
          f"## SDM Readiness Score: {r['estrelas_txt']} {r['score']:.0f}/100 — {r['classificacao']}",
          "", f"**Conclusão:** {interp['conclusao_executiva']}", "",
          "## Resumo executivo", "",
          "| Item | Situação | Impacto |", "|---|---|---|"]
    for x in interp["resumo_executivo"]:
        md.append(f"| {x['item']} | {x['situacao']} | {x['impacto']} |")
    md += ["", "## Próximos passos", ""] + [f"- {p}" for p in interp["proximos_passos"]]
    md += ["", "Laudo completo e interpretado: `environmental_summary.html`."]
    (out_dir / qc.arq("environmental_summary.md")).write_text("\n".join(md), encoding="utf-8")

    return {"html": out_dir / qc.arq("environmental_summary.html"),
            "json": out_dir / qc.arq("environmental_summary.json"),
            "md": out_dir / qc.arq("environmental_summary.md")}
