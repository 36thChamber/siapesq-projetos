#!/usr/bin/env python3
# figuras_cenarios.py — Painel PNG + GIF dos cenários de predição de uma espécie.
#
# SAÍDAS
#   1) <Especie>_painel_cenarios.png  — todos os cenários numa figura só
#   2) <Especie>_ciclo_mensal.gif     — os 12 meses animados (ciclo sazonal)
#   3) <Especie>_futuros.gif          — presente → 2050 → 2100, nos dois SSP
#
# UMA BARRA DE COR SÓ. Os 17 cenários vêm do MESMO modelo (climatológico), então a escala é
# comum e os mapas são comparáveis valor a valor.
#
# HOUVE UMA VERSÃO COM DUAS BARRAS: os 12 meses chegaram a ser rodados com o modelo DIÁRIO
# (extrapolação de 0,1% contra 15-75% do climatológico). Foram descartados — o modelo diário
# INVERTE a distribuição da espécie, dando a Amazônia como mais adequada que a Mata Atlântica.
# Ver `_descartado_modelo_diario/LEIA-ME.md` na pasta das predições. Se algum dia os blocos
# voltarem a usar modelos diferentes, as barras precisam voltar a ser duas.
#
# ESCALA DE COR: viridis — luminosidade monotônica e segura para daltonismo. NÃO usar
# turbo/jet: a luminosidade não-monotônica inventa fronteiras que não existem no dado.
#
# EXECUTAR DA RAIZ, no venv:
#   .venv/Scripts/python.exe 05_utils/figuras_cenarios.py --especie "Sapajus nigritus"

from __future__ import annotations

import argparse
import io
import json
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import rasterio  # noqa: E402
from rasterio.enums import Resampling  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "01_rotina"))
import naming  # noqa: E402

BASE07 = ROOT / "03_dados_saida"
CMAP = "viridis"
LADO = 700              # lado da leitura reamostrada (px) — o raster é 4000×4000

MESES = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho",
         "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]
MES_ROTULO = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
              "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
# cenários do modelo CLIMATOLÓGICO, em ordem de leitura
CLIMA = [("anual_2015_2024", "Presente\n(média 2015–2024)"),
         ("futuro_2050_ssp245", "2050\nSSP2-4.5"),
         ("futuro_2050_ssp585", "2050\nSSP5-8.5"),
         ("futuro_2100_ssp245", "2100\nSSP2-4.5"),
         ("futuro_2100_ssp585", "2100\nSSP5-8.5")]

TINTA = "#1a1a1a"
TINTA_FRACA = "#5c5c5c"
ALERTA = "#b3261e"      # cenário reprovado na coerência ecológica


def _p(m: str = "") -> None:
    print(m, flush=True)


def _ler(pred_dir: Path, slug: str, cenario: str):
    """Lê o mapa de adequabilidade de um cenário, reamostrado para exibição.
    Devolve (array, extent) ou None se o cenário ainda não foi predito."""
    f = pred_dir / cenario / f"{slug}_{cenario}_adequabilidade.tif"
    if not f.exists():
        return None
    with rasterio.open(f) as r:
        a = r.read(1, out_shape=(LADO, LADO), resampling=Resampling.average)
        b = r.bounds
    return np.asarray(a, float), (b.left, b.right, b.bottom, b.top)


def _pinta(ax, arr, extent, titulo: str, vmin=0.0, vmax=1.0, alerta: str = ""):
    """`alerta`: se preenchido, o painel é marcado como NÃO CONFIÁVEL — moldura, título em
    cor de aviso E texto escrito. Cor sozinha não serve: quem imprime em preto-e-branco ou
    tem daltonismo perderia a marcação, e um mapa que não discrimina publicado como se
    discriminasse é pior que mapa nenhum."""
    im = ax.imshow(arr, extent=extent, origin="upper", cmap=CMAP,
                   vmin=vmin, vmax=vmax, interpolation="nearest")
    ax.set_title(titulo, fontsize=8.5, color=(ALERTA if alerta else TINTA), pad=3,
                 fontweight=("bold" if alerta else "normal"))
    ax.set_xticks([]); ax.set_yticks([])
    for s in ax.spines.values():
        s.set_edgecolor(ALERTA if alerta else "#d8d8d8")
        s.set_linewidth(2.0 if alerta else 0.6)
    if alerta:
        ax.text(0.5, -0.035, alerta, ha="center", va="top", fontsize=7.2,
                color=ALERTA, fontweight="bold", transform=ax.transAxes)
    return im


# ---------------------------------------------------------------------------
def painel(pred_dir: Path, slug: str, especie: str, out: Path,
           coer: list[dict] | None = None) -> Path | None:
    # cenários que não passaram no teste de coerência ecológica ganham marcação no painel
    ruins = {r["cenario"]: r for r in (coer or []) if r.get("veredito") != "APROVADO"}

    def _alerta(cen: str) -> str:
        r = ruins.get(cen)
        return "" if r is None else f"⚠ não discrimina (razão {r['razao_dentro_fora']:.2f})"

    mensais = [(c, r) for c, r in ((f"mensal_{i+1:02d}_{m}", MES_ROTULO[i])
                                   for i, m in enumerate(MESES))]
    dados_m = [(rot, _ler(pred_dir, slug, cen), _alerta(cen)) for cen, rot in mensais]
    dados_c = [(rot, _ler(pred_dir, slug, cen), _alerta(cen)) for cen, rot in CLIMA]
    n_m = sum(1 for _r, d, _a in dados_m if d is not None)
    n_c = sum(1 for _r, d, _a in dados_c if d is not None)
    if n_m + n_c == 0:
        _p("[fig] nenhum cenário predito ainda — painel não gerado.")
        return None
    _p(f"[fig] painel: {n_m}/12 mensais + {n_c}/5 climatológicos")

    # Quatro FAIXAS: título, meses, presente+futuros, nota. Faixas dedicadas para os textos
    # evitam a colisão que acontece quando fig.suptitle e o suptitle de cada bloco disputam
    # o mesmo topo (as subfigures preenchem a figura inteira, não sobra margem).
    fig = plt.figure(figsize=(11.5, 14.4))
    fig.patch.set_facecolor("white")
    sub = fig.subfigures(4, 1, height_ratios=[0.13, 3.05, 1.30, 0.17], hspace=0.0)

    faixa_titulo = sub[0].subplots()
    faixa_titulo.axis("off")
    faixa_titulo.text(0.5, 0.45, f"{especie} — adequabilidade ambiental no Brasil",
                      ha="center", va="center", fontsize=16, color=TINTA,
                      fontweight="bold", transform=faixa_titulo.transAxes)

    # --- bloco 1: os 12 meses ---
    topo = sub[1]
    topo.suptitle("Ciclo sazonal — médias mensais de 2015–2024", fontsize=11.5,
                  color=TINTA, fontweight="bold", y=1.0)
    axs = topo.subplots(3, 4)
    im_m = None
    for ax, (rot, d, al) in zip(axs.ravel(), dados_m):
        if d is None:
            ax.set_title(rot, fontsize=8.5, color=TINTA_FRACA, pad=3)
            ax.text(0.5, 0.5, "(pendente)", ha="center", va="center",
                    fontsize=8, color=TINTA_FRACA, transform=ax.transAxes)
            ax.set_xticks([]); ax.set_yticks([])
            for s in ax.spines.values():
                s.set_edgecolor("#e8e8e8")
            continue
        im_m = _pinta(ax, d[0], d[1], rot, alerta=al)
    if im_m is not None:
        # pad generoso: os cenários reprovados escrevem o alerta ABAIXO do mapa, e com
        # pad pequeno o texto da 3ª linha cai em cima da barra de cor.
        cb = topo.colorbar(im_m, ax=axs, orientation="horizontal",
                           fraction=0.035, pad=0.075, aspect=55)
        cb.set_label("adequabilidade (probabilidade de presença)", fontsize=8.5, color=TINTA)
        cb.ax.tick_params(labelsize=7.5, colors=TINTA_FRACA)
        cb.outline.set_edgecolor("#d8d8d8")

    # --- bloco 2: presente + futuros ---
    base = sub[2]
    base.suptitle("Presente e futuros — médias de longo prazo", fontsize=11.5, color=TINTA,
                  fontweight="bold", y=1.0)
    axs2 = base.subplots(1, 5)
    im_c = None
    for ax, (rot, d, al) in zip(np.atleast_1d(axs2), dados_c):
        if d is None:
            ax.set_title(rot, fontsize=8.5, color=TINTA_FRACA, pad=3)
            ax.text(0.5, 0.5, "(pendente)", ha="center", va="center",
                    fontsize=8, color=TINTA_FRACA, transform=ax.transAxes)
            ax.set_xticks([]); ax.set_yticks([])
            for s in ax.spines.values():
                s.set_edgecolor("#e8e8e8")
            continue
        im_c = _pinta(ax, d[0], d[1], rot, alerta=al)
    if im_c is not None:
        cb = base.colorbar(im_c, ax=axs2, orientation="horizontal",
                           fraction=0.055, pad=0.03, aspect=55)
        cb.set_label("adequabilidade (probabilidade de presença)", fontsize=8.5, color=TINTA)
        cb.ax.tick_params(labelsize=7.5, colors=TINTA_FRACA)
        cb.outline.set_edgecolor("#d8d8d8")

    faixa_nota = sub[3].subplots()
    faixa_nota.axis("off")
    faixa_nota.text(
        0.5, 0.5,
        "Os 17 cenários vêm do MESMO modelo (Random Forest climatológico, 7 preditores) — "
        "logo, são comparáveis valor a valor.\n"
        "Onde o modelo está fora da faixa em que foi treinado, o mapa `_extrapolacao.tif` do "
        "cenário marca célula a célula: leia os dois juntos.",
        ha="center", va="center", fontsize=9, color=TINTA_FRACA,
        linespacing=1.5, transform=faixa_nota.transAxes)

    out.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out, dpi=150, facecolor="white")
    plt.close(fig)
    _p(f"[fig] painel salvo: {out}")
    return out


# ---------------------------------------------------------------------------
def _quadro(arr, extent, titulo: str, subtitulo: str, especie: str,
            alerta: str = "") -> "Image":
    """Renderiza UM quadro do GIF. `alerta` marca o quadro como não confiável — num GIF
    isso é ainda mais necessário que no painel: os quadros passam rápido e ninguém vai
    consultar uma tabela para saber que julho não discrimina."""
    from PIL import Image
    fig, ax = plt.subplots(figsize=(6.4, 6.9))
    fig.patch.set_facecolor("white")
    im = ax.imshow(arr, extent=extent, origin="upper", cmap=CMAP,
                   vmin=0, vmax=1, interpolation="nearest")
    ax.set_xticks([]); ax.set_yticks([])
    for s in ax.spines.values():
        s.set_edgecolor(ALERTA if alerta else "#d8d8d8")
        s.set_linewidth(3.0 if alerta else 0.6)
    ax.set_title(f"{especie}\n{titulo}", fontsize=14,
                 color=(ALERTA if alerta else TINTA), fontweight="bold", pad=8)
    if alerta:
        ax.text(0.5, 0.985, alerta, ha="center", va="top", fontsize=11,
                color="white", fontweight="bold", transform=ax.transAxes,
                bbox=dict(boxstyle="round,pad=0.35", facecolor=ALERTA, edgecolor="none"))
    cb = fig.colorbar(im, ax=ax, orientation="horizontal", fraction=0.045,
                      pad=0.03, aspect=38)
    cb.set_label(subtitulo, fontsize=9, color=TINTA_FRACA)
    cb.ax.tick_params(labelsize=8, colors=TINTA_FRACA)
    cb.outline.set_edgecolor("#d8d8d8")
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=100, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    buf.seek(0)
    return Image.open(buf).convert("P", palette=Image.ADAPTIVE)


def _mapa_alertas(coer: list[dict] | None) -> dict:
    return {r["cenario"]: f"⚠ não discrimina (razão {r['razao_dentro_fora']:.2f})"
            for r in (coer or []) if r.get("veredito") != "APROVADO"}


def gif_mensal(pred_dir: Path, slug: str, especie: str, out: Path, ms: int = 700,
               coer: list[dict] | None = None) -> Path | None:
    alertas = _mapa_alertas(coer)
    quadros = []
    for i, m in enumerate(MESES):
        cen = f"mensal_{i+1:02d}_{m}"
        d = _ler(pred_dir, slug, cen)
        if d is None:
            continue
        quadros.append(_quadro(d[0], d[1], MES_ROTULO[i],
                               "adequabilidade (probabilidade de presença)", especie,
                               alertas.get(cen, "")))
    if len(quadros) < 2:
        _p(f"[fig] GIF mensal: só {len(quadros)} quadro(s) — pulando.")
        return None
    out.parent.mkdir(parents=True, exist_ok=True)
    quadros[0].save(out, save_all=True, append_images=quadros[1:],
                    duration=ms, loop=0, optimize=True)
    _p(f"[fig] GIF mensal salvo ({len(quadros)} quadros): {out}")
    return out


def gif_futuro(pred_dir: Path, slug: str, especie: str, out: Path, ms: int = 1100,
               coer: list[dict] | None = None) -> Path | None:
    """Presente → 2050 → 2100, um GIF por trajetória de emissões (os dois SSP no mesmo
    arquivo, em sequência), todos do MESMO modelo — logo, comparáveis entre si."""
    seq = [("anual_2015_2024", "Presente (2015–2024)"),
           ("futuro_2050_ssp245", "2050 — SSP2-4.5 (intermediário)"),
           ("futuro_2100_ssp245", "2100 — SSP2-4.5 (intermediário)"),
           ("anual_2015_2024", "Presente (2015–2024)"),
           ("futuro_2050_ssp585", "2050 — SSP5-8.5 (pessimista)"),
           ("futuro_2100_ssp585", "2100 — SSP5-8.5 (pessimista)")]
    alertas = _mapa_alertas(coer)
    quadros = []
    for cen, rot in seq:
        d = _ler(pred_dir, slug, cen)
        if d is None:
            continue
        quadros.append(_quadro(d[0], d[1], rot,
                               "adequabilidade (probabilidade de presença)", especie,
                               alertas.get(cen, "")))
    if len(quadros) < 2:
        _p(f"[fig] GIF futuro: só {len(quadros)} quadro(s) — pulando.")
        return None
    out.parent.mkdir(parents=True, exist_ok=True)
    quadros[0].save(out, save_all=True, append_images=quadros[1:],
                    duration=ms, loop=0, optimize=True)
    _p(f"[fig] GIF futuro salvo ({len(quadros)} quadros): {out}")
    return out


# ---------------------------------------------------------------------------
def _achar_treino(slug: str) -> Path | None:
    """CSV de treino do modelo climatológico mais recente da espécie."""
    cands = list((BASE07 / slug).rglob("modelo_rf_climatologico/predictor_climatologico.csv"))
    if not cands:
        return None
    cands.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return cands[0]


def coerencia(pred_dir: Path, slug: str, treino: Path | None) -> list[dict]:
    """Roda o teste de coerência ecológica em cada cenário predito.

    Existe porque a extrapolação NÃO basta: o modelo diário passou nela (0,1%) e mesmo
    assim invertia a distribuição da espécie. Este teste pega o que aquele não pega."""
    if treino is None or not treino.exists():
        _p("[coer] CSV de treino não encontrado — teste de coerência pulado.")
        return []
    sys.path.insert(0, str(ROOT / "01_rotina" / "07_validacao_ecologica"))
    try:
        from teste_coerencia_ecologica import testar
    except ImportError as e:  # noqa: BLE001
        _p(f"[coer] teste indisponível ({e}) — pulando.")
        return []
    out = []
    for d in sorted(x for x in pred_dir.iterdir() if x.is_dir() and not x.name.startswith("_")):
        f = d / f"{slug}_{d.name}_adequabilidade.tif"
        if not f.exists():
            continue
        try:
            r = testar(f, treino)
            r["cenario"] = d.name
            out.append(r)
        except Exception as e:  # noqa: BLE001 — um cenário ruim não derruba o relatório
            _p(f"[coer] {d.name}: falhou ({type(e).__name__}: {str(e)[:100]})")
    if out:
        (pred_dir / "coerencia_ecologica.json").write_text(
            json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
        reprovados = [r["cenario"] for r in out if r["veredito"] != "APROVADO"]
        _p(f"[coer] {len(out)} cenário(s) testados | "
           + (f"ATENÇÃO, não aprovados: {reprovados}" if reprovados else "todos APROVADOS"))
    return out


def indice_produtos(pred_dir: Path, slug: str, especie: str,
                    coer: list[dict] | None = None) -> Path:
    """Escreve INDICE_PRODUTOS.md: o que é cada arquivo entregue.

    Os GeoTIFF são o PRODUTO PRINCIPAL — o PNG e os GIF são leitura rápida. Sem um índice,
    um `.tif` chamado "extrapolacao" parece diagnóstico interno e acaba descartado; ele é
    parte do resultado (diz onde o mapa ao lado não tem lastro)."""
    modelo_de = lambda c: "CLIMATOLÓGICO"  # noqa: E731 — os 17 cenários usam o mesmo
    linhas = [
        f"# Produtos finais — {especie}",
        "",
        "Gerado por `05_utils/figuras_cenarios.py`. **Os GeoTIFF são o produto principal**; "
        "o PNG e os GIF são leitura rápida.",
        "",
    ]
    reprovados = [r for r in (coer or []) if r.get("veredito") != "APROVADO"]
    if reprovados:
        nomes = ", ".join(f"`{r['cenario']}`" for r in reprovados)
        linhas += [
            "> ## ⚠ LEIA ANTES DE USAR",
            ">",
            f"> **{len(reprovados)} dos {len(coer)} cenários NÃO passaram no teste de "
            f"coerência ecológica**: {nomes}.",
            ">",
            "> Nesses mapas o modelo pontua a área onde a espécie ocorre praticamente igual "
            "(ou abaixo) do resto do território — ou seja, ele **deixou de discriminar**. "
            "São os meses de seca, em que a chuva sai muito da faixa em que o modelo foi "
            "treinado (até 75% das células extrapoladas).",
            ">",
            "> Esses arquivos ficam na entrega porque a medição é um resultado — mas **não "
            "devem ser lidos como mapas de distribuição**. Estão marcados em vermelho no "
            "painel e nos GIF.",
            "",
        ]
    linhas += [
        "## Rasters por cenário (GeoTIFF, EPSG:4326, 0,01° ≈ 1 km, Brasil)",
        "",
        "Cada pasta de cenário traz três arquivos:",
        "",
        "| sufixo | o que é | escala |",
        "|---|---|---|",
        "| `_adequabilidade.tif` | probabilidade de presença (média das 10 réplicas) | 0 a 1 |",
        "| `_incerteza.tif` | desvio-padrão entre as 10 réplicas — onde o modelo hesita | 0 a ~0,5 |",
        "| `_extrapolacao.tif` | nº de variáveis fora da faixa de treino naquela célula | 0 = confiável; 1..6 = extrapolando; 255 = fora do Brasil |",
        "",
        "> O `_extrapolacao.tif` **não é diagnóstico interno, é resultado**: onde ele é > 0, "
        "o Random Forest está repetindo o caso mais parecido que viu, não calculando.",
        "",
        "| cenário | modelo | adequabilidade | incerteza | extrapolação |",
        "|---|---|---|---|---|",
    ]
    cenarios = sorted(d for d in pred_dir.iterdir() if d.is_dir())
    for d in cenarios:
        marca = lambda s: ("✓" if (d / f"{slug}_{d.name}_{s}.tif").exists() else "—")  # noqa: E731
        linhas.append(f"| `{d.name}` | {modelo_de(d.name)} | {marca('adequabilidade')} "
                      f"| {marca('incerteza')} | {marca('extrapolacao')} |")

    if coer:
        piores = sorted(coer, key=lambda r: r["razao_dentro_fora"])[:1]
        linhas += [
            "",
            "## Validação: coerência ecológica",
            "",
            "O modelo pontua mais alto DENTRO do envelope das presenças reais do que fora? "
            "Este teste existe porque a extrapolação sozinha não basta — o modelo diário "
            "passou nela (0,1%) e mesmo assim invertia a distribuição da espécie.",
            "",
            "| cenário | dentro | fora | razão | veredito |",
            "|---|---|---|---|---|",
        ]
        for r in coer:
            linhas.append(
                f"| `{r['cenario']}` | {r['adequabilidade_media_dentro']:.3f} "
                f"| {r['adequabilidade_media_fora']:.3f} "
                f"| **{r['razao_dentro_fora']:.2f}** | {r['veredito']} |")
        linhas += [
            "",
            f"Razão = adequabilidade média dentro do envelope ÷ fora. **Acima de "
            f"{1.25:.2f} aprova**; abaixo de 1,00 é inversão (mapa inutilizável). "
            f"Pior cenário desta rodada: `{piores[0]['cenario']}` com "
            f"{piores[0]['razao_dentro_fora']:.2f}.",
            "",
            "Detalhes em `coerencia_ecologica.json`. Teste: "
            "`04_modeling/teste_coerencia_ecologica.py`.",
        ]

    linhas += [
        "",
        "## Figuras",
        "",
        "| arquivo | o que mostra |",
        "|---|---|",
        f"| `{slug}_painel_cenarios.png` | todos os cenários numa figura, mesmo modelo e mesma escala |",
        f"| `{slug}_ciclo_mensal.gif` | os 12 meses animados — ciclo sazonal |",
        f"| `{slug}_futuros.gif` | presente → 2050 → 2100, nas duas trajetórias de emissão |",
        "",
        "## Ao usar estes arquivos, lembre",
        "",
        "1. **Uma régua só.** Os 17 cenários vêm do mesmo modelo, então adequabilidade "
        "compara valor a valor entre qualquer par de mapas.",
        "2. **Os meses secos têm muita extrapolação.** O modelo aprendeu com MÉDIAS ANUAIS, "
        "cuja faixa de chuva é estreita (1,3 a 7,4 mm/dia); a chuva de um mês sai muito disso "
        "— em julho o Brasil vai de 0,001 a 13,9 mm/dia. Resultado: de 15% (novembro) a 75% "
        "(julho) das células ficam fora da faixa de treino. Ler sempre com o `_extrapolacao.tif`.",
        "3. **2100 SSP5-8.5 é 70,6% extrapolação.** Com +3,57 K, quase todo o Brasil fica mais "
        "quente que qualquer ponto onde a espécie foi observada. É limite do método "
        "(clima sem análogo), não defeito — leia o `_extrapolacao.tif` junto.",
        "4. **Vegetação e uso do solo estão congelados nos cenários futuros.** O mapa responde "
        "\"mantida a cobertura atual, como muda a adequabilidade climática\" — não responde "
        "\"onde a espécie estará\".",
        "5. **O modelo diário foi testado e descartado** para os cenários mensais: ele inverte "
        "a distribuição da espécie (Amazônia acima da Mata Atlântica). Ver "
        "`_descartado_modelo_diario/LEIA-ME.md`.",
        "",
        "Metodologia completa: `documentation/15_cenarios_predicao_documentacao.md`.",
        "",
    ]
    alvo = pred_dir / "INDICE_PRODUTOS.md"
    alvo.write_text("\n".join(linhas), encoding="utf-8")
    _p(f"[fig] índice salvo: {alvo}")
    return alvo


def main() -> None:
    p = argparse.ArgumentParser(description="Painel PNG + GIFs dos cenários de predição.")
    p.add_argument("--especie", required=True)
    p.add_argument("--pred_dir", default=None,
                   help="Pasta das predições. Vazio = 07/<Especie>/predicoes_cenarios/.")
    p.add_argument("--outdir", default=None, help="Vazio = a própria pasta das predições.")
    p.add_argument("--ms_mensal", type=int, default=700, help="ms por quadro no GIF mensal.")
    p.add_argument("--treino", default=None,
                   help="CSV de treino p/ o teste de coerência. Vazio = busca o "
                        "predictor_climatologico.csv mais recente da espécie.")
    a = p.parse_args()

    slug = naming.slug_especie(a.especie)
    pred_dir = Path(a.pred_dir) if a.pred_dir else BASE07 / slug / "predicoes_cenarios"
    if not pred_dir.exists():
        raise SystemExit(f"[fig] pasta de predições não encontrada: {pred_dir}")
    outdir = Path(a.outdir) if a.outdir else pred_dir

    _p(f"[fig] {a.especie} | lendo de {pred_dir}")
    # A coerência vem PRIMEIRO: o painel e os GIF precisam saber quais cenários marcar
    # como não confiáveis. Publicar um mapa que não discrimina, sem marcação, é pior
    # que não publicá-lo.
    coer = coerencia(pred_dir, slug, Path(a.treino) if a.treino else _achar_treino(slug))
    painel(pred_dir, slug, a.especie, outdir / f"{slug}_painel_cenarios.png", coer)
    gif_mensal(pred_dir, slug, a.especie, outdir / f"{slug}_ciclo_mensal.gif",
               a.ms_mensal, coer)
    gif_futuro(pred_dir, slug, a.especie, outdir / f"{slug}_futuros.gif", coer=coer)
    indice_produtos(pred_dir, slug, a.especie, coer)


if __name__ == "__main__":
    main()
