#!/usr/bin/env python3
# comparar_py_r.py — Comparação Python (sklearn) × R (randomForest) do modelo marinho.
#
# Lê os eval JSON dos dois frameworks (treinados no MESMO split) e os mapas de adequabilidade
# das MESMAS células oceânicas, e produz: (a) tabela de métricas lado a lado, (b) tempo de
# treino, (c) correlação/diferença entre os mapas, (d) figura comparativa. Responde: os dois
# concordam? qual é mais eficaz/confiável? qual é mais rápido?
#
# USO (da raiz; normalmente chamado pelo run_pipeline_ocean.py com --engine ambos):
#   .venv\Scripts\python.exe 04_modeling\comparar_py_r.py --outdir <pasta_do_modelo> --slug Pomatomus_saltatrix
#
# Saída (em --outdir): comparacao_py_r_<slug>.txt/.json (+ comparacao_mapas_<slug>.png se houver mapas).

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd


def _load(p: Path):
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else None


def comparar(outdir: Path, slug: str, janela: str) -> None:
    py = _load(outdir / f"rf_{slug}_marinho_eval.json")
    r = _load(outdir / f"rf_{slug}_marinho_R_eval.json")
    if py is None or r is None:
        print(f"[cmp] faltam eval JSON — Python: {py is not None} | R: {r is not None}")
        return

    METRICAS = [
        ("auc_teste", "AUC (teste)", "maior=melhor"),
        ("tss_max_teste", "TSS máx", "maior=melhor"),
        ("mcc", "MCC", "maior=melhor"),
        ("f1", "F1", "maior=melhor"),
        ("sensibilidade", "Sensibilidade", "maior=melhor"),
        ("especificidade", "Especificidade", "maior=melhor"),
        ("auc_treino", "AUC (treino)", "—"),
        ("overfit_auc", "Overfit (treino-teste)", "menor=melhor"),
        ("tempo_treino_seg", "Tempo treino (s)", "menor=melhor"),
    ]
    linhas = []
    linhas.append(f"{'Métrica':26} {'Python (sklearn)':>18} {'R (randomForest)':>18}   {'nota':<14}")
    linhas.append("-" * 82)
    for k, rot, nota in METRICAS:
        vp, vr = py.get(k), r.get(k)
        sp = f"{vp:.4f}" if isinstance(vp, (int, float)) and k != "tempo_treino_seg" else (
            f"{vp:.2f}" if isinstance(vp, (int, float)) else "—")
        sr = f"{vr:.4f}" if isinstance(vr, (int, float)) and k != "tempo_treino_seg" else (
            f"{vr:.2f}" if isinstance(vr, (int, float)) else "—")
        linhas.append(f"{rot:26} {sp:>18} {sr:>18}   {nota:<14}")

    # concordância dos mapas
    gxp = outdir / f"pred_{slug}_media{janela}_gridX.csv"
    gxr = outdir / f"pred_{slug}_media{janela}_gridX_R.csv"
    corr = None
    if gxp.exists() and gxr.exists():
        a = pd.read_csv(gxp); b = pd.read_csv(gxr)
        if len(a) == len(b):   # predizer_marinho.R preserva a ordem das linhas
            m = pd.DataFrame({"lat": a["lat"].to_numpy(), "lon": a["lon"].to_numpy(),
                              "adeq_py": a["adeq_py"].to_numpy(),
                              "adeq_R": b["adeq_R"].to_numpy()}).dropna()
        else:                  # fallback: junta por lat/lon arredondado
            a["latr"], a["lonr"] = a["lat"].round(4), a["lon"].round(4)
            b["latr"], b["lonr"] = b["lat"].round(4), b["lon"].round(4)
            m = a.merge(b[["latr", "lonr", "adeq_R"]], on=["latr", "lonr"], how="inner").dropna()
        if len(m) > 5:
            pear = float(np.corrcoef(m.adeq_py, m.adeq_R)[0, 1])
            spear = float(pd.Series(m.adeq_py).corr(pd.Series(m.adeq_R), method="spearman"))
            mad = float((m.adeq_py - m.adeq_R).abs().mean())
            corr = {"pearson": round(pear, 4), "spearman": round(spear, 4),
                    "erro_abs_medio": round(mad, 4), "n_celulas": int(len(m))}
            try:
                import matplotlib
                matplotlib.use("Agg")
                import matplotlib.pyplot as plt
                fig, ax = plt.subplots(1, 3, figsize=(16, 5))
                for i, (col, tit) in enumerate([("adeq_py", "Python (sklearn)"),
                                                ("adeq_R", "R (randomForest)")]):
                    sc = ax[i].scatter(m.lon, m.lat, c=m[col], cmap="turbo", vmin=0, vmax=1, s=3)
                    ax[i].set_title(f"{tit}"); ax[i].set_aspect("equal")
                    fig.colorbar(sc, ax=ax[i], label="adequabilidade")
                d = (m.adeq_py - m.adeq_R)
                sc = ax[2].scatter(m.lon, m.lat, c=d, cmap="RdBu", vmin=-0.3, vmax=0.3, s=3)
                ax[2].set_title(f"Diferença (Py − R)\npearson={pear:.3f}"); ax[2].set_aspect("equal")
                fig.colorbar(sc, ax=ax[2], label="Δ adequabilidade")
                fig.suptitle(f"Comparação de mapas — média {janela}")
                fig.savefig(outdir / f"comparacao_mapas_{slug}.png", dpi=120, bbox_inches="tight")
                plt.close(fig)
            except Exception as e:  # noqa: BLE001
                print(f"[cmp] figura pulada: {type(e).__name__}: {e}")

    # veredito da comparação
    def _melhor(k, menor=False):
        vp, vr = py.get(k), r.get(k)
        if not (isinstance(vp, (int, float)) and isinstance(vr, (int, float))):
            return "—"
        if abs(vp - vr) < 1e-9:
            return "empate"
        py_melhor = (vp < vr) if menor else (vp > vr)
        return "Python" if py_melhor else "R"

    resumo = {
        "especie_slug": slug, "janela": janela,
        "metricas_python": py, "metricas_R": r,
        "concordancia_mapas": corr,
        "vencedor_por_metrica": {
            "AUC": _melhor("auc_teste"), "TSS": _melhor("tss_max_teste"),
            "MCC": _melhor("mcc"), "F1": _melhor("f1"),
            "overfit_menor": _melhor("overfit_auc", menor=True),
            "tempo_menor": _melhor("tempo_treino_seg", menor=True),
        },
        "nota_paralelismo": f"Python n_jobs={py.get('n_jobs', '?')} (multi-core); "
                            f"R randomForest é single-thread por padrão — tempo não é "
                            f"diretamente comparável em paralelismo.",
    }
    (outdir / f"comparacao_py_r_{slug}.json").write_text(
        json.dumps(resumo, ensure_ascii=False, indent=2), encoding="utf-8")

    txt = ["=" * 82, f"COMPARAÇÃO Python (sklearn) × R (randomForest) — {slug} | média {janela}",
           "=" * 82, ""] + linhas + [""]
    if corr:
        txt.append(f"Concordância dos mapas: pearson={corr['pearson']} spearman={corr['spearman']} "
                   f"| erro abs. médio={corr['erro_abs_medio']} ({corr['n_celulas']} células)")
    txt.append("")
    txt.append("Vencedor por métrica: " + ", ".join(
        f"{k}={v}" for k, v in resumo["vencedor_por_metrica"].items()))
    txt.append(resumo["nota_paralelismo"])
    txt.append("")
    txt.append("CONFIABILIDADE: ambos usam validação ALEATÓRIA (mesmo split); com ocorrências "
               "agregadas o AUC pode ser otimista (validação espacial fica como melhoria).")
    saida = "\n".join(txt)
    (outdir / f"comparacao_py_r_{slug}.txt").write_text(saida + "\n", encoding="utf-8")
    print("\n" + saida)
    print(f"\n[cmp] comparação salva: comparacao_py_r_{slug}.txt/.json"
          + (f" + comparacao_mapas_{slug}.png" if corr else ""))


def main() -> None:
    ap = argparse.ArgumentParser(description="Compara modelo marinho Python × R.")
    ap.add_argument("--outdir", required=True)
    ap.add_argument("--slug", required=True, help="slug da espécie (ex.: Pomatomus_saltatrix).")
    ap.add_argument("--janela", default="2015-2024")
    a = ap.parse_args()
    comparar(Path(a.outdir), a.slug, a.janela)


if __name__ == "__main__":
    main()
