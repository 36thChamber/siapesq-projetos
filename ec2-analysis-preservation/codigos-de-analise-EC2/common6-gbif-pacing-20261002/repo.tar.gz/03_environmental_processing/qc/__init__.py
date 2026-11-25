#!/usr/bin/env python3
# qc — Controle de Qualidade Ambiental (QC) para SDM (etapa 03, última etapa).
#
# Subpacote modular (espelha o padrão de `env_providers/`): cada análise é um módulo
# isolado, orquestrado por `processo.py`. Não modifica dados — só lê o CSV final de
# variáveis e produz um relatório interpretativo em `environmental_qc/`.
from __future__ import annotations

__all__ = [
    "dados", "integridade", "descritiva", "correlacao", "multicolinearidade",
    "outliers", "categoricas", "pca", "cobertura", "readiness", "plots", "report",
]
