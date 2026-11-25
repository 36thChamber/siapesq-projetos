#!/usr/bin/env python3
# dados.py — Carga do CSV final, CLASSIFICAÇÃO de colunas e SPLIT em 3 conjuntos.
#
# Fonte de verdade da classificação = registry `env_providers` (contínuas = colunas
# dos providers era5/ndvi/altitude/slope/soilgrids; categóricas = mapbiomas/worldcover),
# com fallback robusto por nome/dtype — assim uma variável nova entra sozinha no QC.

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import pandas as pd

# Metadados (NUNCA entram como "variável ambiental" nas análises).
META_COLS = {
    "base_de_dados", "decimalLatitude", "decimalLongitude", "day", "month", "year",
    "sp", "recommended_land_use_source", "ndvi_dias_validos", "_row_id", "species",
}
# Nomes de colunas CATEGÓRICAS conhecidas (uso/ocupação do solo).
_CATEGORICAL_HINTS = ("ocup_solo", "id_uso_solo", "uso_solo")


def _categoricas_do_registry() -> set[str]:
    """Colunas categóricas declaradas pelos providers de uso do solo (se importável)."""
    cols: set[str] = set()
    try:
        from env_providers import get_provider
        for nome in ("mapbiomas", "worldcover"):
            try:
                cols.update(get_provider(nome).columns)
            except Exception:  # noqa: BLE001
                pass
    except Exception:  # noqa: BLE001
        pass
    return cols


def classificar_colunas(df: pd.DataFrame) -> tuple[list[str], list[str]]:
    """Devolve (continuas, categoricas) a partir das colunas numéricas do df."""
    cat_registry = _categoricas_do_registry()
    continuas, categoricas = [], []
    for c in df.columns:
        if c in META_COLS:
            continue
        if not pd.api.types.is_numeric_dtype(df[c]):
            continue
        eh_cat = c in cat_registry or any(h in c.lower() for h in _CATEGORICAL_HINTS)
        (categoricas if eh_cat else continuas).append(c)
    return continuas, categoricas


@dataclass
class QCData:
    """Dados do QC: df completo, listas de colunas e os 3 subconjuntos."""

    csv_path: Path
    especie: str
    df: pd.DataFrame
    continuas: list[str]
    categoricas: list[str]
    tem_sp: bool
    conjuntos: dict = field(default_factory=dict)  # nome -> DataFrame
    # Carimbo de identidade das saídas: 'QC_Sapajus_nigritus_13_07_26'. TODO arquivo que
    # o QC grava leva este prefixo — um `vif_table.csv` tirado da pasta tem de continuar
    # dizendo DE QUEM ele é. Ver `naming.py` (raiz).
    prefixo: str = ""

    @property
    def nomes_conjuntos(self) -> list[str]:
        return list(self.conjuntos.keys())

    def arq(self, nome: str) -> str:
        """
        Nome de saída carimbado.

            arq("vif_table.csv")             -> QC_Sapajus_nigritus_13_07_26_vif_table.csv
            arq("environmental_summary.html")-> QC_Sapajus_nigritus_13_07_26.html   (o LAUDO)

        O laudo (`environmental_summary.*`) é a saída PRINCIPAL do QC: fica só com o
        carimbo, sem o sufixo genérico.
        """
        if not self.prefixo:
            return nome
        if nome.startswith("environmental_summary."):
            return f"{self.prefixo}.{nome.split('.', 1)[1]}"
        return f"{self.prefixo}_{nome}"


def carregar(csv_path: str | Path, especie: str | None = None) -> QCData:
    """Lê o CSV final e prepara os 3 conjuntos (completo / presenças / ausências)."""
    csv_path = Path(csv_path)
    df = pd.read_csv(csv_path)
    # Substitui ±inf por NaN só para as ANÁLISES (não altera o arquivo original).
    df = df.replace([np.inf, -np.inf], np.nan)
    continuas, categoricas = classificar_colunas(df)

    tem_sp = "sp" in df.columns
    conjuntos = {"completo": df}
    if tem_sp:
        conjuntos["presencas"] = df[df["sp"] == 1].reset_index(drop=True)
        conjuntos["ausencias"] = df[df["sp"] == 0].reset_index(drop=True)

    nome = especie or _nome_especie(csv_path)
    return QCData(csv_path=csv_path, especie=nome, df=df, continuas=continuas,
                  categoricas=categoricas, tem_sp=tem_sp, conjuntos=conjuntos,
                  prefixo=_prefixo(csv_path, nome))


def _prefixo(csv_path: Path, especie: str) -> str:
    """'QC_Sapajus_nigritus_13_07_26' — tipo + espécie + data da pasta da rodada."""
    try:
        import sys
        raiz = str(Path(__file__).resolve().parents[2])
        if raiz not in sys.path:
            sys.path.insert(0, raiz)
        import naming
        # .../<Especie>/<AAAA-MM-DD>/<Especie>_variables_<...>/<CSV>
        pasta_rodada = csv_path.resolve().parent.parent
        return (f'{naming.TIPOS["qc"]}_{naming.slug_especie(especie)}'
                f'_{naming.carimbo(pasta_rodada)}')
    except Exception:  # noqa: BLE001 - prefixo é conveniência; nunca derruba o QC
        return ""


def _nome_especie(csv_path: Path) -> str:
    """Deriva o nome da espécie da pasta 07/<Especie>/ (dois níveis acima do CSV)."""
    try:
        return csv_path.resolve().parent.parent.name
    except Exception:  # noqa: BLE001
        return csv_path.stem


# Rótulos legíveis dos conjuntos (para relatório).
ROTULOS = {
    "completo": "Conjunto completo (presenças + pseudoausências)",
    "presencas": "Apenas presenças",
    "ausencias": "Apenas pseudoausências",
}
