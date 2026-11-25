# validator.py - Validação estrutural (não-destrutiva)
#
# Diferente da LIMPEZA (que remove registros ruins), a validação aqui apenas
# MARCA problemas na coluna `quality_flags`, sem apagar nada. Assim o usuário vê
# o que há de suspeito antes da limpeza decidir o que remover. As flags usadas:
#
#   NO_COORD        -> sem latitude/longitude
#   COORD_OUT_RANGE -> |lat|>90 ou |lon|>180
#   ZERO_COORD      -> exatamente (0, 0)
#   NO_SPECIES      -> sem nome de espécie
#   NO_DATE         -> sem ano
#
# As flags são acumuladas (separadas por ';') preservando flags que já venham do
# provider.

from __future__ import annotations

import pandas as pd


def _append_flag(current: pd.Series, mask: pd.Series, flag: str) -> pd.Series:
    """Acrescenta `flag` às linhas de `mask`, preservando flags existentes."""
    def add(value: object, do: bool) -> object:
        if not do:
            return value
        empty = value is None or (not isinstance(value, str) and pd.isna(value)) or value == ""
        if empty:
            return flag
        return f"{value};{flag}"

    return pd.Series(
        [add(v, bool(m)) for v, m in zip(current.tolist(), mask.tolist())],
        index=current.index,
    )


def validate(df: pd.DataFrame) -> pd.DataFrame:
    """
    Marca problemas em `quality_flags` sem remover linhas.

    Retorna uma cópia do DataFrame com a coluna `quality_flags` atualizada.
    """
    if df.empty:
        return df
    df = df.copy()

    lat = pd.to_numeric(df["decimalLatitude"], errors="coerce")
    lon = pd.to_numeric(df["decimalLongitude"], errors="coerce")
    species = df["species"].astype("string")

    flags = df["quality_flags"]

    no_coord = lat.isna() | lon.isna()
    flags = _append_flag(flags, no_coord, "NO_COORD")

    out_range = (~no_coord) & (~lat.between(-90, 90) | ~lon.between(-180, 180))
    flags = _append_flag(flags, out_range, "COORD_OUT_RANGE")

    zero_coord = (lat.abs() < 1e-8) & (lon.abs() < 1e-8)
    flags = _append_flag(flags, zero_coord.fillna(False), "ZERO_COORD")

    no_species = species.isna() | (species.str.strip() == "")
    flags = _append_flag(flags, no_species, "NO_SPECIES")

    no_date = pd.to_numeric(df["year"], errors="coerce").isna()
    flags = _append_flag(flags, no_date, "NO_DATE")

    df["quality_flags"] = flags
    return df
