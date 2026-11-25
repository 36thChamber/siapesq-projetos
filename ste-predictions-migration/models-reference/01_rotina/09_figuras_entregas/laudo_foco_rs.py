#!/usr/bin/env python3
# laudo_foco_rs.py — ÁREA FOCO: corredor rodoviário BR-290 (Osvaldo Aranha) / RS-030, entre
# Capivari do Sul e São Francisco de Paula (RS), objeto de MANEJO DE ESTRADA (atropelamento de
# primatas). É a "área biologicamente importante" do laudo (§20) e a validação ecológica local.
#
# O corredor sobe da planície costeira (Capivari do Sul, ~nível do mar) até o planalto/serra
# (São Francisco de Paula, ~900 m) — forte gradiente de altitude e vegetação, exatamente onde
# a diferença entre os modelos (altitude/uso do solo pesam mais no diário) mais aparece.
#
# Para cada espécie e modo (mapas do RS a 250 m já prontos), extrai a adequabilidade no
# corredor, % apto, diferença entre modos, cobertura de dados (nodata) e distância à presença
# mais próxima — insumo da recomendação de melhoria (o usuário sabe que o caraya ocorre ali,
# mas NÃO tem registros).
#
# Saída: foco_rs.json + figuras (corredor por espécie/modo; caraya em destaque).

from __future__ import annotations

import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import rasterio
from rasterio.windows import from_bounds

ROOT = Path(__file__).resolve().parent.parent.parent
BASE = ROOT / "03_dados_saida"
COMP = ROOT / "01_rotina" / "09_figuras_entregas" / "_comparacao_brasil"
RODADA = "2026-07-17"
ESPS = ["Alouatta_caraya", "Alouatta_guariba", "Sapajus_nigritus"]

# Sedes municipais (RS). Extremos do corredor de manejo.
CAPIVARI = dict(nome="Capivari do Sul", lat=-30.139, lon=-50.516)      # planície costeira
SFP = dict(nome="São Francisco de Paula", lat=-29.448, lon=-50.583)    # planalto/serra
# Caixa do corredor (engloba as duas sedes + a rodovia entre elas, com margem).
FOCO_BBOX = (-50.95, -30.25, -50.30, -29.40)   # W, S, E, N


def _rs_map(esp, modo):
    sub = "predicao_daily_RS" if modo == "daily" else "predicao_climatologico_RS"
    pre = "RS_daily_" if modo == "daily" else "RS_clima_"
    p = BASE / esp / RODADA / sub / f"{pre}{esp}_mean_RS.tif"
    return p if p.exists() else None


def _crop(p: Path, bbox):
    with rasterio.open(p) as s:
        win = from_bounds(*bbox, s.transform)
        a = s.read(1, window=win, masked=True).filled(np.nan).astype("float32")
        tr = s.window_transform(win)
    return a, tr


def _presencas(esp):
    ps = pd.read_csv(BASE / esp / RODADA / f"Pseudoabsence_{esp}_17_07_26.csv")
    pr = ps[ps.sp == 1]
    return pr.decimalLatitude.to_numpy(), pr.decimalLongitude.to_numpy()


def _dist_km(lat0, lon0, lats, lons):
    """Haversine (km) de um ponto a um conjunto."""
    R = 6371.0
    dlat = np.radians(lats - lat0); dlon = np.radians(lons - lon0)
    a = (np.sin(dlat / 2) ** 2 + np.cos(np.radians(lat0)) * np.cos(np.radians(lats)) *
         np.sin(dlon / 2) ** 2)
    return 2 * R * np.arcsin(np.sqrt(a))


def analisar():
    met = json.loads((COMP / "metricas.json").read_text(encoding="utf-8"))
    out = {"corredor": dict(capivari=CAPIVARI, sfp=SFP, bbox=FOCO_BBOX), "especies": {}}
    for esp in ESPS:
        thr = {"daily": met[esp]["daily"]["limiares"], "clima": met[esp]["clima"]["limiares"]}
        e = {"modos": {}}
        crops = {}
        for modo in ["daily", "clima"]:
            p = _rs_map(esp, modo)
            if p is None:
                continue
            a, tr = _crop(p, FOCO_BBOX); crops[modo] = a
            ok = np.isfinite(a)
            t_tss = thr[modo]["maxTSS"]; t_p10 = thr[modo]["p10_presenca"]
            e["modos"][modo] = dict(
                pixels_validos=int(ok.sum()),
                pixels_nodata=int((~ok).sum()),
                cobertura=float(ok.mean()),
                adeq_media=float(np.nanmean(a)), adeq_mediana=float(np.nanmedian(a)),
                adeq_min=float(np.nanmin(a)), adeq_max=float(np.nanmax(a)),
                adeq_dp=float(np.nanstd(a)),
                perc_apto_maxTSS=float((a[ok] >= t_tss).mean() * 100),
                perc_apto_p10=float((a[ok] >= t_p10).mean() * 100),
                limiar_maxTSS=t_tss, limiar_p10=t_p10)
        if "daily" in crops and "clima" in crops:
            d = crops["daily"] - crops["clima"]
            e["diferenca_media"] = float(np.nanmean(d))
            e["diferenca_abs_media"] = float(np.nanmean(np.abs(d)))
        # presença mais próxima do corredor (distância ao centro do bbox)
        lat_c = (FOCO_BBOX[1] + FOCO_BBOX[3]) / 2; lon_c = (FOCO_BBOX[0] + FOCO_BBOX[2]) / 2
        lats, lons = _presencas(esp)
        dc = _dist_km(lat_c, lon_c, lats, lons)
        # presenças DENTRO do bbox
        dentro = ((lats >= FOCO_BBOX[1]) & (lats <= FOCO_BBOX[3]) &
                  (lons >= FOCO_BBOX[0]) & (lons <= FOCO_BBOX[2])).sum()
        e["presencas_no_corredor"] = int(dentro)
        e["dist_presenca_mais_proxima_km"] = float(dc.min())
        e["total_presencas_especie"] = int(len(lats))
        out["especies"][esp] = e
    return out


def figura_corredor(res):
    fig, axes = plt.subplots(len(ESPS), 3, figsize=(13, 4.2 * len(ESPS)))
    for i, esp in enumerate(ESPS):
        crops = {}
        for modo in ["daily", "clima"]:
            p = _rs_map(esp, modo)
            crops[modo], tr = _crop(p, FOCO_BBOX)
        ext = [FOCO_BBOX[0], FOCO_BBOX[2], FOCO_BBOX[1], FOCO_BBOX[3]]
        d = crops["daily"] - crops["clima"]
        for j, (arr, tit, cmap, lim) in enumerate([
            (crops["daily"], "diário", "viridis", (0, 1)),
            (crops["clima"], "climatológico", "viridis", (0, 1)),
            (d, "diferença (diário − clima)", "RdBu_r", (-0.5, 0.5))]):
            ax = axes[i, j]
            im = ax.imshow(arr, cmap=cmap, vmin=lim[0], vmax=lim[1], extent=ext, origin="upper")
            for cidade in (CAPIVARI, SFP):
                ax.plot(cidade["lon"], cidade["lat"], "*", color="red", ms=13,
                        markeredgecolor="white")
                ax.annotate(cidade["nome"], (cidade["lon"], cidade["lat"]),
                            fontsize=7, color="red", xytext=(3, 3), textcoords="offset points")
            ax.plot([CAPIVARI["lon"], SFP["lon"]], [CAPIVARI["lat"], SFP["lat"]],
                    "--", color="white", lw=1, alpha=0.7)
            ax.set_title(f"{esp.replace('_',' ')} — {tit}", fontsize=9)
            plt.colorbar(im, ax=ax, fraction=0.046, pad=0.02)
    fig.suptitle("Área foco de manejo de estrada (BR-290 / RS-030): "
                 "Capivari do Sul ↔ São Francisco de Paula", fontsize=13, y=0.997)
    fig.tight_layout()
    fig.savefig(COMP / "fig_foco_rs.png", dpi=140, bbox_inches="tight")
    plt.close(fig)


def main():
    res = analisar()
    (COMP / "foco_rs.json").write_text(json.dumps(res, indent=2, ensure_ascii=False),
                                       encoding="utf-8")
    figura_corredor(res)
    for esp, e in res["especies"].items():
        md = e["modos"].get("daily", {}); mc = e["modos"].get("clima", {})
        print(f"  {esp:18} apto% diário={md.get('perc_apto_maxTSS',0):5.1f} "
              f"clima={mc.get('perc_apto_maxTSS',0):5.1f} | "
              f"pres_no_corredor={e['presencas_no_corredor']} "
              f"pres_mais_proxima={e['dist_presenca_mais_proxima_km']:.0f}km | "
              f"cobertura diário={md.get('cobertura',0):.2f}")
    print("[ok] foco_rs.json + fig_foco_rs.png")


if __name__ == "__main__":
    main()
