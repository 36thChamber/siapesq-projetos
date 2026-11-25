#!/usr/bin/env python3
# plot_dados.py — Mapa PNG do conjunto FINAL de dados de uma espécie.
#
# Responsabilidade ÚNICA: gerar SEMPRE, ao fim da geração de pseudo-ausências, um
# mapa que mostra a TOTALIDADE dos dados — todas as PRESENÇAS (sp=1) e todas as
# PSEUDOAUSÊNCIAS (sp=0) — com as ECORREGIÕES DE OCORRÊNCIA (a Área M) destacadas.
#
# Decisões de robustez: backend não-interativo (Agg, sem display), imports pesados
# preguiçosos e TODA a função isolada em try/except — um erro de plotagem NUNCA
# derruba a geração dos dados (que já foram salvos em CSV antes de chamar isto).

from __future__ import annotations

import os


def salvar_mapa_presenca_ausencia(
    df,
    out_png: str,
    species_name: str,
    area_m=None,
    ecoregioes=None,
) -> str | None:
    """
    Gera e salva um PNG com presenças, pseudo-ausências e ecorregiões de ocorrência.

    Parâmetros:
        df: DataFrame com colunas `sp` (1=presença, 0=pseudo), `decimalLatitude`,
            `decimalLongitude`.
        out_png: caminho de saída do PNG.
        species_name: nome da espécie (título).
        area_m: (opcional) geometria da Área M (união das ecorregiões) — usada como
            destaque se `ecoregioes` não for fornecido.
        ecoregioes: (opcional) GeoDataFrame das ecorregiões INDIVIDUAIS selecionadas
            — quando presente, são desenhadas destacadas (com suas fronteiras).

    Retorna o caminho salvo, ou None se algo falhar (isola falhas).
    """
    try:
        import matplotlib
        matplotlib.use("Agg")  # sem display (headless/servidor/Windows)
        import matplotlib.pyplot as plt
        import matplotlib.patches as mpatches
        import geopandas as gpd

        pres = df[df["sp"] == 1]
        aus = df[df["sp"] == 0]
        lons = df["decimalLongitude"].astype(float)
        lats = df["decimalLatitude"].astype(float)

        fig, ax = plt.subplots(figsize=(11, 11))

        # (1) ECORREGIÕES DE OCORRÊNCIA (destaque de fundo).
        destacou_eco = False
        if ecoregioes is not None and len(ecoregioes) > 0:
            ecoregioes.plot(ax=ax, facecolor="#c8e6c9", edgecolor="#2e7d32",
                            linewidth=0.7, alpha=0.55, zorder=1)
            destacou_eco = True
        elif area_m is not None:
            gpd.GeoSeries([area_m], crs="EPSG:4326").plot(
                ax=ax, facecolor="#c8e6c9", edgecolor="#2e7d32",
                linewidth=0.9, alpha=0.55, zorder=1)
            destacou_eco = True

        # (2) PSEUDOAUSÊNCIAS (sp=0) — pontos discretos, por baixo das presenças.
        if len(aus) > 0:
            ax.scatter(aus["decimalLongitude"], aus["decimalLatitude"], s=6,
                       c="#616161", marker="o", alpha=0.45, linewidths=0,
                       label=f"Pseudoausências ({len(aus)})", zorder=2)
        # (3) PRESENÇAS (sp=1) — pontos em destaque, por cima.
        if len(pres) > 0:
            ax.scatter(pres["decimalLongitude"], pres["decimalLatitude"], s=16,
                       c="#d32f2f", marker="o", edgecolors="white", linewidths=0.3,
                       label=f"Presenças ({len(pres)})", zorder=3)

        # (4) EXTENSÃO = envolve TODOS os pontos e a Área M (mostra a totalidade).
        xmin, xmax = float(lons.min()), float(lons.max())
        ymin, ymax = float(lats.min()), float(lats.max())
        if area_m is not None:
            try:
                bx0, by0, bx1, by1 = area_m.bounds
                xmin, xmax = min(xmin, bx0), max(xmax, bx1)
                ymin, ymax = min(ymin, by0), max(ymax, by1)
            except Exception:  # noqa: BLE001
                pass
        mx = max((xmax - xmin) * 0.04, 0.5)
        my = max((ymax - ymin) * 0.04, 0.5)
        ax.set_xlim(xmin - mx, xmax + mx)
        ax.set_ylim(ymin - my, ymax + my)
        ax.set_aspect("equal", adjustable="box")

        ax.set_xlabel("Longitude")
        ax.set_ylabel("Latitude")
        titulo = f"{species_name} — presenças e pseudoausências (dados completos)"
        if destacou_eco:
            titulo += "\ncom ecorregiões de ocorrência destacadas"
        ax.set_title(titulo, fontsize=13)

        handles, _ = ax.get_legend_handles_labels()
        if destacou_eco:
            handles.insert(0, mpatches.Patch(
                facecolor="#c8e6c9", edgecolor="#2e7d32",
                label="Ecorregiões de ocorrência (Área M)"))
        if handles:
            ax.legend(handles=handles, loc="best", fontsize=9, framealpha=0.9)
        ax.grid(True, linewidth=0.3, alpha=0.4)

        fig.tight_layout()
        os.makedirs(os.path.dirname(os.path.abspath(out_png)), exist_ok=True)
        fig.savefig(out_png, dpi=150)
        plt.close(fig)
        print(f"[mapa] salvo: {out_png}  "
              f"(presenças={len(pres)}, pseudoausências={len(aus)})")
        return out_png
    except Exception as e:  # noqa: BLE001 - o mapa NUNCA derruba a geração de dados
        print(f"[mapa] AVISO: falha ao gerar o mapa PNG: {type(e).__name__}: {e}")
        return None
