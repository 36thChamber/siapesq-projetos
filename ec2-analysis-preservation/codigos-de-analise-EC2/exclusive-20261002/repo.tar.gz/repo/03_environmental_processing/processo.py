#!/usr/bin/env python3
# processo.py — CONTROLE DE QUALIDADE AMBIENTAL (QC) para SDM — ÚLTIMA ETAPA da 03.
#
# Lê o CSV final de variáveis de uma espécie (07/<Esp>/<token>_variables/*_variables.csv)
# e produz um relatório interpretativo COMPLETO em .../environmental_qc/ (HTML + MD +
# JSON + CSVs + PNGs), com TODAS as análises em 3 versões (completo / presenças /
# pseudoausências) e um SDM Readiness Score (0–100). NÃO modifica os dados.
#
# Modos:
#   - automático: chamado por `captura_ambiental.py` ao final (função `run_qc`);
#   - standalone: `python processo.py --csv <arquivo>`  ou  `--especie "<Nome>"`.
#
# Arquitetura: subpacote `qc/` (um módulo por análise), espelhando `env_providers/`.

from __future__ import annotations

import argparse
import sys
from pathlib import Path

for _s in (sys.stdout, sys.stderr):  # Windows: evita quebra com unicode sob redirect
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[union-attr]
    except Exception:  # noqa: BLE001
        pass

ROOT = Path(__file__).resolve().parent.parent
BASE07 = ROOT / "07 Executado por espécie"
sys.path.insert(0, str(ROOT / "03_environmental_processing"))

from qc import (dados, integridade, descritiva, correlacao, multicolinearidade,  # noqa: E402
                outliers, categoricas, pca, cobertura, readiness, interpretacao,
                plots, report)


def _p(msg: str = "") -> None:
    print(msg, flush=True)


def _find_species_csv(especie: str) -> Path:
    slug = especie.strip().replace(" ", "_")
    cands = list(BASE07.glob(f"{slug}*/*_variables/*_variables.csv"))
    if not cands:
        raise FileNotFoundError(f"Não achei *_variables.csv p/ '{especie}' em {BASE07}.")
    return cands[0]


def run_qc(csv_path: str | Path, especie: str | None = None) -> Path | None:
    """Executa o QC ambiental completo. Retorna o caminho do HTML (ou None se falhar)."""
    csv_path = Path(csv_path)
    if not csv_path.exists():
        _p(f"[qc] CSV não encontrado: {csv_path}")
        return None
    qc = dados.carregar(csv_path, especie=especie)
    out_dir = csv_path.parent / "environmental_qc"
    dist_dir = out_dir / "variable_distributions"
    out_dir.mkdir(parents=True, exist_ok=True)
    _p(f"[qc] {qc.especie} | {len(qc.df)} registros | contínuas={len(qc.continuas)} "
       f"categóricas={len(qc.categoricas)} | conjuntos={qc.nomes_conjuntos}")

    resultados: dict = {}

    def _etapa(nome, fn):
        try:
            resultados[nome] = fn()
            _p(f"  [ok] {nome}")
        except Exception as e:  # noqa: BLE001 - uma seção não derruba o relatório
            _p(f"  [skip] {nome}: {type(e).__name__}: {e}")
            resultados[nome] = {}

    _etapa("integridade", lambda: integridade.analisar(qc, out_dir))
    _etapa("descritiva", lambda: descritiva.analisar(qc, out_dir))
    _etapa("correlacao", lambda: correlacao.analisar(qc, out_dir))
    _etapa("vif", lambda: multicolinearidade.analisar(qc, out_dir))
    _etapa("outliers", lambda: outliers.analisar(qc, out_dir))
    _etapa("categoricas", lambda: categoricas.analisar(qc, out_dir))
    _etapa("pca", lambda: pca.analisar(qc, out_dir))
    _etapa("cobertura", lambda: cobertura.analisar(qc, resultados.get("pca"), out_dir))

    # ---- figuras ----
    figuras: dict = {}
    try:
        figuras["distribuicoes"] = plots.distribuicoes(qc, dist_dir)
        pm = resultados.get("correlacao", {}).get("completo", {}).get("matrizes", {}).get("pearson")
        figuras["heatmap"] = plots.heatmap_correlacao(
            pm, out_dir / qc.arq("correlation_heatmap.png"))
        figuras["pca"] = plots.grafico_pca(
            resultados.get("pca"), qc, out_dir / qc.arq("pca.png"))
        _p(f"  [ok] figuras ({len(figuras.get('distribuicoes', {}))} distribuições + heatmap + pca)")
    except Exception as e:  # noqa: BLE001
        _p(f"  [skip] figuras: {type(e).__name__}: {e}")

    # ---- SDM Readiness Score ----
    try:
        rr = readiness.calcular(qc, resultados)
    except Exception as e:  # noqa: BLE001
        _p(f"  [skip] readiness: {type(e).__name__}: {e}")
        rr = {"score": 0, "estrelas": 1, "estrelas_txt": "★☆☆☆☆", "classificacao": "N/D",
              "status": "N/D", "pesos": readiness.PESOS, "criterios": [],
              "positivos": [], "atencao": [], "criticos": [f"erro no cálculo: {e}"]}

    # ---- interpretação automática (máquina de laudo) ----
    try:
        interp = interpretacao.gerar(qc, resultados, rr)
        _p("  [ok] interpretação")
    except Exception as e:  # noqa: BLE001
        _p(f"  [skip] interpretação: {type(e).__name__}: {e}")
        interp = {"secoes": {}, "ecologica": {}, "resumo_executivo": [],
                  "conclusao_executiva": "", "problemas": {"criticos": [], "atencao": [], "sem": []},
                  "proximos_passos": []}

    # ---- laudo (HTML + MD + JSON) ----
    caminhos = report.gerar(qc, resultados, interp, figuras, rr, out_dir)
    _p(f"[qc] SDM Readiness Score = {rr['estrelas_txt']} {rr['score']}/100 — {rr['classificacao']}")
    _p(f"[qc] laudo salvo: {caminhos['html']}")
    return caminhos["html"]


def main() -> None:
    p = argparse.ArgumentParser(description="QC ambiental para SDM (última etapa da 03).")
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--csv", type=str, help="Caminho do *_variables.csv.")
    g.add_argument("--especie", type=str, help="Nome da espécie (busca na pasta 07).")
    args = p.parse_args()
    csv = Path(args.csv) if args.csv else _find_species_csv(args.especie)
    run_qc(csv)


if __name__ == "__main__":
    main()
