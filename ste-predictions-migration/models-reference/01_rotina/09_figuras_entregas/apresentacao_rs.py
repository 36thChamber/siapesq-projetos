# -*- coding: utf-8 -*-
r"""
apresentacao_rs.py — material de apresentação dos resultados do RS (refino 250 m).

Para cada um dos 5 modelos projetados na janela RS 275 m (03_dados_saida\RS_refino_250m):
  1. Um PNG individual por cenário (17: anual + 12 mensais + 4 futuros CMIP6), com
     limite do RS (IBGE), presenças de treino, colorbar única (viridis, 0–1) e o
     veredito do teste de coerência ecológica estampado no mapa.
  2. Dois GIFs da dinâmica predita: ciclo mensal (12 quadros) e presente→2050→2100
     por SSP.
  3. Estatísticas por cenário DENTRO do polígono do RS (média, % células >= 0,5,
     incerteza média) — insumo da avaliação de qualidade.
Depois agrega tudo (métricas de treino, coerência, extrapolação, validação delta)
em Avaliacao_Qualidade_RS.json/.md e monta o relatório HTML autocontido que
relaciona os resultados com a ecologia real de cada espécie e traz o painel de
indicadores para validação.

Uso (da raiz do projeto):
  .venv\Scripts\python.exe 01_rotina\09_figuras_entregas\apresentacao_rs.py
Flags: --so_modelo <chave>  --pular_png  --pular_gif  --pular_html
"""
import argparse
import base64
import io
import json
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import rasterio
from matplotlib import colormaps
from PIL import Image
from rasterio.enums import Resampling
from rasterio.features import geometry_mask

ROOT = Path(__file__).resolve().parents[2]
REFINO = ROOT / "03_dados_saida" / "RS_refino_250m" / "2026-08-17"
FINAIS = ROOT / "04_resultados_finais"
OUTBASE = FINAIS / "RS_apresentacao_250m" / "2026-08-18"
RS_GEOJSON = ROOT / "05_dados_auxiliares" / "ibge_cache" / "rs_ibge.geojson"
BBOX = (-60.5, -34.0, -49.5, -25.0)  # janela RS do refino

MODELOS = {
    "caraya_regional_v2": {
        "prefixo": "Alouatta_caraya",
        "especie": "Alouatta caraya",
        "titulo": "Bugio-preto (Alouatta caraya) — modelo REGIONAL RS v2",
        "modelo_dir": FINAIS / "Alouatta_caraya" / "2026-08-12_regional_rs_v2" / "modelo",
        "eval_csv": "rf_Alouatta_caraya_v2_eval.csv",
    },
    "caraya_nacional_v3": {
        "prefixo": "Alouatta_caraya",
        "especie": "Alouatta caraya",
        "titulo": "Bugio-preto (Alouatta caraya) — modelo NACIONAL v3",
        "modelo_dir": FINAIS / "Alouatta_caraya" / "2026-08-14_metodologia_v3" / "modelo",
        "eval_csv": "rf_Alouatta_caraya_v3_1_eval.csv",
    },
    "guariba_v3": {
        "prefixo": "Alouatta_guariba",
        "especie": "Alouatta guariba",
        "titulo": "Bugio-ruivo (Alouatta guariba clamitans) — modelo NACIONAL v3",
        "modelo_dir": FINAIS / "Alouatta_guariba" / "2026-08-14_metodologia_v3" / "modelo",
        "eval_csv": "rf_Alouatta_guariba_v3_eval.csv",
    },
    "nigritus_v3": {
        "prefixo": "Sapajus_nigritus",
        "especie": "Sapajus nigritus",
        "titulo": "Macaco-prego (Sapajus nigritus) — modelo NACIONAL v3",
        "modelo_dir": FINAIS / "Sapajus_nigritus" / "2026-08-14_metodologia_v3" / "modelo",
        "eval_csv": "rf_Sapajus_nigritus_v3_eval.csv",
    },
    "grupo_v3": {
        "prefixo": "Primatas_grupo",
        "especie": "Primatas (grupo)",
        "titulo": "Grupo Primatas (3 espécies) — modelo NACIONAL v3",
        "modelo_dir": FINAIS / "Primatas_grupo" / "2026-08-17_metodologia_v3" / "modelo",
        "eval_csv": "rf_Primatas_grupo_v3_eval.csv",
    },
}

MESES = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho",
         "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]
MESES_PT = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
            "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]

CENARIOS = [("anual_2015_2024", "Anual 2015–2024 (presente)")]
CENARIOS += [(f"mensal_{i+1:02d}_{m}", f"Mensal — {MESES_PT[i]}") for i, m in enumerate(MESES)]
CENARIOS += [
    ("futuro_2050_ssp245", "Futuro 2050 — SSP2-4.5 (intermediário)"),
    ("futuro_2050_ssp585", "Futuro 2050 — SSP5-8.5 (pessimista)"),
    ("futuro_2100_ssp245", "Futuro 2100 — SSP2-4.5 (intermediário)"),
    ("futuro_2100_ssp585", "Futuro 2100 — SSP5-8.5 (pessimista)"),
]
ROTULO = dict(CENARIOS)

COR_VEREDITO = {"APROVADO": "#2e7d32", "SUSPEITO": "#ef6c00", "REPROVADO": "#c62828"}


def carregar_rs():
    import geopandas as gpd
    gdf = gpd.read_file(RS_GEOJSON)
    return gdf.to_crs("EPSG:4326") if gdf.crs else gdf


def presencas_rs(cfg):
    csv = cfg["modelo_dir"] / "predictor_climatologico.csv"
    if not csv.exists():
        return None
    df = pd.read_csv(csv, usecols=["decimalLatitude", "decimalLongitude", "sp"])
    df = df[(df.sp == 1)
            & df.decimalLongitude.between(BBOX[0], BBOX[2])
            & df.decimalLatitude.between(BBOX[1], BBOX[3])]
    return df


def ler_raster(path, fator=4):
    """Lê o GeoTIFF decimado por `fator` (média). Devolve (masked_array, extent, transform_dec)."""
    with rasterio.open(path) as src:
        w, h = src.width // fator, src.height // fator
        arr = src.read(1, out_shape=(h, w), resampling=Resampling.average)
        nodata = src.nodata
        b = src.bounds
        t = src.transform * src.transform.scale(src.width / w, src.height / h)
    arr = np.ma.masked_invalid(arr)
    if nodata is not None:
        arr = np.ma.masked_equal(arr, nodata)
    return arr, (b.left, b.right, b.bottom, b.top), t


def mascara_rs(shape, transform, rs_gdf):
    geoms = [g.__geo_interface__ for g in rs_gdf.geometry]
    return ~geometry_mask(geoms, out_shape=shape, transform=transform, invert=False)


def desenhar_mapa(arr, extent, rs_gdf, pres, titulo, subtitulo, veredito, out_png,
                  largura_in=9.2, dpi=150, com_pontos=True, para_gif=False):
    prop = (extent[3] - extent[2]) / (extent[1] - extent[0])
    fig, ax = plt.subplots(figsize=(largura_in, largura_in * prop * 1.12), dpi=dpi)
    cmap = colormaps["viridis"].copy()
    cmap.set_bad("#eceff1")
    im = ax.imshow(arr, extent=extent, origin="upper", cmap=cmap, vmin=0, vmax=1,
                   interpolation="nearest")
    rs_gdf.boundary.plot(ax=ax, color="white", linewidth=1.4, alpha=.95)
    rs_gdf.boundary.plot(ax=ax, color="#37474f", linewidth=0.6)
    if com_pontos and pres is not None and len(pres):
        ax.scatter(pres.decimalLongitude, pres.decimalLatitude, s=3, c="#ff5252",
                   edgecolors="white", linewidths=0.15, alpha=.75, zorder=5,
                   label=f"Presenças de treino na janela ({len(pres)})")
        ax.legend(loc="lower left", fontsize=7 if para_gif else 8, framealpha=.85)
    ax.set_xlim(extent[0], extent[1]); ax.set_ylim(extent[2], extent[3])
    ax.set_xlabel("Longitude"); ax.set_ylabel("Latitude")
    ax.tick_params(labelsize=8)
    ax.set_title(titulo, fontsize=11 if para_gif else 12, fontweight="bold", loc="left",
                 pad=10)
    if subtitulo:
        ax.text(0, -0.085, subtitulo, transform=ax.transAxes, fontsize=8.5,
                color="#455a64", va="top")
    if veredito:
        ax.text(0.99, 0.985, veredito, transform=ax.transAxes, fontsize=10, fontweight="bold",
                color="white", ha="right", va="top",
                bbox=dict(boxstyle="round,pad=0.35", fc=COR_VEREDITO.get(veredito, "#546e7a"),
                          ec="none", alpha=.92))
    cb = fig.colorbar(im, ax=ax, fraction=0.038, pad=0.02)
    cb.set_label("Adequabilidade de habitat (0–1)", fontsize=9)
    cb.ax.tick_params(labelsize=8)
    fig.tight_layout()
    if out_png:
        fig.savefig(out_png, bbox_inches="tight")
        plt.close(fig)
        return None
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    return Image.open(buf).convert("RGB")


def montar_gifs(frames_por_cenario, outdir, prefixo, ms_mensal=700, ms_futuro=1400):
    """frames_por_cenario: dict cenario -> PIL.Image (mesmo tamanho)."""
    def salvar(nome, seq, dur):
        seq = [f for f in seq if f is not None]
        if len(seq) < 2:
            return None
        # tamanho comum (bbox_inches='tight' pode variar 1-2 px)
        wmin = min(f.width for f in seq); hmin = min(f.height for f in seq)
        seq = [f.crop((0, 0, wmin, hmin)) for f in seq]
        pal = [f.quantize(colors=160, method=Image.MEDIANCUT) for f in seq]
        p = outdir / nome
        pal[0].save(p, save_all=True, append_images=pal[1:], duration=dur, loop=0,
                    optimize=True)
        return p
    g1 = salvar(f"{prefixo}_ciclo_mensal.gif",
                [frames_por_cenario.get(f"mensal_{i+1:02d}_{m}") for i, m in enumerate(MESES)],
                ms_mensal)
    seq_fut = ["anual_2015_2024", "futuro_2050_ssp245", "futuro_2100_ssp245",
               "anual_2015_2024", "futuro_2050_ssp585", "futuro_2100_ssp585"]
    g2 = salvar(f"{prefixo}_futuros.gif", [frames_por_cenario.get(c) for c in seq_fut], ms_futuro)
    return g1, g2


def processar_modelo(chave, cfg, rs_gdf, args):
    src_dir = REFINO / chave
    outdir = OUTBASE / chave
    png_dir = outdir / "png_cenarios"
    png_dir.mkdir(parents=True, exist_ok=True)
    pres = presencas_rs(cfg)
    prefixo = cfg["prefixo"]

    # métricas de treino (média ± dp entre réplicas bootstrap)
    ev = pd.read_csv(cfg["modelo_dir"] / cfg["eval_csv"])
    metricas_treino = {c: {"media": round(float(ev[c].mean()), 4),
                           "dp": round(float(ev[c].std()), 4)}
                       for c in ["AUC", "COR", "TSS", "MCC", "F1"] if c in ev.columns}
    metricas_treino["n_replicas"] = int(len(ev))

    cenarios_out, frames, mask_cache = {}, {}, {}
    for cen, rotulo in CENARIOS:
        cdir = src_dir / cen
        adeq = cdir / f"{prefixo}_{cen}_adequabilidade.tif"
        if not adeq.exists():
            print(f"  [!] {chave}/{cen}: adequabilidade ausente — pulado")
            continue
        coer_j = cdir / f"{prefixo}_{cen}_coerencia.json"
        coer = json.loads(coer_j.read_text(encoding="utf-8")) if coer_j.exists() else {}
        veredito = coer.get("veredito")

        arr, extent, t = ler_raster(adeq, fator=4)
        if "rs" not in mask_cache:
            mask_cache["rs"] = mascara_rs(arr.shape, t, rs_gdf)
        m = mask_cache["rs"] & ~arr.mask
        dentro = arr.data[m]
        stats = {
            "adequabilidade_media_rs": round(float(dentro.mean()), 4) if dentro.size else None,
            "pct_rs_acima_0.5": round(float((dentro >= 0.5).mean() * 100), 2) if dentro.size else None,
        }
        inc_tif = cdir / f"{prefixo}_{cen}_incerteza.tif"
        if inc_tif.exists():
            inc, _, _ = ler_raster(inc_tif, fator=4)
            mi = mask_cache["rs"] & ~inc.mask
            if mi.any():
                stats["incerteza_media_rs"] = round(float(inc.data[mi].mean()), 4)

        sub = (f"Razão dentro/fora: {coer.get('razao_dentro_fora', '—')}  ·  "
               f"fantasmas (>0,5 longe das presenças): {coer.get('pct_acima_0.5_fora', '—')}%  ·  "
               f"média no RS: {stats['adequabilidade_media_rs']}")
        if not args.pular_png:
            out_png = png_dir / f"{prefixo}_{cen}.png"
            desenhar_mapa(arr, extent, rs_gdf, pres, f"{cfg['titulo']}\n{rotulo}", sub,
                          veredito, out_png)
        if not args.pular_gif:
            arr8 = arr[::2, ::2]
            frames[cen] = desenhar_mapa(arr8, extent, rs_gdf, pres,
                                        f"{cfg['especie']} — {rotulo}", None, veredito,
                                        None, largura_in=6.4, dpi=100, para_gif=True)
        ex_j = cdir / f"{prefixo}_{cen}_extrapolacao.json"
        extrap = json.loads(ex_j.read_text(encoding="utf-8")) if ex_j.exists() else None
        cenarios_out[cen] = {"rotulo": rotulo, "coerencia": coer or None,
                             "extrapolacao": extrap, **stats}
        print(f"  {chave}/{cen}: veredito={veredito} media_rs={stats['adequabilidade_media_rs']}")

    gifs = (None, None)
    if not args.pular_gif:
        gifs = montar_gifs(frames, outdir, prefixo)

    # deltas dos futuros vs anual (% de mudança na fração >= 0,5 dentro do RS)
    base = cenarios_out.get("anual_2015_2024", {}).get("pct_rs_acima_0.5")
    for cen in ["futuro_2050_ssp245", "futuro_2050_ssp585",
                "futuro_2100_ssp245", "futuro_2100_ssp585"]:
        if cen in cenarios_out and base:
            v = cenarios_out[cen]["pct_rs_acima_0.5"]
            cenarios_out[cen]["delta_pct_area_vs_anual"] = round(v - base, 2)

    return {"titulo": cfg["titulo"], "especie": cfg["especie"], "prefixo": prefixo,
            "fonte_predicoes": str(src_dir), "metricas_treino": metricas_treino,
            "n_presencas_treino_janela_rs": int(len(pres)) if pres is not None else None,
            "cenarios": cenarios_out,
            "gif_ciclo_mensal": str(gifs[0]) if gifs[0] else None,
            "gif_futuros": str(gifs[1]) if gifs[1] else None}


def resumo_vereditos(res):
    c = {"APROVADO": 0, "SUSPEITO": 0, "REPROVADO": 0, "SEM_TESTE": 0}
    for cen in res["cenarios"].values():
        v = (cen.get("coerencia") or {}).get("veredito")
        c[v if v in c else "SEM_TESTE"] += 1
    return c


def gerar_md(laudo, path_md):
    linhas = ["# Avaliação de qualidade — resultados RS 275 m (refino 2026-08-17)", ""]
    for chave, res in laudo["modelos"].items():
        mt = res["metricas_treino"]
        rv = resumo_vereditos(res)
        linhas += [f"## {res['titulo']}",
                   f"*Treino ({mt['n_replicas']} réplicas): AUC {mt['AUC']['media']} ± {mt['AUC']['dp']}"
                   f" · TSS {mt['TSS']['media']} ± {mt['TSS']['dp']}"
                   f" · COR {mt['COR']['media']} ± {mt['COR']['dp']}*",
                   f"*Vereditos: {rv['APROVADO']} aprovados · {rv['SUSPEITO']} suspeitos ·"
                   f" {rv['REPROVADO']} reprovados*", "",
                   "| Cenário | Veredito | Razão d/f | Fantasmas % | Média RS | % RS ≥ 0,5 | Incerteza média |",
                   "|---|---|---|---|---|---|---|"]
        for cen, _ in CENARIOS:
            d = res["cenarios"].get(cen)
            if not d:
                continue
            co = d.get("coerencia") or {}
            delta = d.get("delta_pct_area_vs_anual")
            extra = f" ({'+' if delta >= 0 else ''}{delta} p.p.)" if delta is not None else ""
            linhas.append(f"| {d['rotulo']} | {co.get('veredito', '—')} | "
                          f"{co.get('razao_dentro_fora', '—')} | {co.get('pct_acima_0.5_fora', '—')} | "
                          f"{d['adequabilidade_media_rs']} | {d['pct_rs_acima_0.5']}{extra} | "
                          f"{d.get('incerteza_media_rs', '—')} |")
        linhas.append("")
    path_md.write_text("\n".join(linhas), encoding="utf-8")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--so_modelo", choices=list(MODELOS), default=None)
    ap.add_argument("--pular_png", action="store_true")
    ap.add_argument("--pular_gif", action="store_true")
    args = ap.parse_args()

    rs_gdf = carregar_rs()
    OUTBASE.mkdir(parents=True, exist_ok=True)
    laudo = {"gerado_em": "2026-08-18", "janela": {"bbox": BBOX, "res_graus": 0.0025,
             "grade": "4400x3600 (~275 m)"}, "modelos": {}}
    delta_j = REFINO / "_validacao_delta" / "laudo_validacao_delta.json"
    if delta_j.exists():
        laudo["validacao_delta_grade"] = json.loads(delta_j.read_text(encoding="utf-8"))

    for chave, cfg in MODELOS.items():
        if args.so_modelo and chave != args.so_modelo:
            continue
        print(f"== {chave}")
        laudo["modelos"][chave] = processar_modelo(chave, cfg, rs_gdf, args)

    jpath = OUTBASE / "Avaliacao_Qualidade_RS.json"
    # mesclar com execução parcial anterior, se houver
    if args.so_modelo and jpath.exists():
        antigo = json.loads(jpath.read_text(encoding="utf-8"))
        antigo["modelos"].update(laudo["modelos"])
        laudo = {**antigo, **{k: v for k, v in laudo.items() if k != "modelos"},
                 "modelos": antigo["modelos"]}
    jpath.write_text(json.dumps(laudo, ensure_ascii=False, indent=1), encoding="utf-8")
    gerar_md(laudo, OUTBASE / "Avaliacao_Qualidade_RS.md")
    print(f"OK — laudo em {jpath}")


if __name__ == "__main__":
    main()
