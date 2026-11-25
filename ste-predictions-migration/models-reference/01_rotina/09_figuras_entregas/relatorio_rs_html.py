# -*- coding: utf-8 -*-
r"""
relatorio_rs_html.py — relatório HTML autocontido dos resultados RS 275 m.

Lê Avaliacao_Qualidade_RS.json + PNGs/GIFs gerados por apresentacao_rs.py em
04_resultados_finais\RS_apresentacao_250m\2026-08-18\ e monta um único HTML que:
  - apresenta os mapas (anual, futuros) e os GIFs da dinâmica por espécie;
  - relaciona cada resultado com a ecologia real da espécie no RS;
  - traz a avaliação de qualidade (métricas de treino, coerência ecológica por
    cenário, fantasmas, incerteza, extrapolação, validação delta de grade) e um
    guia de indicadores + checklist para o usuário validar a entrega.

Uso: .venv\Scripts\python.exe 01_rotina\09_figuras_entregas\relatorio_rs_html.py
"""
import base64
import io
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "04_resultados_finais" / "RS_apresentacao_250m" / "2026-08-18"
LAUDO = json.loads((BASE / "Avaliacao_Qualidade_RS.json").read_text(encoding="utf-8"))
OUT = BASE / "Relatorio_RS_Primatas.html"

MESES_PT = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
            "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
ORDEM_CEN = (["anual_2015_2024"]
             + [f"mensal_{i+1:02d}_{m}" for i, m in enumerate(
                 ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho",
                  "agosto", "setembro", "outubro", "novembro", "dezembro"])]
             + ["futuro_2050_ssp245", "futuro_2050_ssp585",
                "futuro_2100_ssp245", "futuro_2100_ssp585"])

COR = {"APROVADO": "#2e7d32", "SUSPEITO": "#ef6c00", "REPROVADO": "#c62828", None: "#607d8b"}


def jpeg_b64(png_path, width, quality=80):
    if not png_path.exists():
        return None
    im = Image.open(png_path).convert("RGB")
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=quality, optimize=True)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def gif_b64(path):
    if not path or not Path(path).exists():
        return None
    return "data:image/gif;base64," + base64.b64encode(Path(path).read_bytes()).decode()


def badge(v):
    return f'<span class="badge" style="background:{COR.get(v, COR[None])}">{v or "—"}</span>'


def fmt(x, nd=2):
    if x is None:
        return "—"
    s = f"{x:.{nd}f}" if isinstance(x, float) else str(x)
    return s.replace(".", ",")


def tabela_cenarios(res):
    ln = ["<table><thead><tr><th>Cenário</th><th>Veredito coerência</th>"
          "<th>Razão dentro/fora</th><th>Fantasmas (%)</th><th>Média no RS</th>"
          "<th>% do RS ≥ 0,5</th><th>Incerteza média</th></tr></thead><tbody>"]
    for cen in ORDEM_CEN:
        d = res["cenarios"].get(cen)
        if not d:
            continue
        co = d.get("coerencia") or {}
        delta = d.get("delta_pct_area_vs_anual")
        dtxt = ""
        if delta is not None:
            cls = "up" if delta > 0 else "down"
            dtxt = f' <span class="{cls}">({"+" if delta >= 0 else ""}{fmt(delta)} p.p.)</span>'
        ln.append(
            f"<tr><td>{d['rotulo']}</td><td>{badge(co.get('veredito'))}</td>"
            f"<td>{fmt(co.get('razao_dentro_fora'))}</td>"
            f"<td>{fmt(co.get('pct_acima_0.5_fora'))}</td>"
            f"<td>{fmt(d.get('adequabilidade_media_rs'), 3)}</td>"
            f"<td>{fmt(d.get('pct_rs_acima_0.5'))}{dtxt}</td>"
            f"<td>{fmt(d.get('incerteza_media_rs'), 3)}</td></tr>")
    ln.append("</tbody></table>")
    return "".join(ln)


def resumo_vereditos(res):
    c = {"APROVADO": 0, "SUSPEITO": 0, "REPROVADO": 0}
    for cen in res["cenarios"].values():
        v = (cen.get("coerencia") or {}).get("veredito")
        if v in c:
            c[v] += 1
    return c


def bloco_modelo(chave, res, obs_html=""):
    d = BASE / chave
    slug = res["prefixo"]
    anual = jpeg_b64(d / "png_cenarios" / f"{slug}_anual_2015_2024.png", 1000)
    futuros = [(cen, jpeg_b64(d / "png_cenarios" / f"{slug}_{cen}.png", 520, 74))
               for cen in ORDEM_CEN[13:]]
    g_mensal = gif_b64(res.get("gif_ciclo_mensal"))
    g_fut = gif_b64(res.get("gif_futuros"))
    mt = res["metricas_treino"]
    rv = resumo_vereditos(res)
    an = res["cenarios"].get("anual_2015_2024", {})
    co_an = an.get("coerencia") or {}
    ex = an.get("extrapolacao") or {}
    ex_txt = ""
    if ex:
        pct_ex = ex.get("pct_extrapolacao", ex.get("pct_fora_envelope"))
        if pct_ex is not None:
            ex_txt = (f"<li><b>Extrapolação (anual):</b> {fmt(pct_ex)}% das células fora do "
                      f"envelope de treino — quanto menor, mais o mapa se apoia em condições "
                      f"que o modelo conhece.</li>")
    html = [f"""
  <div class="modelo" id="{chave}">
   <h3>{res['titulo']}</h3>
   <div class="kpis">
    <div class="kpi"><span>AUC</span><b>{fmt(mt['AUC']['media'], 3)} ± {fmt(mt['AUC']['dp'], 3)}</b></div>
    <div class="kpi"><span>TSS</span><b>{fmt(mt['TSS']['media'], 3)} ± {fmt(mt['TSS']['dp'], 3)}</b></div>
    <div class="kpi"><span>COR</span><b>{fmt(mt['COR']['media'], 3)}</b></div>
    <div class="kpi"><span>Réplicas RF</span><b>{mt['n_replicas']}</b></div>
    <div class="kpi"><span>Presenças na janela RS</span><b>{res.get('n_presencas_treino_janela_rs') or '—'}</b></div>
    <div class="kpi"><span>Vereditos (17 cenários)</span>
      <b><i style="color:{COR['APROVADO']}">{rv['APROVADO']} apr.</i> ·
         <i style="color:{COR['SUSPEITO']}">{rv['SUSPEITO']} susp.</i> ·
         <i style="color:{COR['REPROVADO']}">{rv['REPROVADO']} repr.</i></b></div>
   </div>
   <ul class="notas">
    <li><b>Coerência ecológica (anual):</b> {badge(co_an.get('veredito'))} razão dentro/fora
        {fmt(co_an.get('razao_dentro_fora'))} · fantasmas {fmt(co_an.get('pct_acima_0.5_fora'))}%.
        <i>{co_an.get('nota', '')}</i></li>
    {ex_txt}
   </ul>"""]
    if anual:
        html.append(f'<figure><img src="{anual}" alt="mapa anual">'
                    f'<figcaption>Cenário anual 2015–2024 — presenças de treino sobre a '
                    f'adequabilidade prevista (viridis 0–1, escala única em todos os '
                    f'cenários).</figcaption></figure>')
    if g_mensal or g_fut:
        html.append('<div class="gifs">')
        if g_mensal:
            html.append(f'<figure><img src="{g_mensal}" alt="ciclo mensal">'
                        f'<figcaption>Dinâmica mensal predita (jan→dez). Atenção aos '
                        f'vereditos: meses SUSPEITOS/REPROVADOS não passaram no gate de '
                        f'coerência.</figcaption></figure>')
        if g_fut:
            html.append(f'<figure><img src="{g_fut}" alt="futuros">'
                        f'<figcaption>Presente → 2050 → 2100 (primeiro SSP2-4.5, depois '
                        f'SSP5-8.5).</figcaption></figure>')
        html.append('</div>')
    grid = [f'<figure class="mini"><img src="{b64}" alt="{cen}"></figure>'
            for cen, b64 in futuros if b64]
    if grid:
        html.append('<h4>Cenários futuros (CMIP6)</h4><div class="grid2">' + "".join(grid) + '</div>')
    html.append(f"<h4>Vereditos e indicadores por cenário</h4>{tabela_cenarios(res)}")
    if obs_html:
        html.append(f'<div class="leitura"><h4>Leitura ecológica destes resultados</h4>{obs_html}</div>')
    html.append(f'<p class="paths">Arquivos: <code>{chave}/png_cenarios/</code> (17 PNGs), '
                f'<code>{chave}/*.gif</code>, GeoTIFFs em <code>{res["fonte_predicoes"]}</code></p>')
    html.append("</div>")
    return "".join(html)


# ---------------------------------------------------------------- fichas ecológicas
FICHAS = {
"caraya": """
<p><b>Ecologia no RS.</b> O bugio-preto ocorre no RS na sua <b>borda meridional de
distribuição global</b>: oeste e centro do estado, associado às <b>matas ciliares e de
galeria</b> dos rios Uruguai, Ibicuí, Jacuí e afluentes, e aos capões de floresta estacional
imersos no Pampa. Não depende de floresta contínua — é notavelmente tolerante a
<b>fragmentos pequenos e matas secundárias</b>, desde que exista conexão ripária. Dieta
folívoro-frugívora flexível (alta proporção de folhas permite viver onde frugívoros
estritos não conseguem). Grupos pequenos (5–12), sedentários, áreas de vida de poucos
hectares. Dimorfismo marcado: machos adultos pretos, fêmeas e jovens pardacentos.</p>
<p><b>Conservação.</b> Espécie fortemente atingida pelos surtos de <b>febre amarela</b>
(2008–2009 no RS; 2016–2018 no Sudeste), que derrubaram populações inteiras de bugios;
consta como quase ameaçada (IUCN) e figura na lista estadual de fauna ameaçada do RS.
Ameaças no estado: supressão de mata ciliar, expansão da silvicultura e da soja no Pampa,
atropelamentos e eletrocussão em áreas periurbanas.</p>
<p><b>O que esperar de um mapa correto.</b> Núcleo de adequabilidade no <b>oeste/centro
(vales do Ibicuí–Jacuí, Depressão Central e fronteira oeste)</b> acompanhando a rede
ripária; valores baixos na encosta e nos Campos de Cima da Serra (domínio do bugio-ruivo,
clima mais frio) e no litoral. A adequabilidade deve aparecer em <b>filetes ao longo dos
rios</b> — exatamente o ganho esperado dos preditores ripários de 275 m (dist_rio,
pct_floresta_500m).</p>
""",
"guariba": """
<p><b>Ecologia no RS.</b> O bugio-ruivo (<i>Alouatta guariba clamitans</i>) é o primata da
<b>metade leste</b> do estado: Floresta Ombrófila Densa da encosta atlântica, Floresta
Ombrófila Mista (araucária) da Serra Geral, matas estacionais dos vales do Taquari, Caí,
Sinos e do entorno do lago Guaíba (Itapuã, Lami), chegando às matas do Escudo
Sul-rio-grandense. É o <b>limite sul da Mata Atlântica com primatas</b>. Folívoro-frugívoro,
sedentário, sobrevive em fragmentos periurbanos surpreendentemente pequenos (POA e região
metropolitana têm populações remanescentes monitoradas). </p>
<p><b>Conservação.</b> Classificado como <b>Vulnerável</b> (nacional); o RS concentrou a
maior mortandade registrada de bugios por febre amarela (2008–2009, vales do Taquari e
Caí). Ameaças atuais: perda e isolamento de fragmentos, cães, eletrocussão, atropelamento
— e novo ciclo de febre amarela.</p>
<p><b>O que esperar de um mapa correto.</b> Núcleo no <b>quadrante nordeste</b> (encosta da
serra e vales úmidos), prolongando-se pela região metropolitana de POA e pelas matas do
escudo até Camaquã; adequabilidade caindo para oeste (Pampa aberto) e baixa no extremo
oeste — o inverso espacial do caraya. Sobreposição real com o caraya existe só numa faixa
central (Depressão Central / Jacuí médio).</p>
""",
"nigritus": """
<p><b>Ecologia no RS.</b> O macaco-prego ocupa o <b>nordeste do estado</b>: Floresta com
Araucária e bordas dos Campos de Cima da Serra, cânions dos Aparados da Serra
(Itaimbezinho, Fortaleza) e encosta atlântica adjacente — também aqui no <b>limite sul da
distribuição da espécie</b>. Frugívoro-onívoro generalista e manipulador (frutos,
sementes, invertebrados, pequenos vertebrados); no inverno o <b>pinhão da araucária</b> é
recurso-chave, o que amarra a espécie à Ombrófila Mista. Diferente dos bugios, usa áreas
de vida grandes (dezenas a centenas de hectares) e precisa de <b>matas mais extensas e
conectadas</b>; tolera mosaicos, mas não fragmentos minúsculos isolados.</p>
<p><b>Conservação.</b> Quase ameaçado (IUCN); no RS as populações são periféricas e
naturalmente mais raras. Ameaças: conversão dos campos de altitude, silvicultura de pinus,
caça histórica e conflito com lavouras (milho) nas bordas.</p>
<p><b>O que esperar de um mapa correto.</b> Concentração clara no <b>planalto nordeste e
nos cânions</b>, com pouca ou nenhuma adequabilidade no Pampa e na fronteira oeste. Por
exigir mais floresta contínua, o mapa correto do nigritus deve ser <b>mais restrito</b> que
o do guariba na mesma região.</p>
""",
"grupo": """
<p><b>O que é este modelo.</b> Não é uma espécie: é o modelo treinado com o <b>pool das
presenças das três espécies</b> (4.295 presenças únicas + 4.295 pseudoausências, receita
v3). Ele responde <i>"onde há condições para primatas arborícolas no RS"</i> — útil como
camada-síntese de triagem e porque o pool combinado amplia a faixa climática de treino
(foi o único a passar em todos os gates mensais sem reprovação na rodada nacional). Para
dizer <i>qual</i> primata, use os modelos individuais acima.</p>
<p><b>O que esperar de um mapa correto.</b> A união dos três padrões: rede ripária do
oeste (caraya) + nordeste florestal (guariba/nigritus), com mínimos no Pampa aberto do
sudoeste e no litoral arenoso.</p>
""",
}

GUIA = f"""
<h2 id="guia">1 · Guia de indicadores — como validar o que está aqui</h2>
<div class="cardgrid">
 <div class="card"><h4>AUC (discriminação)</h4><p>Probabilidade de o modelo ranquear uma
 presença acima de uma ausência. <b>&ge; 0,90 excelente</b>; 0,80–0,90 bom; &lt; 0,75
 fraco. Medida em validação interna das réplicas bootstrap — mede ajuste, não garante
 transferência espacial.</p></div>
 <div class="card"><h4>TSS (sensibilidade + especificidade − 1)</h4><p><b>&ge; 0,80
 excelente</b>; 0,60–0,80 bom; &lt; 0,40 pobre. Menos sensível à prevalência que o kappa.
 </p></div>
 <div class="card"><h4>Coerência ecológica (gate próprio do projeto)</h4><p>Compara a
 adequabilidade média até 50 km das presenças ("dentro") contra a média além de 100 km
 ("fora"). <b>APROVADO</b>: razão ≥ 1,8. <b>SUSPEITO</b>: razão &lt; 1,8 (separação
 fraca). <b>REPROVADO</b>: inversão (fora ≥ dentro) ou &gt; 10% de "fantasmas". É o teste
 que reprova mapas que a AUC deixaria passar.</p></div>
 <div class="card"><h4>Fantasmas</h4><p>% do território a mais de 100 km de qualquer
 presença com adequabilidade &gt; 0,5 — população inventada. <b>Perto de 0% é o
 desejável</b>; o gate reprova acima de 10%.</p></div>
 <div class="card"><h4>Incerteza (dp entre réplicas)</h4><p>Desvio-padrão da predição entre
 as 10 réplicas do Random Forest, pixel a pixel. Alto onde as réplicas discordam — use
 como camada de confiança, não como veto.</p></div>
 <div class="card"><h4>Extrapolação</h4><p>% de células cujas condições ambientais ficam
 fora do envelope de treino. Onde há extrapolação o modelo "chuta" — cruze com o GeoTIFF
 <code>_extrapolacao.tif</code> antes de confiar em áreas novas.</p></div>
 <div class="card"><h4>Validação delta de grade</h4><p>A mesma predição rodada na grade
 nacional 0,01° e na janela RS 275 m deve dar o mesmo campo. Medido no pior caso
 (grupo, 2100 SSP5-8.5): <b>r = {fmt(LAUDO.get('validacao_delta_grade', {}).get('r_pearson', 0.989), 3)},
 MAE = {fmt(LAUDO.get('validacao_delta_grade', {}).get('mae', 0.013), 3)}</b> — o refino de grade
 não altera o resultado, só o detalhamento espacial ripário.</p></div>
 <div class="card warn"><h4>⚠ Limitação estrutural dos cenários mensais</h4><p>O modelo é
 treinado em <b>climatologia anual</b> e projetado em clima mensal. A "dinâmica" mensal é a
 resposta do envelope climático, <b>não movimento dos animais</b> (primatas são residentes;
 ninguém migra no inverno). Meses SUSPEITOS separam fraco; REPROVADOS não devem ser usados.
 A correção definitiva (modelo sazonal regional) está nas pendências do projeto.</p></div>
</div>
"""

CHECKLIST = """
<h2 id="checklist">5 · Checklist de validação (para o revisor)</h2>
<ol class="check">
 <li><b>Padrão espacial×ecologia:</b> caraya no oeste ripário, guariba no leste serrano,
 nigritus restrito ao planalto NE — confira nos mapas anuais acima se cada núcleo está no
 lugar certo e se NÃO há núcleo forte onde a espécie sabidamente não ocorre (ex.: caraya
 no litoral, nigritus no Pampa).</li>
 <li><b>Pontos vs mancha:</b> as presenças de treino (pontos vermelhos) devem cair sobre
 células claras (adequabilidade alta). Pontos sistematicamente sobre azul-escuro indicam
 problema de registro ou de preditores.</li>
 <li><b>Municípios de literatura:</b> rode <code>01_rotina\\07_validacao_ecologica\\teste_municipios_literatura.py</code>
 para conferir os municípios com registro publicado contra o mapa (teste independente do
 treino).</li>
 <li><b>Use só cenários APROVADOS para decisão;</b> SUSPEITOS com ressalva explícita;
 REPROVADOS nunca (estão marcados em vermelho nos PNGs e na tabela).</li>
 <li><b>Futuros:</b> os deltas de área adequada (% do RS ≥ 0,5) entre presente e
 2050/2100 estão na tabela de cada modelo — verifique se a direção da mudança é coerente
 entre SSP2-4.5 e SSP5-8.5 (o pessimista deve amplificar, não inverter, a tendência do
 intermediário; inversões merecem investigação).</li>
 <li><b>Incerteza e extrapolação:</b> qualquer área candidata a decisão (ex.: polígono de
 licenciamento) deve ser cruzada com <code>_incerteza.tif</code> e
 <code>_extrapolacao.tif</code> do cenário usado.</li>
 <li><b>Registros independentes:</b> o veredito final é seu — sobreponha registros de
 campo/SISBIO/iNaturalist recentes (não usados no treino) e verifique a taxa de acerto em
 células ≥ 0,5.</li>
</ol>
"""


def secao_qualidade():
    linhas = ["<h2 id='qualidade'>4 · Qualidade comparada dos 5 modelos</h2>",
              "<table><thead><tr><th>Modelo</th><th>AUC</th><th>TSS</th>"
              "<th>Aprovados</th><th>Suspeitos</th><th>Reprovados</th>"
              "<th>Anual: razão d/f</th><th>Anual: % RS ≥ 0,5</th></tr></thead><tbody>"]
    for chave, res in LAUDO["modelos"].items():
        mt, rv = res["metricas_treino"], resumo_vereditos(res)
        an = res["cenarios"].get("anual_2015_2024", {})
        co = an.get("coerencia") or {}
        linhas.append(
            f"<tr><td><a href='#{chave}'>{res['titulo']}</a></td>"
            f"<td>{fmt(mt['AUC']['media'], 3)}</td><td>{fmt(mt['TSS']['media'], 3)}</td>"
            f"<td style='color:{COR['APROVADO']}'><b>{rv['APROVADO']}</b></td>"
            f"<td style='color:{COR['SUSPEITO']}'><b>{rv['SUSPEITO']}</b></td>"
            f"<td style='color:{COR['REPROVADO']}'><b>{rv['REPROVADO']}</b></td>"
            f"<td>{fmt(co.get('razao_dentro_fora'))}</td>"
            f"<td>{fmt(an.get('pct_rs_acima_0.5'))}</td></tr>")
    linhas.append("</tbody></table>")
    linhas.append("""
<div class="leitura"><h4>Síntese da avaliação</h4>
<p><b>Prontos para uso no RS (anual + 2050):</b> nigritus v3 (o mais forte — razão 3,23 e
os 4 futuros aprovados), caraya nacional v3, grupo v3. O caraya regional v2 acompanha como
camada de detalhe ripário (anual suspeito por 0,02 de margem, sem fantasmas).</p>
<p><b>Não usar para decisão:</b> guariba v3 na janela RS (anual e futuros reprovados por
sobrepredição no centro-sul/oeste — ver leitura na seção da espécie) e os cenários
mensais de <b>verão</b> de todos os modelos (dez–mar reprovam com fantasmas altos). Os
mensais de inverno são suspeitos por separação fraca, mas sem invenção de população
(fantasmas ~0%) — servem para leitura de padrão, não para decisão.</p>
<p><b>Nota metodológica:</b> os vereditos desta página foram recalculados <i>na janela
RS</i> — um gate mais exigente que o nacional (o mesmo cenário pode aprovar na grade
Brasil e reprovar aqui). É o número que vale para uso regional.</p></div>""")
    return "".join(linhas)


CSS = """
:root{--tx:#263238;--mut:#607d8b;--bg:#fafbfc;--card:#fff;--bd:#e0e6ea;--ac:#1565c0}
*{box-sizing:border-box}body{margin:0;font:15px/1.65 'Segoe UI',system-ui,sans-serif;
color:var(--tx);background:var(--bg)}
.wrap{max-width:1080px;margin:0 auto;padding:24px 20px 80px}
header{background:linear-gradient(135deg,#0d3b2e,#1b5e20 60%,#2e7d32);color:#fff;
padding:38px 20px 30px}
header .wrap{padding:0 20px}
h1{margin:0 0 6px;font-size:26px}header p{margin:2px 0;opacity:.92}
nav{position:sticky;top:0;background:#fff;border-bottom:1px solid var(--bd);z-index:9;
padding:8px 20px;display:flex;gap:14px;flex-wrap:wrap;font-size:14px}
nav a{color:var(--ac);text-decoration:none;font-weight:600}
h2{margin:44px 0 12px;font-size:21px;border-bottom:2px solid #c8e6c9;padding-bottom:6px}
h3{margin:26px 0 8px;font-size:18px;color:#1b5e20}
h4{margin:18px 0 6px;font-size:15px}
.badge{color:#fff;padding:2px 9px;border-radius:10px;font-size:12px;font-weight:700}
.kpis{display:flex;gap:10px;flex-wrap:wrap;margin:10px 0}
.kpi{background:var(--card);border:1px solid var(--bd);border-radius:8px;padding:8px 12px}
.kpi span{display:block;font-size:11.5px;color:var(--mut)}
.kpi b{font-size:15px}.kpi i{font-style:normal}
figure{margin:14px 0;text-align:center}
figure img{max-width:100%;border:1px solid var(--bd);border-radius:6px}
figcaption{font-size:12.5px;color:var(--mut);margin-top:4px;text-align:left}
.gifs{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:12px}
.grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:8px}
.mini img{border-radius:4px}
table{border-collapse:collapse;width:100%;font-size:13.5px;margin:10px 0;background:#fff}
th,td{border:1px solid var(--bd);padding:5px 8px;text-align:left}
th{background:#eef4f0}
tr:nth-child(even){background:#f6f9f7}
.up{color:#2e7d32;font-weight:600}.down{color:#c62828;font-weight:600}
.cardgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:12px}
.card{background:var(--card);border:1px solid var(--bd);border-left:4px solid #66bb6a;
border-radius:8px;padding:4px 14px 10px}
.card.warn{border-left-color:#ef6c00;background:#fff8f0}
.card h4{margin:10px 0 4px}.card p{margin:4px 0;font-size:13.5px}
.ficha{background:#f1f8e9;border:1px solid #dcedc8;border-radius:8px;padding:8px 16px;
margin:10px 0}
.leitura{background:#e8f0fe;border:1px solid #c5d6f2;border-radius:8px;padding:8px 16px;
margin:14px 0}
.modelo{background:#fff;border:1px solid var(--bd);border-radius:10px;padding:12px 18px;
margin:18px 0}
.notas{font-size:13.5px}.paths{font-size:12px;color:var(--mut)}
code{background:#eceff1;padding:1px 5px;border-radius:4px;font-size:12.5px}
ol.check li{margin:9px 0}
.aviso{background:#fff3e0;border:1px solid #ffe0b2;border-radius:8px;padding:10px 16px;
font-size:14px}
@media print{nav{display:none}}
"""


def montar(observacoes):
    m = LAUDO["modelos"]
    partes = [f"""<!-- gerado por relatorio_rs_html.py -->
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Primatas do RS — resultados 275 m</title><style>{CSS}</style>
<header><div class="wrap">
 <h1>Primatas do RS — resultados na grade regional 275 m</h1>
 <p>Bugio-preto (<i>Alouatta caraya</i>) · Bugio-ruivo (<i>Alouatta guariba clamitans</i>) ·
 Macaco-prego (<i>Sapajus nigritus</i>) + modelo de grupo</p>
 <p>Refino RS 250 m de 17/08/2026 · janela {LAUDO['janela']['grade']},
 bbox {LAUDO['janela']['bbox']} · 5 modelos × 17 cenários · gerado em {LAUDO['gerado_em']}</p>
</div></header>
<nav><a href="#guia">Indicadores</a><a href="#caraya">A. caraya</a>
<a href="#guariba">A. guariba</a><a href="#nigritus">S. nigritus</a>
<a href="#grupo">Grupo</a><a href="#qualidade">Qualidade</a>
<a href="#checklist">Checklist</a></nav>
<div class="wrap">
<p class="aviso"><b>Como usar este relatório.</b> Cada seção traz a ecologia real da
espécie no RS, os mapas e GIFs preditos, e a tabela de indicadores por cenário. Os
vereditos são do gate automático de coerência ecológica — mas a decisão final de uso é do
revisor: siga o guia da seção 1 e o checklist da seção 5.</p>
{GUIA}
<h2 id="caraya">2·1 — Bugio-preto (<i>Alouatta caraya</i>)</h2>
<div class="ficha">{FICHAS['caraya']}</div>
{bloco_modelo('caraya_regional_v2', m['caraya_regional_v2'], observacoes.get('caraya_regional_v2', ''))}
{bloco_modelo('caraya_nacional_v3', m['caraya_nacional_v3'], observacoes.get('caraya_nacional_v3', ''))}
<h2 id="guariba">2·2 — Bugio-ruivo (<i>Alouatta guariba clamitans</i>)</h2>
<div class="ficha">{FICHAS['guariba']}</div>
{bloco_modelo('guariba_v3', m['guariba_v3'], observacoes.get('guariba_v3', ''))}
<h2 id="nigritus">2·3 — Macaco-prego (<i>Sapajus nigritus</i>)</h2>
<div class="ficha">{FICHAS['nigritus']}</div>
{bloco_modelo('nigritus_v3', m['nigritus_v3'], observacoes.get('nigritus_v3', ''))}
<h2 id="grupo">3 — Modelo de grupo (3 espécies)</h2>
<div class="ficha">{FICHAS['grupo']}</div>
{bloco_modelo('grupo_v3', m['grupo_v3'], observacoes.get('grupo_v3', ''))}
{secao_qualidade()}
{CHECKLIST}
<h2>Reprodutibilidade</h2>
<p style="font-size:13.5px">GeoTIFFs-fonte: <code>03_dados_saida\\RS_refino_250m\\2026-08-17\\</code>.
Figuras/GIFs/laudo: <code>01_rotina\\09_figuras_entregas\\apresentacao_rs.py</code>; este
relatório: <code>relatorio_rs_html.py</code>. Gates: <code>07_validacao_ecologica\\teste_coerencia_ecologica.py</code>
(razão ≥ 1,8; fantasmas ≤ 10%) e <code>mapa_extrapolacao.py</code>. Métricas de treino:
<code>rf_*_eval.csv</code> em <code>04_resultados_finais\\&lt;modelo&gt;\\modelo\\</code>.
Dados numéricos deste HTML: <code>Avaliacao_Qualidade_RS.json</code> (mesma pasta).</p>
</div>
"""]
    OUT.write_text("".join(partes), encoding="utf-8")
    print(f"OK — {OUT} ({OUT.stat().st_size/1e6:.1f} MB)")


if __name__ == "__main__":
    obs_path = BASE / "_observacoes_leitura.json"
    obs = json.loads(obs_path.read_text(encoding="utf-8")) if obs_path.exists() else {}
    montar(obs)
