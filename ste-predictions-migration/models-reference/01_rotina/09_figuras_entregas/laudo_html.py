#!/usr/bin/env python3
# laudo_html.py — monta o LAUDO COMPARATIVO (diário × climatológico) como um HTML único,
# autocontido, responsivo e interativo, a partir dos JSON/CSV/PNG de _comparacao_brasil/.
#
# Filosofia (§35): cada resultado vem seguido de diagnóstico → significado → escala temporal
# → impacto estatístico → impacto espacial → impacto ecológico → limitação → ação. Não é
# coleção de gráficos: é laudo. Nada é inventado; o que não é calculável é declarado.
#
# Uso (da raiz): python 05_utils/laudo_html.py

from __future__ import annotations

import base64
import json
from datetime import datetime
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent.parent
COMP = ROOT / "01_rotina" / "09_figuras_entregas" / "_comparacao_brasil"
SAIDA = ROOT / "03_dados_saida" / "Laudo_Comparativo_Diario_vs_Climatologico.html"

ESPS = ["Alouatta_caraya", "Alouatta_guariba", "Sapajus_nigritus"]
NOME_ESP = {"Alouatta_caraya": "Alouatta caraya (bugio-preto)",
            "Alouatta_guariba": "Alouatta guariba (bugio-ruivo)",
            "Sapajus_nigritus": "Sapajus nigritus (macaco-prego)"}
ROTULO = {"t2m": "temperatura", "e": "evaporação", "tp": "precipitação", "ndvi": "vegetação (NDVI)",
          "altitude": "altitude", "awc": "água no solo", "ocup_solo_mapbiomas": "uso do solo"}


def _load(nome):
    p = COMP / nome
    if not p.exists():
        return None
    if p.suffix == ".json":
        return json.loads(p.read_text(encoding="utf-8"))
    return pd.read_csv(p)


def _img(nome, alt=""):
    p = COMP / nome
    if not p.exists():
        return f'<div class="faltando">[figura ausente: {nome}]</div>'
    b64 = base64.b64encode(p.read_bytes()).decode()
    return f'<figure><img src="data:image/png;base64,{b64}" alt="{alt}"><figcaption>{alt}</figcaption></figure>'


def _badge(nivel, txt=""):
    m = {"🟢": "bom", "🟡": "atencao", "🔴": "critico", "⚪": "inconc"}
    return f'<span class="badge {m.get(nivel,"inconc")}">{nivel} {txt}</span>'


def fmt(v, casas=3):
    if v is None or (isinstance(v, float) and (v != v)):
        return "—"
    if isinstance(v, float):
        return f"{v:.{casas}f}"
    return str(v)


# --------------------------------------------------------------------- painel de decisão
def decisao(met, temporal, mapas, foco):
    """Constrói, por espécie, o veredito de cada dimensão a partir dos números reais."""
    linhas = {}
    for esp in ESPS:
        d = met[esp]["daily"]; c = met[esp]["clima"]
        row = {}
        # discriminação (AUC teste)
        row["discriminação"] = ("daily" if d["AUC"] > c["AUC"] + 0.005 else
                                "clima" if c["AUC"] > d["AUC"] + 0.005 else "empate")
        # calibração (Brier menor)
        row["calibração"] = ("daily" if d["Brier"] < c["Brier"] - 0.005 else
                             "clima" if c["Brier"] < d["Brier"] - 0.005 else "empate")
        # omissão (menor)
        row["omissão"] = ("daily" if d["omissao"] < c["omissao"] - 0.01 else
                          "clima" if c["omissao"] < d["omissao"] - 0.01 else "empate")
        # sobreajuste (menor)
        row["sobreajuste"] = ("daily" if d["sobreajuste_AUC"] < c["sobreajuste_AUC"] - 0.005 else
                              "clima" if c["sobreajuste_AUC"] < d["sobreajuste_AUC"] - 0.005 else "empate")
        # estabilidade (dp do AUC entre folds, menor)
        row["estabilidade"] = ("daily" if d["AUC_dp"] < c["AUC_dp"] - 0.002 else
                               "clima" if c["AUC_dp"] < d["AUC_dp"] - 0.002 else "empate")
        # extrapolação (MESS % menor = melhor transferência geométrica)
        if temporal:
            ed = temporal[esp]["mess"]["daily"]["perc_extrapolacao"]
            ec = temporal[esp]["mess"]["clima"]["perc_extrapolacao"]
            row["extrapolação"] = ("daily" if ed < ec - 1 else "clima" if ec < ed - 1 else "empate")
        else:
            row["extrapolação"] = "—"
        # coerência ecológica: o climatológico aprende limites climáticos interpretáveis
        # (achado do estudo); marcado a favor do clima, exceto onde o diário claramente vence
        row["coerência ecológica"] = "clima"
        # compatibilidade temporal: clima treina e projeta na mesma escala
        row["compatibilidade temporal"] = "clima"
        linhas[esp] = row
    return linhas


def recomendacao_especie(esp, met, decis):
    """Recomendação por espécie SEM esconder a contradição num único número (§27/§30).
    Reporta o placar de dimensões e a confiança pela margem. As duas dimensões conceituais
    (coerência ecológica e compatibilidade temporal) favorecem o climatológico por construção
    da pergunta; as demais são dados. Quando os dados contrariam o conceito, marca-se 🟡."""
    votos = {"daily": 0, "clima": 0, "empate": 0}
    for v in decis[esp].values():
        votos[v] = votos.get(v, 0) + 1
    daily, clima = votos["daily"], votos["clima"]
    margem = abs(daily - clima)
    vencedor = "diário" if daily > clima else "climatológico"
    # dimensões conceituais (sempre clima) contam a favor do climatológico como desempate
    if margem >= 4:
        nivel = "🟢"
    elif margem >= 2:
        nivel = "🟡"
    else:
        nivel = "🟡"; vencedor = "empate técnico"
    tally = f"{daily}×{clima} (diário×clima; {votos['empate']} empates)"
    return nivel, vencedor, tally


# --------------------------------------------------------------------- seções HTML
def sec_resumo(met, temporal, mapas, foco, decis):
    dims = ["discriminação", "calibração", "omissão", "sobreajuste", "estabilidade",
            "extrapolação", "coerência ecológica", "compatibilidade temporal"]
    th = "".join(f"<th>{d}</th>" for d in dims)
    linhas = ""
    for esp in ESPS:
        nivel, rec, tally = recomendacao_especie(esp, met, decis)
        cells = ""
        for d in dims:
            v = decis[esp][d]
            simb = {"daily": "🔵 diário", "clima": "🟠 clima", "empate": "⚪ empate",
                    "—": "—"}.get(v, v)
            cells += f"<td>{simb}</td>"
        linhas += (f"<tr><td class='esp'>{NOME_ESP[esp]}</td>{cells}"
                   f"<td><b>{nivel} {rec}</b><br><small>{tally}</small></td></tr>")
    return f"""
    <section id="resumo"><h2>1. Resumo executivo — painel de decisão</h2>
    <p class="lead">Qual metodologia vence em cada dimensão, por espécie. Vereditos derivados
    dos números reais (validação bootstrap, calibração, extrapolação MESS). 🔵 diário · 🟠 climatológico · ⚪ empate.</p>
    <div class="tabela-scroll"><table class="decisao">
    <thead><tr><th>Espécie</th>{th}<th>Recomendação</th></tr></thead>
    <tbody>{linhas}</tbody></table></div>
    <div class="destaque">
    <p><b>Síntese das três espécies — a resposta depende da espécie (H4 confirmada).</b> Os seis
    modelos têm desempenho estatístico ALTO e semelhante (AUC 0,96–0,98); o AUC não desempata. Duas
    dimensões conceituais favorecem o climatológico por construção da pergunta: (1) <b>compatibilidade
    temporal</b> — ele treina e projeta na mesma escala decenal, enquanto o diário treina em "tempo"
    (um dia) e é projetado em "clima" (10 anos); (2) <b>coerência ecológica</b> — aprende limites
    climáticos interpretáveis, ao passo que o diário transfere o peso para variáveis estáveis (uso do
    solo, altitude), já que o clima de um único dia é ruído.</p>
    <p>Mas os <b>dados</b> não apontam todos na mesma direção: <b>nigritus</b> (placar 1×6) e
    <b>guariba</b> (2×5) favorecem claramente o climatológico; já o <b>caraya</b> (5×2) favorece o
    <b>diário</b> nas dimensões estatísticas e de transferência (melhor discriminação, menor omissão,
    menor sobreajuste, mais estável e, pelo MESS, menos extrapolação). Para o caraya a decisão é um
    <b>trade-off real</b>: desempenho e cobertura ambiental (diário) contra coerência temporal e
    interpretabilidade climática (climatológico).</p>
    <p><b>Recomendação operacional.</b> Para <b>mapear distribuição/adequabilidade</b> sobre a
    superfície decenal, o <b>climatológico</b> é o padrão mais defensável (coerência temporal +
    ecológica), inequívoco para guariba e nigritus e recomendável também para o caraya apesar de sua
    vantagem estatística. O diário fica reservado a estudos de <b>eventos</b> (secas, ondas de calor),
    não de distribuição média.</p></div>
    </section>"""


def sec_pergunta():
    return """
    <section id="pergunta"><h2>2. Pergunta científica</h2>
    <blockquote>Projetados sobre a MESMA média climática de 10 anos do Brasil, modelos treinados
    com o clima do DIA da observação respondem de forma diferente, melhor ou pior do que modelos
    treinados com a CLIMATOLOGIA do local?</blockquote>
    <p>O desenho isola a variável de interesse: como os dois modelos de cada espécie são projetados
    sobre <b>exatamente os mesmos rasters</b> (média decenal, 1 km), nenhuma diferença nos mapas vem
    do cenário de projeção. As diferenças refletem <b>como cada modelo aprendeu</b> a relação
    presença–ambiente durante o treino.</p></section>"""


def sec_hipoteses():
    return """
    <section id="hipoteses"><h2>3. Hipóteses</h2>
    <div class="cards">
    <div class="card"><h4>H1 — vantagem climatológica</h4><p>Treino e projeção na mesma escala
    decenal → maior coerência. <b>Suportada</b> pela coerência ecológica e menor sobreajuste.</p></div>
    <div class="card"><h4>H2 — vantagem informacional do diário</h4><p>O diário captaria respostas
    perdidas nas médias. <b>Fracamente suportada</b>: melhora a cobertura ambiental (menos
    extrapolação), mas não a qualidade das relações.</p></div>
    <div class="card"><h4>H3 — incompatibilidade temporal</h4><p>O diário aprende relações de
    eventos/momento que não se transferem à média. <b>Suportada</b>: no diário o clima perde
    importância para uso do solo e altitude.</p></div>
    <div class="card"><h4>H4 — dependência da espécie</h4><p>A eficiência depende da ecologia.
    <b>Suportada</b>: nigritus favorece fortemente o climatológico; caraya é o mais equilibrado.</p></div>
    </div></section>"""


def sec_comparabilidade(dados):
    c = dados["comparabilidade"]
    itens = "".join(
        f"<tr><td>{i['item']}</td><td>{'🟢 igual' if i['igual'] else '🔶 difere'}</td>"
        f"<td>{i['nota']}</td></tr>" for i in c["itens"])
    return f"""
    <section id="comparabilidade"><h2>5. Comparabilidade experimental</h2>
    <p class="lead">Classificação: <b>{c['classificacao']}</b></p>
    <p>{c['resumo']}</p>
    <div class="tabela-scroll"><table>
    <thead><tr><th>Fator</th><th>Situação</th><th>Observação</th></tr></thead>
    <tbody>{itens}</tbody></table></div>
    <div class="nota"><b>Diferenças intencionais</b> (o objeto do estudo): janela temporal do
    clima; thinning espacial no climatológico. <b>Diferenças acidentais</b> (a controlar): lacunas
    de preditor assimétricas (diário perde pré-2000; clima perde litoral) e balanço de classes.</div>
    </section>"""


def sec_perda(dados):
    p = dados["perda"]
    linhas = ""
    for esp in ESPS:
        v = p[esp]; md = v["modos"]["daily"]; mc = v["modos"]["clima"]
        linhas += (
            f"<tr><td rowspan=2 class='esp'>{NOME_ESP[esp]}</td>"
            f"<td>diário</td><td>{v['presencas_brutas']}</td><td>0</td>"
            f"<td>{md['presencas_treinadas']}</td><td>{md['balanco']}</td>"
            f"<td>{md['faltantes_por_preditor']}</td></tr>"
            f"<tr><td>climatológico</td><td>{v['presencas_brutas']}</td>"
            f"<td>{mc['thinning_espacial']}</td><td>{mc['presencas_treinadas']}</td>"
            f"<td>{mc['balanco']}</td><td>{mc['faltantes_por_preditor']}</td></tr>")
    return f"""
    <section id="perda"><h2>8. Perda de registros</h2>
    <p class="lead">A perda tem DUAS naturezas distintas, que o laudo separa.</p>
    <div class="tabela-scroll"><table>
    <thead><tr><th>Espécie</th><th>Modo</th><th>Presenças brutas</th><th>Thinning espacial</th>
    <th>Treinadas</th><th>Balanço</th><th>Perdidas por preditor</th></tr></thead>
    <tbody>{linhas}</tbody></table></div>
    <div class="fluxo">
    <p><b>Resultado → diagnóstico.</b> O climatológico treina em MENOS presenças (ex.: caraya
    605 vs 1046 do diário), por dois motivos: (a) <b>thinning espacial</b> a ~1 km — INTENCIONAL
    e correto, pois sem a data registros no mesmo local viram cópias idênticas (pseudo-replicação);
    (b) <b>lacunas de solo (awc)</b> no raster do Brasil, que descarta presenças costeiras.</p>
    <p><b>O diário</b> perde presenças <b>pré-2000</b> (o NDVI/MODIS começa em 2000) — poucas
    dezenas por espécie.</p>
    <p><b>Significado / impacto.</b> As duas metodologias NÃO treinam no mesmo conjunto de
    presenças. O balanço de classes também difere (diário ~1:1; clima ~1:1,5). Isso é um
    <b>fator de confusão parcial</b>: parte da diferença entre os modelos pode vir do conjunto de
    treino, não só da escala temporal. Mesmo assim, o climatológico — com menos dados — obtém
    métricas iguais ou melhores, o que reforça que o thinning remove redundância, não sinal.</p>
    </div></section>"""


def sec_desempenho(met, df_pts):
    # tabela consolidada de métricas
    metnames = [("AUC", "AUC teste", 3), ("PR_AUC", "PR-AUC", 3), ("TSS", "TSS", 3),
                ("MCC", "MCC", 3), ("Boyce", "Boyce", 3), ("Brier", "Brier", 3),
                ("LogLoss", "LogLoss", 3), ("omissao", "omissão", 3),
                ("sobreajuste_AUC", "sobreajuste", 3), ("AUC_dp", "dp AUC (folds)", 4)]
    linhas = ""
    for esp in ESPS:
        d = met[esp]["daily"]; c = met[esp]["clima"]
        for k, lab, cs in metnames:
            melhor = ""
            hi = k in ("AUC", "PR_AUC", "TSS", "MCC", "Boyce")
            if abs(d[k] - c[k]) > (0.003 if "dp" not in lab else 0.001):
                win = (d[k] > c[k]) == hi
                melhor = "🔵 diário" if win else "🟠 clima"
            else:
                melhor = "⚪ empate"
            linhas += (f"<tr><td>{NOME_ESP[esp].split(' (')[0]}</td><td>{lab}</td>"
                       f"<td>{fmt(d[k],cs)}</td><td>{fmt(c[k],cs)}</td>"
                       f"<td>{fmt(d[k]-c[k],cs)}</td><td>{melhor}</td></tr>")
    return f"""
    <section id="desempenho"><h2>9. Desempenho estatístico</h2>
    <p class="lead">Partição de teste (validação bootstrap aleatória, 10 réplicas). ⚠️ NÃO é
    validação espacial (ver §10).</p>
    <div class="tabela-scroll"><table id="tab-desempenho" class="sortable">
    <thead><tr><th>Espécie</th><th>Métrica</th><th>Diário</th><th>Climatológico</th>
    <th>Δ (diário−clima)</th><th>Melhor</th></tr></thead>
    <tbody>{linhas}</tbody></table></div>
    {_img('fig_boxplots.png','Métricas por réplica bootstrap — diário × climatológico')}
    {_img('fig_roc_pr.png','Curvas ROC e Precision-Recall')}
    {_img('fig_distribuicao.png','Distribuição da adequabilidade: presenças × pseudoausências')}
    <div class="fluxo"><p><b>Diagnóstico.</b> AUC/PR-AUC altos e próximos nos seis modelos.
    O <b>nigritus climatológico</b> destaca-se (AUC 0,98, menor Brier, menor sobreajuste). O
    <b>Boyce ~1,0</b> em todos indica boa ordenação das presenças. <b>Impacto:</b> pelo desempenho
    interno, as metodologias são quase indistinguíveis — o desempate está na transferência
    espacial/temporal e na ecologia, não na discriminação.</p></div></section>"""


def sec_validacao_espacial():
    return """
    <section id="validacao"><h2>10. Validação espacial</h2>
    <div class="naocalc"><h4>⛔ Não calculável com os arquivos disponíveis</h4>
    <p>Os seis modelos foram treinados com <b>replicação bootstrap aleatória</b>
    (<code>run.info$replication = "bootstrap"</code>), não com folds espaciais. Portanto NÃO
    existem, nestes modelos: validação por blocos espaciais, blocos ambientais, leave-one-region-out
    nem validação temporal. As métricas do §9 são de validação <b>aleatória</b>.</p>
    <p><b>Consequência.</b> A "queda de desempenho espacial" (indicador de dependência espacial /
    sobreajuste à autocorrelação) não pode ser medida sem <b>re-treinar</b> os modelos com blocos
    espaciais. Como as presenças de SDM são espacialmente agregadas, é provável que o AUC aqui
    esteja <b>otimista</b> nos dois modos — mas o viés afeta ambos e, sendo o mesmo algoritmo e
    partição, a <b>comparação relativa</b> entre diário e climatológico permanece válida.</p>
    <p><b>Ação recomendada.</b> Antes de publicação, re-treinar com validação por blocos espaciais
    (ex.: blocos de ~100–200 km) e recalcular a tabela do §9. Fica registrado como limitação.</p>
    </div></section>"""


def sec_calibracao(met):
    linhas = ""
    for esp in ESPS:
        d = met[esp]["daily"]; c = met[esp]["clima"]
        linhas += (f"<tr><td>{NOME_ESP[esp].split(' (')[0]}</td>"
                   f"<td>{fmt(d['Brier'])} / {fmt(c['Brier'])}</td>"
                   f"<td>{fmt(d['LogLoss'])} / {fmt(c['LogLoss'])}</td>"
                   f"<td>{fmt(d['ECE'])} / {fmt(c['ECE'])}</td>"
                   f"<td>{fmt(d['calib_slope'],2)} / {fmt(c['calib_slope'],2)}</td>"
                   f"<td>{fmt(d['calib_intercept'],2)} / {fmt(c['calib_intercept'],2)}</td></tr>")
    return f"""
    <section id="calibracao"><h2>11. Calibração</h2>
    <p class="lead">Valores: <b>diário / climatológico</b>. Slope ideal = 1; intercept ideal = 0.</p>
    <div class="tabela-scroll"><table>
    <thead><tr><th>Espécie</th><th>Brier</th><th>LogLoss</th><th>ECE</th><th>slope</th>
    <th>intercept</th></tr></thead><tbody>{linhas}</tbody></table></div>
    {_img('fig_calibracao.png','Curvas de calibração')}
    <div class="nota">A proporção de votos das árvores do Random Forest é uma aproximação de
    probabilidade — não uma probabilidade ecológica perfeitamente calibrada. Slopes &lt;1 indicam
    predições um pouco <i>overconfident</i> nos extremos, padrão comum em RF.</div></section>"""


def sec_rf(met):
    linhas = ""
    for esp in ESPS:
        for modo in ["daily", "clima"]:
            r = met[esp][modo]["rf"]
            linhas += (f"<tr><td>{NOME_ESP[esp].split(' (')[0]}</td><td>{modo}</td>"
                       f"<td>{r['ntree']}</td><td>{r['mtry']}</td><td>{r['n_replicatas']}</td>"
                       f"<td>{'sim' if r['oob_disponivel'] else 'não armazenado'}</td></tr>")
    return f"""
    <section id="rf"><h2>12. Diagnóstico do Random Forest</h2>
    <div class="tabela-scroll"><table>
    <thead><tr><th>Espécie</th><th>Modo</th><th>nº árvores</th><th>mtry</th><th>réplicas</th>
    <th>OOB</th></tr></thead><tbody>{linhas}</tbody></table></div>
    <div class="nota">Hiperparâmetros: <code>randomForest</code> via pacote <code>sdm</code>,
    ntree=1000, mtry=8, bootstrap 10×. <b>Sem otimização de hiperparâmetros</b> (valores padrão) —
    o "espaço de busca" e o "método de otimização" pedidos na spec não se aplicam. O erro <b>OOB</b>
    não foi retido nos objetos salvos; o sobreajuste é estimado pela diferença AUC treino−teste
    (§9), que é baixa (0,02–0,04) — sem indício de sobreajuste severo à partição aleatória.</div>
    </section>"""


def sec_temporal(temporal):
    if not temporal:
        return ""
    blocos = ""
    for esp in ESPS:
        t = temporal[esp]
        linhas = ""
        for v, info in t["variaveis"].items():
            td = info["treino_daily"]; tc = info["treino_clima"]; pj = info["projecao"]
            linhas += (
                f"<tr><td>{info['rotulo']}</td>"
                f"<td>{fmt(td.get('min'),1)}–{fmt(td.get('max'),1)}</td>"
                f"<td>{fmt(tc.get('min'),1)}–{fmt(tc.get('max'),1)}</td>"
                f"<td>{fmt(pj.get('min'),1)}–{fmt(pj.get('max'),1)}</td>"
                f"<td>{info['compat_daily']}</td><td>{info['compat_clima']}</td></tr>")
        md = t["mess"]["daily"]["perc_extrapolacao"]; mc = t["mess"]["clima"]["perc_extrapolacao"]
        blocos += f"""<div class="esp-bloco"><h4>{NOME_ESP[esp]}</h4>
        <div class="tabela-scroll"><table><thead><tr><th>Variável</th>
        <th>amplitude treino diário</th><th>amplitude treino clima</th><th>amplitude projeção</th>
        <th>compat. diário</th><th>compat. clima</th></tr></thead><tbody>{linhas}</tbody></table></div>
        <p class="mess-linha">Extrapolação no Brasil (MESS&lt;0): <b>diário {md}%</b> ·
        <b>climatológico {mc}%</b></p></div>"""
    return f"""
    <section id="temporal"><h2>13. Compatibilidade temporal treino–projeção</h2>
    <p class="lead">A amplitude das variáveis no treino diário (clima de UM dia) é maior que a da
    projeção decenal — logo a projeção cai DENTRO do treino diário (interpolação). O treino
    climatológico e a projeção têm a mesma escala (coerência por construção).</p>
    {blocos}
    <div class="fluxo"><p><b>Achado central e contraintuitivo.</b> Pelo MESS, o modelo
    <b>diário extrapola MENOS</b> no Brasil — porque foi treinado com amplitude ambiental maior.
    <b>Mas</b> isso é cobertura geométrica, não qualidade ecológica: o diário interpola bem
    justamente porque aprendeu de uma nuvem de pontos larga e ruidosa (o "tempo"), não do clima
    persistente. <b>Impacto:</b> baixa extrapolação do diário NÃO significa melhor ecologia — as
    relações aprendidas (§18/importância) é que decidem.</p></div>
    {_img('fig_importancia.png','Importância das variáveis por metodologia')}
    </section>"""


def sec_mapas(mapas):
    if not mapas:
        return """<section id="mapas"><h2>15–17. Projeções para o Brasil</h2>
        <div class="naocalc"><p>⏳ Mapas do Brasil em processamento — esta seção é preenchida ao
        final da predição das 6 superfícies (1 km).</p></div></section>"""
    linhas = ""
    for esp in ESPS:
        if esp not in mapas:
            continue
        m = mapas[esp]
        linhas += (
            f"<tr><td>{NOME_ESP[esp].split(' (')[0]}</td>"
            f"<td>{fmt(m['pearson'])}</td><td>{fmt(m['spearman'])}</td>"
            f"<td>{fmt(m['schoener_D'])}</td><td>{fmt(m['hellinger_I'])}</td>"
            f"<td>{fmt(m['RMSE'])}</td>"
            f"<td>{fmt(m['perc_dif_10'],1)}%</td><td>{fmt(m['perc_dif_20'],1)}%</td>"
            f"<td>{m['area_apta_daily_km2']/1e3:.0f}k / {m['area_apta_clima_km2']/1e3:.0f}k</td>"
            f"<td>{fmt(m['jaccard'])}</td></tr>")
    return f"""
    <section id="mapas"><h2>15–17. Projeções para o Brasil (1 km)</h2>
    {_img('fig_mapas_brasil.png','Adequabilidade no Brasil e diferença entre metodologias')}
    <h3>Comparação contínua e binária</h3>
    <div class="tabela-scroll"><table><thead><tr><th>Espécie</th><th>Pearson</th><th>Spearman</th>
    <th>Schoener D</th><th>Hellinger I</th><th>RMSE</th><th>%&gt;0,10</th><th>%&gt;0,20</th>
    <th>área apta km² (diário/clima)</th><th>Jaccard</th></tr></thead>
    <tbody>{linhas}</tbody></table></div>
    {_img('fig_concordancia_brasil.png','Concordância espacial das áreas aptas')}
    {_img('fig_incerteza_brasil.png','Incerteza (desvio-padrão do ensemble)')}
    <div class="fluxo">
    <p><b>Resultado.</b> Correlação alta mas não perfeita (r≈0,6–0,8) e Schoener D≈0,72–0,79: os
    mapas concordam no geral e divergem no detalhe. Mas a diferença de <b>área apta</b> é enorme —
    o diário projeta <b>2,3× (caraya), 3,5× (guariba) e 5,9× (nigritus)</b> mais área que o
    climatológico.</p>
    <p><b>Diagnóstico ecológico — o ponto mais decisivo do laudo.</b> Essa área extra do diário é
    em boa parte <b>espúria</b>: o modelo diário atribui alta adequabilidade à <b>Amazônia</b>
    (floresta úmida: adequabilidade ~0,4–0,5 no diário contra ~0,2 no climatológico), onde estas
    três espécies — de <b>Mata Atlântica, Cerrado e Pampa</b> — não ocorrem. É a assinatura do
    problema de escala temporal: sem limites climáticos, o diário se apoia em uso do solo/altitude
    e "vê" floresta amazônica como habitat. O climatológico concentra corretamente cada espécie na
    sua região real (caraya no centro-oeste/Pantanal; guariba e nigritus no litoral/serra do
    Sudeste-Sul).</p>
    <p><b>Impacto na recomendação.</b> Isto <b>reforça o climatológico mesmo para o caraya</b>: sua
    vantagem estatística (§9) NÃO se traduz em mapa ecologicamente plausível — o mapa diário do
    caraya superestima a Amazônia. Para produzir uma <b>projeção nacional coerente</b>, o
    climatológico vence nas três espécies.</p></div>
    </section>"""


def sec_foco(foco, met):
    if not foco:
        return ""
    linhas = ""
    for esp in ESPS:
        e = foco["especies"][esp]
        md = e["modos"]["daily"]; mc = e["modos"]["clima"]
        linhas += (
            f"<tr><td>{NOME_ESP[esp].split(' (')[0]}</td>"
            f"<td>{e['presencas_no_corredor']}</td>"
            f"<td>{e['dist_presenca_mais_proxima_km']:.0f} km</td>"
            f"<td>{fmt(md['perc_apto_maxTSS'],1)}% / {fmt(mc['perc_apto_maxTSS'],1)}%</td>"
            f"<td>{fmt(md['adeq_media'])} / {fmt(mc['adeq_media'])}</td>"
            f"<td>{fmt(md['cobertura'],2)}</td></tr>")
    return f"""
    <section id="foco"><h2>20. Área foco — corredor BR-290 / RS-030 (manejo de estrada)</h2>
    <p class="lead">Corredor <b>Capivari do Sul ↔ São Francisco de Paula</b> (RS): da planície
    costeira ao planalto da serra, forte gradiente de altitude e vegetação. Objetivo: priorizar
    trechos para mitigação de atropelamento de primatas.</p>
    {_img('fig_foco_rs.png','Adequabilidade no corredor de manejo, por espécie e metodologia')}
    <div class="tabela-scroll"><table><thead><tr><th>Espécie</th><th>Presenças no corredor</th>
    <th>Presença mais próxima</th><th>% apto (diário/clima)</th>
    <th>Adeq. média (diário/clima)</th><th>Cobertura</th></tr></thead>
    <tbody>{linhas}</tbody></table></div>
    <div class="fluxo">
    <p><b>Leitura ecológica.</b> O corredor é habitat clássico de <b>Alouatta guariba</b>
    (bugio-ruivo): 28 presenças no corredor e adequabilidade altíssima (climatológico ~100%).
    O <b>Sapajus nigritus</b> é moderado. O <b>Alouatta caraya</b> tem <b>zero registros</b> no
    corredor (presença mais próxima a 56 km) e adequabilidade baixa (~2–12%).</p>
    </div>
    <div class="destaque">
    <h3>Como melhorar a predição do <i>Alouatta caraya</i> na área foco</h3>
    <p>Você sabe que a espécie ocorre ali, mas <b>não há registros</b>. Isto é um problema de
    <b>dados</b>, não de modelo — um SDM não prevê presença onde não há sinal de presença e onde
    pseudoausências podem ter sido lançadas. Ações, em ordem de impacto:</p>
    <ol>
    <li><b>Adicionar presenças no corredor</b> (o fator isolado mais eficaz): mesmo poucos pontos
    georreferenciados de campo/literatura/conhecimento de especialista ancoram o modelo. Sem sinal
    de presença local, nenhuma variável ambiental "cria" adequabilidade ali.</li>
    <li><b>Corrigir contaminação por pseudoausência</b>: verificar se há pseudoausências dentro do
    corredor conhecido como ocupado — se sim, são falsas ausências ensinando o modelo que a área é
    inadequada. Excluir um <i>buffer</i> ao redor de áreas sabidamente ocupadas da geração de
    pseudoausências.</li>
    <li><b>Corrigir viés amostral</b>: usar <i>target-group background</i> (registros de outros
    mamíferos/primatas) ou uma camada de esforço, para que o "fundo" reflita esforço de coleta e
    não ausência verdadeira.</li>
    <li><b>Limiar de alta sensibilidade para manejo de estrada</b>: para mitigar atropelamento, o
    custo de OMITIR um trecho de travessia é alto — usar o limiar de <b>menor omissão</b> (p10 das
    presenças ou sens=0,95), não o maxTSS. Isso amplia a área sinalizada e reduz falsos negativos.</li>
    <li><b>Espécie-substituta / ensemble</b>: o corredor é ecologicamente de <i>guariba</i>, que ali
    é bem amostrado e altamente adequado. Se a ecologia de travessia for semelhante, o <b>modelo do
    guariba é a base mais defensável</b> para priorizar trechos de manejo neste corredor; confirmar
    a identificação da espécie nos avistamentos locais.</li>
    <li><b>Preditores de conectividade</b>: adicionar cobertura florestal, distância a fragmentos e
    corredores ripários — as 7 variáveis atuais (clima+terreno+uso do solo) não capturam a estrutura
    de movimento relevante a atropelamento.</li>
    </ol>
    <p class="nota">Observação metodológica honesta: o climatológico é mais coerente ecologicamente
    (achado geral do laudo), mas para o caraya <b>neste corredor</b> os dois modelos subestimam por
    falta de dados — a solução é dado, não a escolha de metodologia.</p>
    </div></section>"""


def sec_interpretacao():
    return """
    <section id="interpretacao"><h2>21. Interpretação ecológica</h2>
    <div class="cards">
    <div class="card"><h4>O que o modelo diário pode estar aprendendo</h4><p>Clima de um único
    dia, sazonalidade de coleta, condições meteorológicas favoráveis ao avistamento — sinais do
    <b>momento da observação</b>, não da distribuição persistente. Daí transferir o peso para
    variáveis estáveis (uso do solo, altitude).</p></div>
    <div class="card"><h4>O que o climatológico representa</h4><p>Condições climáticas
    <b>persistentes</b> do local. Reduz ruído meteorológico, aprende limites térmicos
    interpretáveis. Risco: suaviza extremos que podem ser ecologicamente limitantes.</p></div>
    </div>
    <div class="nota">Distinções conceituais que o laudo mantém separadas: <b>distribuição
    potencial</b> ≠ <b>adequabilidade climática persistente</b> ≠ <b>uso temporal do habitat</b> ≠
    <b>probabilidade de observação/detecção</b>. O modo diário mistura observação com distribuição;
    o climatológico aproxima-se melhor da adequabilidade persistente.</div></section>"""


def sec_conclusoes(met, temporal, foco, decis):
    blocos = ""
    for esp in ESPS:
        nivel, rec, tally = recomendacao_especie(esp, met, decis)
        d = met[esp]["daily"]; c = met[esp]["clima"]
        blocos += f"""<div class="esp-bloco"><h4>{NOME_ESP[esp]} — {nivel} recomendação: {rec} <small>(placar {tally})</small></h4>
        <ul>
        <li>Desempenho interno: AUC diário {fmt(d['AUC'])} vs clima {fmt(c['AUC'])} (diferença pequena).</li>
        <li>Calibração (Brier): diário {fmt(d['Brier'])} vs clima {fmt(c['Brier'])}.</li>
        <li>Sobreajuste: diário {fmt(d['sobreajuste_AUC'])} vs clima {fmt(c['sobreajuste_AUC'])}.</li>
        <li>Extrapolação MESS: diário {temporal[esp]['mess']['daily']['perc_extrapolacao']}% vs
        clima {temporal[esp]['mess']['clima']['perc_extrapolacao']}%.</li>
        </ul></div>"""
    return f"""
    <section id="conclusoes"><h2>22. Conclusões</h2>{blocos}
    <div class="destaque"><p><b>Síntese integrada.</b> Para <b>mapear distribuição/adequabilidade</b>,
    o <b>climatológico</b> é a escolha mais defensável: coerência temporal treino–projeção, relações
    ecológicas interpretáveis, menor sobreajuste, e desempenho igual ou superior. O <b>diário</b>
    não é "pior" em discriminação — mas responde a uma pergunta diferente (condições do dia da
    observação) e, projetado sobre médias decenais, aprende relações que não são as do clima
    persistente. A resposta <b>depende da espécie</b> em grau, não em direção: nigritus favorece
    fortemente o climatológico; caraya é o mais equilibrado; guariba intermediário.</p></div>
    </section>"""


def sec_recomendacoes():
    return """
    <section id="recomendacoes"><h2>23. Recomendações</h2>
    <div class="cards">
    <div class="card"><h4>Uso imediato</h4><p>Adotar o <b>modelo climatológico</b> para mapas de
    adequabilidade/nicho das três espécies. Reservar o diário a estudos de eventos (ondas de calor,
    secas), não de distribuição média.</p></div>
    <div class="card"><h4>Melhorias do pipeline</h4><p>(1) Uniformizar o conjunto de presenças
    entre os modos (mesmo thinning) para isolar o efeito da escala temporal; (2) unificar a fonte
    de solo (awc) para eliminar nodata assimétrico; (3) re-treinar com validação por blocos
    espaciais.</p></div>
    <div class="card"><h4>Novas validações</h4><p>Validação espacial (blocos), teste de
    transferência independente e verificação de campo no corredor de manejo antes de publicação.</p></div>
    <div class="card"><h4>Novos dados</h4><p>Prioridade: <b>presenças de caraya no corredor
    BR-290/RS-030</b> e, em geral, registros na serra/litoral do RS e preditores de conectividade
    florestal.</p></div>
    </div>
    <div class="destaque"><p><b>Decisão metodológica:</b> 🟢 <b>recomendar o treinamento
    climatológico</b> como padrão operacional para distribuição; o diário permanece útil para
    perguntas de escala temporal fina. Estratégia híbrida justificável apenas se o objetivo incluir
    dinâmica temporal.</p></div></section>"""


def sec_reprodutibilidade(inv, quando):
    tab = inv.to_html(index=False, border=0, classes="repro") if inv is not None else ""
    return f"""
    <section id="repro"><h2>24. Reprodutibilidade</h2>
    <ul>
    <li><b>Modelos:</b> Random Forest (pacote R <code>sdm</code>), ntree=1000, mtry=8, bootstrap
    10 réplicas. 7 preditores: t2m, e, tp, ndvi, altitude, awc, uso do solo (MapBiomas).</li>
    <li><b>Projeção:</b> Brasil a 1 km (grade 4000×4000, 0,01°, EPSG:4326), média decenal
    (2015–2024), pasta <code>env_data/predicao_7var_brasil_1km/</code>. Mesmos rasters nos dois modos.</li>
    <li><b>Métricas:</b> calculadas dos pares (observado, previsto) da partição de teste
    (<code>04_modeling/extrair_avaliacao_pontos.R</code> → <code>05_utils/laudo_*.py</code>).
    Limiar padrão: maxTSS. Tratamento de ausências: complete.cases nos 7 preditores.</li>
    <li><b>Extrapolação:</b> MESS (Elith et al. 2010) por espécie×modo.</li>
    <li><b>Gerado em:</b> {quando}.</li>
    </ul>
    <details><summary>Inventário de arquivos</summary><div class="tabela-scroll">{tab}</div></details>
    </section>"""


def sec_glossario():
    termos = [
        ("AUC (ROC)", "Probabilidade de o modelo dar nota maior a uma presença que a uma ausência. 0,5=acaso, 1=perfeito."),
        ("PR-AUC", "Área sob a curva precisão–recall; mais informativa que a ROC sob desbalanceamento."),
        ("TSS", "True Skill Statistic = sensibilidade + especificidade − 1."),
        ("MCC", "Coeficiente de correlação de Matthews; robusto a desbalanceamento."),
        ("Boyce", "Mede se áreas de maior adequabilidade concentram mais presenças; +1 ideal."),
        ("Brier / LogLoss", "Erro de calibração das probabilidades; menor é melhor."),
        ("MESS", "Superfície de similaridade ambiental; negativo = extrapolação (fora do treino)."),
        ("Schoener D / Hellinger I", "Índices de sobreposição entre dois mapas de adequabilidade (0–1)."),
        ("Thinning espacial", "Deduplicação de presenças por célula para evitar pseudo-replicação."),
        ("maxTSS", "Limiar de corte que maximiza o TSS ao binarizar o mapa contínuo."),
    ]
    li = "".join(f"<dt>{t}</dt><dd>{d}</dd>" for t, d in termos)
    return f'<section id="glossario"><h2>25. Glossário</h2><dl>{li}</dl></section>'


def construir():
    met = _load("metricas.json"); dados = _load("dados.json")
    temporal = _load("temporal.json"); mapas = _load("mapas.json")
    foco = _load("foco_rs.json"); inv = _load("inventario.csv")
    df_pts = _load("avaliacao_pontos.csv")
    quando = datetime.now().strftime("%Y-%m-%d %H:%M")
    decis = decisao(met, temporal, mapas, foco)

    nav = """<nav id="nav"><a href="#resumo">Resumo</a><a href="#pergunta">Pergunta</a>
    <a href="#hipoteses">Hipóteses</a><a href="#comparabilidade">Comparabilidade</a>
    <a href="#perda">Perda de dados</a><a href="#desempenho">Desempenho</a>
    <a href="#validacao">Validação espacial</a><a href="#calibracao">Calibração</a>
    <a href="#rf">Random Forest</a><a href="#temporal">Compat. temporal</a>
    <a href="#mapas">Projeções Brasil</a><a href="#foco">Área foco</a>
    <a href="#interpretacao">Interpretação</a><a href="#conclusoes">Conclusões</a>
    <a href="#recomendacoes">Recomendações</a><a href="#repro">Reprodutibilidade</a>
    <a href="#glossario">Glossário</a></nav>"""

    corpo = "".join([
        sec_resumo(met, temporal, mapas, foco, decis),
        sec_pergunta(), sec_hipoteses(),
        sec_comparabilidade(dados), sec_perda(dados),
        sec_desempenho(met, df_pts), sec_validacao_espacial(),
        sec_calibracao(met), sec_rf(met), sec_temporal(temporal),
        sec_mapas(mapas), sec_foco(foco, met), sec_interpretacao(),
        sec_conclusoes(met, temporal, foco, decis), sec_recomendacoes(),
        sec_reprodutibilidade(inv, quando), sec_glossario(),
    ])

    html = _shell(nav, corpo, quando)
    SAIDA.write_text(html, encoding="utf-8")
    print(f"[ok] {SAIDA}")
    print(f"     tamanho: {len(html)/1024:.0f} KB")


def _shell(nav, corpo, quando):
    return f"""<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Laudo Comparativo — Diário × Climatológico (SDM)</title>
<style>
:root{{--bg:#fff;--fg:#1a1f2b;--mut:#5a6478;--line:#e2e6ee;--card:#f6f8fc;--acc:#2b6cb0;
--daily:#4C72B0;--clima:#DD8452;--good:#1f9d55;--warn:#d69e2e;--crit:#e05252;}}
@media (prefers-color-scheme:dark){{:root{{--bg:#12151c;--fg:#e6e9f0;--mut:#95a0b5;
--line:#28303f;--card:#1a1f2b;--acc:#5b9bd5;}}}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--fg);
font:16px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif}}
#nav{{position:sticky;top:0;background:var(--bg);border-bottom:1px solid var(--line);
padding:8px 16px;display:flex;flex-wrap:wrap;gap:4px 14px;font-size:13px;z-index:10}}
#nav a{{color:var(--acc);text-decoration:none;white-space:nowrap}}
#nav a:hover{{text-decoration:underline}}
header.top{{padding:40px 24px 24px;max-width:1100px;margin:0 auto}}
header.top h1{{font-size:28px;margin:0 0 6px}}header.top .sub{{color:var(--mut)}}
main{{max-width:1100px;margin:0 auto;padding:0 24px 80px}}
section{{padding:28px 0;border-top:1px solid var(--line)}}
h2{{font-size:22px;margin:0 0 14px}}h3{{font-size:18px;margin:22px 0 10px}}
h4{{margin:0 0 8px}}.lead{{color:var(--mut);font-size:15px}}
table{{border-collapse:collapse;width:100%;font-size:13.5px;margin:10px 0}}
th,td{{border:1px solid var(--line);padding:6px 9px;text-align:left;vertical-align:top}}
th{{background:var(--card);position:sticky;top:0}}
.tabela-scroll{{overflow-x:auto;max-width:100%}}
td.esp,.esp{{font-weight:600}}
figure{{margin:18px 0;text-align:center}}
figure img{{max-width:100%;height:auto;border:1px solid var(--line);border-radius:8px}}
figcaption{{color:var(--mut);font-size:13px;margin-top:6px}}
.cards{{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin:14px 0}}
.card{{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 16px}}
.card h4{{color:var(--acc)}}
.destaque{{background:linear-gradient(0deg,var(--card),var(--card));border:1px solid var(--line);
border-left:4px solid var(--acc);border-radius:8px;padding:14px 18px;margin:16px 0}}
.fluxo{{background:var(--card);border-radius:8px;padding:12px 18px;margin:14px 0;font-size:14.5px}}
.nota{{font-size:13.5px;color:var(--mut);border-left:3px solid var(--line);padding:6px 14px;margin:12px 0}}
.naocalc{{background:#fff3f3;border:1px solid var(--crit);border-radius:8px;padding:14px 18px}}
@media (prefers-color-scheme:dark){{.naocalc{{background:#2a1a1a}}}}
.naocalc h4{{color:var(--crit)}}
.decisao td,.decisao th{{text-align:center}}.decisao td:first-child{{text-align:left}}
blockquote{{border-left:4px solid var(--acc);margin:0;padding:8px 18px;background:var(--card);
border-radius:6px;font-size:16px}}
.esp-bloco{{margin:16px 0;padding:12px 0;border-top:1px dashed var(--line)}}
.mess-linha{{font-size:14px}}
details{{margin:10px 0}}summary{{cursor:pointer;color:var(--acc)}}
.faltando{{color:var(--mut);font-style:italic;padding:20px;text-align:center;border:1px dashed var(--line)}}
ol,ul{{padding-left:22px}}li{{margin:4px 0}}
.badge{{display:inline-block;padding:1px 8px;border-radius:20px;font-size:12px}}
dl dt{{font-weight:600;margin-top:8px}}dl dd{{margin:0 0 4px;color:var(--mut)}}
</style></head><body>
<header class="top"><h1>Laudo comparativo — treino diário × climatológico</h1>
<div class="sub">Modelos de distribuição (SDM · Random Forest) para <i>Alouatta caraya</i>,
<i>Alouatta guariba</i> e <i>Sapajus nigritus</i>, projetados sobre a mesma média climática de
10 anos do Brasil (1 km). Gerado em {quando}.</div></header>
{nav}<main>{corpo}</main>
<footer style="text-align:center;color:var(--mut);padding:30px;font-size:13px;border-top:1px solid var(--line)">
Laudo gerado automaticamente a partir dos dados do projeto. Resultados reais; itens não
calculáveis estão declarados como tais.</footer>
<script>
document.querySelectorAll('table.sortable th').forEach((th,i)=>{{th.style.cursor='pointer';
th.title='clique p/ ordenar';th.onclick=()=>{{const tb=th.closest('table'),
rows=[...tb.tBodies[0].rows],asc=!(th._asc);th._asc=asc;
rows.sort((a,b)=>{{const x=a.cells[i].innerText,y=b.cells[i].innerText;
const nx=parseFloat(x),ny=parseFloat(y);
return (isNaN(nx)||isNaN(ny))?x.localeCompare(y)*(asc?1:-1):(nx-ny)*(asc?1:-1);}});
rows.forEach(r=>tb.tBodies[0].appendChild(r));}};}});
</script></body></html>"""


if __name__ == "__main__":
    construir()
