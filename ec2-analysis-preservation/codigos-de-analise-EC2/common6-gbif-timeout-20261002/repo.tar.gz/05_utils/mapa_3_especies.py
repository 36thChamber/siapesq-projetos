#!/usr/bin/env python3
# mapa_3_especies.py — mapa das 3 espécies (presenças e/ou pseudoausências),
# com o contorno do Brasil e as ecorregiões (RESOLVE 2017) que contêm presença.
#
# Gera DOIS arquivos:
#   1) mapa COMBINADO   — as 3 espécies juntas
#   2) mapa em PAINÉIS  — um quadro por espécie (bem mais legível quando as
#      pseudoausências entram: no combinado, as pseudo de uma espécie caem por cima
#      das presenças de outra e enganam o olho)
#
# Cores: mesma FAMÍLIA por espécie (liga as duas classes), TOM FORTE para presença e
# TOM CLARO para pseudoausência.
#
# EXECUTE DA RAIZ DO PROJETO:
#   python 05_utils/mapa_3_especies.py                    # presenças + pseudoausências
#   python 05_utils/mapa_3_especies.py --sem_pseudo       # só presenças
#   python 05_utils/mapa_3_especies.py --dpi 300

from __future__ import annotations

import argparse
import sys
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")
for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import geopandas as gpd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd
from matplotlib.lines import Line2D
from matplotlib.patches import Patch

ROOT = Path(__file__).resolve().parent.parent
BASE07 = ROOT / "07 Executado por espécie"
DATA = "2026-07-13"
TOKEN = DATA.replace("-", "_")

# (pasta, nome científico, cor da PRESENÇA, cor da PSEUDOAUSÊNCIA)
ESPECIES = [
    ("Alouatta_caraya",  "Alouatta caraya",  "#C1362B", "#F3B7A6"),  # vermelho / salmão
    ("Alouatta_guariba", "Alouatta guariba", "#1F5F8B", "#A8CBE0"),  # azul     / azul claro
    ("Sapajus_nigritus", "Sapajus nigritus", "#2E6B2E", "#AAD6A5"),  # verde    / verde claro
]

PAISES = ROOT / "gbif_reference_cache" / "ne_50m_admin_0_countries.geojson"


def _shp_ecorregioes() -> Path:
    sys.path.insert(0, str(ROOT / "02_pseudoabsence"))
    from resolve_ecoregions import download_resolve
    return Path(download_resolve())


def _csv_variaveis(pasta: str) -> Path:
    """
    O CSV de variáveis da espécie. Aceita o arquivo RENOMEADO pelo usuário (ele às vezes
    põe um prefixo, ex.: `CARAYA 2026_07_13_variables.csv`) — procura por `*variables.csv`
    e, se houver mais de um, usa o MAIS RECENTE e DIZ qual escolheu (nunca em silêncio:
    escolher o arquivo errado sem avisar é como o mapa sai mentindo).
    """
    d = BASE07 / pasta / DATA / f"{TOKEN}_variables"
    cands = sorted(d.glob("*variables.csv"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not cands:
        raise SystemExit(f"[ERRO] nenhum *variables.csv em {d}")
    if len(cands) > 1:
        print(f"  [aviso] {len(cands)} CSVs de variáveis em {pasta}; usando o mais recente: "
              f"{cands[0].name}")
    return cands[0]


def carregar() -> gpd.GeoDataFrame:
    """Presenças (sp=1) e pseudoausências (sp=0) das 3 espécies."""
    partes = []
    for pasta, nome, _, _ in ESPECIES:
        csv = _csv_variaveis(pasta)
        d = pd.read_csv(csv, usecols=["decimalLatitude", "decimalLongitude", "sp"])
        d["especie"] = nome
        partes.append(d)
        print(f"  {nome:<20} {int((d.sp == 1).sum()):>5} presenças | "
              f"{int((d.sp == 0).sum()):>5} pseudoausências")
    d = pd.concat(partes, ignore_index=True)
    return gpd.GeoDataFrame(
        d, geometry=gpd.points_from_xy(d.decimalLongitude, d.decimalLatitude),
        crs="EPSG:4326")


def _fundo(ax, fundo_eco, com_eco, paises, brasil, xlim, ylim):
    """Ecorregiões (com/sem presença), países e Brasil — o pano de fundo comum."""
    fundo_eco.plot(ax=ax, color="#F4F4F2", edgecolor="#E0E0E0", linewidth=0.3, zorder=1)
    com_eco.plot(ax=ax, color="#FFF6D8", edgecolor="#C9A227", linewidth=0.7,
                 alpha=0.9, zorder=2)
    paises.boundary.plot(ax=ax, color="#AAAAAA", linewidth=0.5, zorder=3)
    brasil.boundary.plot(ax=ax, color="#111111", linewidth=1.6, zorder=4)
    ax.set_xlim(*xlim)
    ax.set_ylim(*ylim)
    ax.grid(True, linewidth=0.3, color="#E5E5E5", zorder=0)


def _it(nome: str) -> str:
    return f"$\\it{{{nome.replace(' ', '\\ ')}}}$"


def main() -> None:
    p = argparse.ArgumentParser(
        description="Mapa das 3 espécies: presenças e pseudoausências, "
                    "com Brasil e ecorregiões de ocorrência.")
    p.add_argument("--sem_pseudo", action="store_true",
                   help="Plota SÓ as presenças (omite as pseudoausências).")
    p.add_argument("--dpi", type=int, default=200)
    args = p.parse_args()
    com_pseudo = not args.sem_pseudo

    print("Lendo dados...")
    pts = carregar()
    pres = pts[pts.sp == 1]
    pseu = pts[pts.sp == 0]
    print(f"  TOTAL: {len(pres)} presenças | {len(pseu)} pseudoausências\n")

    print("Lendo ecorregiões (RESOLVE 2017)...")
    eco = gpd.read_file(_shp_ecorregioes())[["ECO_NAME", "BIOME_NAME", "geometry"]]
    eco = eco.to_crs("EPSG:4326")
    # Ecorregião "com presença" = contém ao menos 1 PRESENÇA (não pseudo).
    j = gpd.sjoin(pres, eco, how="left", predicate="within")
    nomes = sorted(j["ECO_NAME"].dropna().unique())
    com = eco[eco["ECO_NAME"].isin(nomes)].copy()
    print(f"  {len(nomes)} ecorregiões contêm presença\n")

    base = pts if com_pseudo else pres
    minx, miny, maxx, maxy = base.total_bounds
    mx, my = (maxx - minx) * 0.05, (maxy - miny) * 0.05
    xlim, ylim = (minx - mx, maxx + mx), (miny - my, maxy + my)

    paises = gpd.read_file(PAISES).to_crs("EPSG:4326")
    cp = "ADMIN" if "ADMIN" in paises.columns else "NAME"
    brasil = paises[paises[cp] == "Brazil"]
    fundo_eco = eco.cx[xlim[0]:xlim[1], ylim[0]:ylim[1]]
    fundo_eco = fundo_eco[~fundo_eco["ECO_NAME"].isin(nomes)]

    # ---------------- 1) MAPA COMBINADO ----------------
    print("Desenhando o mapa combinado...")
    fig, ax = plt.subplots(figsize=(11.5, 12.5))
    _fundo(ax, fundo_eco, com, paises, brasil, xlim, ylim)

    # pseudoausências PRIMEIRO (embaixo), pequenas e translúcidas
    if com_pseudo:
        for _, nome, _, cor_a in ESPECIES:
            s = pseu[pseu.especie == nome]
            s.plot(ax=ax, color=cor_a, markersize=2.5, alpha=0.45, linewidth=0, zorder=5)
    # presenças POR CIMA, fortes
    for _, nome, cor_p, _ in ESPECIES:
        s = pres[pres.especie == nome]
        s.plot(ax=ax, color=cor_p, markersize=7, alpha=0.8, linewidth=0, zorder=6)

    ax.set_xlabel("Longitude"); ax.set_ylabel("Latitude")
    ax.set_title(
        ("Presenças e pseudoausências — 3 espécies de primatas" if com_pseudo
         else "Registros de ocorrência (presenças) — 3 espécies de primatas")
        + "\nEcorregiões RESOLVE 2017 com presença destacadas; Brasil em contorno grosso",
        fontsize=13, pad=14)

    leg = []
    for _, nome, cor_p, cor_a in ESPECIES:
        n_p = int((pres.especie == nome).sum())
        leg.append(Line2D([0], [0], marker="o", color="none", markerfacecolor=cor_p,
                          markersize=9, label=f"{_it(nome)} — presença (n={n_p})"))
        if com_pseudo:
            n_a = int((pseu.especie == nome).sum())
            leg.append(Line2D([0], [0], marker="o", color="none", markerfacecolor=cor_a,
                              markersize=7, label=f"{_it(nome)} — pseudoausência (n={n_a})"))
    leg += [
        Patch(facecolor="#FFF6D8", edgecolor="#C9A227",
              label=f"Ecorregião com presença ({len(nomes)})"),
        Patch(facecolor="#F4F4F2", edgecolor="#E0E0E0", label="Demais ecorregiões"),
        Line2D([0], [0], color="#111111", linewidth=1.6, label="Brasil"),
    ]
    ax.legend(handles=leg, loc="lower left", frameon=True, framealpha=0.95, fontsize=8.5)

    nome_out = ("mapa_3_especies_presenca_pseudo.png" if com_pseudo
                else "mapa_3_especies_presencas.png")
    out1 = BASE07 / nome_out
    fig.savefig(out1, dpi=args.dpi, bbox_inches="tight")
    plt.close(fig)
    print(f"[OK] {out1}")

    if not com_pseudo:
        return

    # ---------------- 2) PAINÉIS (um por espécie) ----------------
    print("Desenhando os painéis por espécie...")
    fig, axes = plt.subplots(1, 3, figsize=(21, 9), sharex=True, sharey=True)
    for ax, (_, nome, cor_p, cor_a) in zip(axes, ESPECIES):
        _fundo(ax, fundo_eco, com, paises, brasil, xlim, ylim)
        sa = pseu[pseu.especie == nome]
        sp_ = pres[pres.especie == nome]
        sa.plot(ax=ax, color=cor_a, markersize=3, alpha=0.55, linewidth=0, zorder=5)
        sp_.plot(ax=ax, color=cor_p, markersize=8, alpha=0.85, linewidth=0, zorder=6)
        ax.set_title(f"{_it(nome)}\npresenças {len(sp_)}  ·  pseudoausências {len(sa)}",
                     fontsize=12, pad=10)
        ax.set_xlabel("Longitude")
        ax.legend(handles=[
            Line2D([0], [0], marker="o", color="none", markerfacecolor=cor_p,
                   markersize=9, label="presença"),
            Line2D([0], [0], marker="o", color="none", markerfacecolor=cor_a,
                   markersize=7, label="pseudoausência"),
        ], loc="lower left", frameon=True, framealpha=0.95, fontsize=9)
    axes[0].set_ylabel("Latitude")
    fig.suptitle("Presenças e pseudoausências, por espécie — ecorregiões com presença "
                 "destacadas; Brasil em contorno grosso", fontsize=14, y=0.99)
    out2 = BASE07 / "mapa_3_especies_paineis.png"
    fig.savefig(out2, dpi=args.dpi, bbox_inches="tight")
    plt.close(fig)
    print(f"[OK] {out2}")

    print(f"\n{len(pres)} presenças | {len(pseu)} pseudoausências | "
          f"{len(nomes)} ecorregiões com presença")


if __name__ == "__main__":
    main()
