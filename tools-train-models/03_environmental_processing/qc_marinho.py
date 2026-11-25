#!/usr/bin/env python3
# qc_marinho.py — QC ambiental com GATE para o PIPELINE OCEÂNICO (etapa 5).
#
# Diferente do continental (onde o QC é decorativo — ver auditoria F01), aqui o QC
# EMITE UM VEREDITO que decide se o dataset segue para a modelagem:
#   APTO       — pode modelar.
#   REVISAR    — modelável, mas com avisos (plausibilidade/faltantes) — segue com aviso.
#   NAO_APTO   — bloqueia (poucas presenças, variável degenerada, sem casos completos).
#
# Critérios (decididos com o usuário):
#   - Piso de presenças: >= 100 (senão NAO_APTO).
#   - Nenhuma variável constante / totalmente ausente (senão NAO_APTO).
#   - Casos completos (todas as 4-5 vars) >= 100 (senão NAO_APTO).
#   - Plausibilidade MARINHA (aviso -> REVISAR): sst∈[-2,35]°C, sss∈[0,42], chl>0, prof<0.
#
# Além do veredito, roda o laudo completo (processo.run_qc — HTML/JSON) best-effort.
# Grava QCVeredito_<Genero_especie>_<DD_MM_AA>.json/.txt na pasta da espécie.
#
# USO (da raiz):
#   .venv\Scripts\python.exe 03_environmental_processing\qc_marinho.py --especie Pomatomus_saltatrix
#   (ou --csv <Variables_*.csv>)

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
BASE07 = ROOT / "07 Executado por espécie"
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "03_environmental_processing"))

import naming  # noqa: E402

ENV = ["sst", "sss", "chl", "chl_log10", "profundidade"]
PISO_PRESENCAS = 100          # piso de presenças p/ modelar (decisão do usuário)
PISO_COMPLETOS = 100          # casos completos mínimos
FRAC_IMPLAUSIVEL_ALERTA = 0.05  # >5% fora de faixa física -> REVISAR
# faixas físicas plausíveis (superfície, oceano)
PLAUSIVEL = {
    "sst": (-2.0, 35.0),      # °C
    "sss": (0.0, 42.0),       # PSU
    "chl": (0.0, np.inf),     # mg/m³ (>0)
    "profundidade": (-np.inf, 0.0),  # m (<0 = oceano)
}


def _p(m: str = "") -> None:
    print(m, flush=True)


def _find_variables_csv(especie: str) -> Path:
    slug = naming.slug_especie(especie)
    cands = [c for c in BASE07.rglob("*")
             if c.is_file() and c.suffix == ".csv"
             and slug.lower() in str(c).lower()
             and c.name.startswith(naming.TIPOS["variables"])
             and "marinho" in str(c.parent).lower()]
    if not cands:
        raise FileNotFoundError(f"Sem Variables_*.csv marinho p/ '{especie}' em {BASE07}.")
    cands.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return cands[0]


def avaliar(csv: Path) -> dict:
    """Calcula o veredito do gate a partir do CSV de variáveis marinho."""
    df = pd.read_csv(csv)
    env = [c for c in ENV if c in df.columns]
    sp = df["sp"] if "sp" in df.columns else pd.Series(1, index=df.index)
    n_pres = int((sp == 1).sum())
    n_pseudo = int((sp == 0).sum())
    completos = int(df[env].notna().all(axis=1).sum()) if env else 0

    problemas: list[str] = []   # bloqueiam (NAO_APTO)
    avisos: list[str] = []      # REVISAR

    # 1) piso de presenças
    if n_pres < PISO_PRESENCAS:
        problemas.append(f"presenças {n_pres} < piso {PISO_PRESENCAS}")
    # 2) casos completos
    if completos < PISO_COMPLETOS:
        problemas.append(f"casos completos {completos} < {PISO_COMPLETOS}")
    # 3) variáveis degeneradas (constantes / totalmente ausentes)
    for c in env:
        nn = int(df[c].notna().sum())
        if nn == 0:
            problemas.append(f"variável '{c}' 100% ausente")
        elif df[c].dropna().nunique() <= 1:
            problemas.append(f"variável '{c}' constante")
    # 4) faltantes por variável (aviso)
    for c in env:
        frac_nan = float(df[c].isna().mean())
        if frac_nan > 0.10:
            avisos.append(f"'{c}' {frac_nan:.0%} faltante")
    # 5) plausibilidade física marinha (aviso)
    for c, (lo, hi) in PLAUSIVEL.items():
        if c in df.columns:
            v = pd.to_numeric(df[c], errors="coerce").dropna()
            if len(v):
                frac_fora = float(((v < lo) | (v > hi)).mean())
                if frac_fora > FRAC_IMPLAUSIVEL_ALERTA:
                    avisos.append(f"'{c}' {frac_fora:.0%} fora da faixa física [{lo},{hi}]")

    if problemas:
        veredito = "NAO_APTO"
    elif avisos:
        veredito = "REVISAR"
    else:
        veredito = "APTO"

    return {
        "veredito": veredito,
        "n_presencas": n_pres,
        "n_pseudo": n_pseudo,
        "casos_completos": completos,
        "variaveis": env,
        "problemas": problemas,
        "avisos": avisos,
        "piso_presencas": PISO_PRESENCAS,
        "csv": str(csv),
    }


def rodar_gate(csv: Path, especie: str | None = None) -> dict:
    especie_dir = csv.parent
    especie_nome = especie or naming.especie_da_pasta(especie_dir)
    _p(f"[qc-mar] avaliando {csv.name} ...")

    resultado = avaliar(csv)

    # laudo completo (best-effort; nunca derruba o gate)
    try:
        from processo import run_qc
        _p("[qc-mar] gerando laudo completo (processo.run_qc)...")
        run_qc(csv, especie=especie_nome)
    except Exception as e:  # noqa: BLE001
        _p(f"[qc-mar] laudo completo PULADO: {type(e).__name__}: {e}")

    # grava o veredito na pasta da espécie
    base = f"QCVeredito_{naming.slug_especie(especie_nome)}_{naming.carimbo(especie_dir)}"
    (especie_dir / f"{base}.json").write_text(
        json.dumps(resultado, ensure_ascii=False, indent=2), encoding="utf-8")
    linhas = [
        f"VEREDITO: {resultado['veredito']}",
        f"presenças: {resultado['n_presencas']} (piso {resultado['piso_presencas']}) | "
        f"pseudo: {resultado['n_pseudo']} | completos: {resultado['casos_completos']}",
        f"variáveis: {', '.join(resultado['variaveis'])}",
    ]
    if resultado["problemas"]:
        linhas.append("PROBLEMAS (bloqueiam): " + "; ".join(resultado["problemas"]))
    if resultado["avisos"]:
        linhas.append("AVISOS (revisar): " + "; ".join(resultado["avisos"]))
    (especie_dir / f"{base}.txt").write_text("\n".join(linhas) + "\n", encoding="utf-8")

    _p("")
    _p("==== QC MARINHO — VEREDITO ====")
    for ln in linhas:
        _p("  " + ln)
    _p(f"[qc-mar] veredito salvo: {base}.json/.txt")
    return resultado


def main() -> None:
    p = argparse.ArgumentParser(description="QC ambiental MARINHO com gate (etapa 5).")
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--especie", type=str)
    g.add_argument("--csv", type=str)
    args = p.parse_args()
    csv = Path(args.csv) if args.csv else _find_variables_csv(args.especie)
    res = rodar_gate(csv, especie=args.especie)
    # código de saída: 0 = APTO/REVISAR (segue), 3 = NAO_APTO (bloqueia)
    raise SystemExit(0 if res["veredito"] in ("APTO", "REVISAR") else 3)


if __name__ == "__main__":
    main()
