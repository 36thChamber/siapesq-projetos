# deduplicator.py - Deduplicação multi-fonte com rigor configurável
#
# Após unir os dados de todas as fontes, o mesmo registro pode aparecer mais de
# uma vez (ex.: um dado que está no GBIF E no SpeciesLink). A deduplicação remove
# essas repetições aplicando critérios em ordem, do mais confiável para o mais
# heurístico:
#
#   1) occurrenceID                          (identificador global — muito seguro)
#   2) catalogNumber + institutionCode       (mesmo espécime em uma coleção)
#   3) coordenadas + data + espécie          (mesma observação)
#   4) hash dos campos principais            (heurístico agressivo)
#
# CORREÇÃO 16/08/2026 — viés do critério (2) em dados de monitoramento: no SiBBr/ICMBio
# o "catalogNumber" é o número da LICENÇA SISBio, compartilhado por campanhas inteiras
# (basisOfRecord=HUMAN_OBSERVATION). A chave catálogo+instituição fundia um programa de
# monitoramento inteiro em 1 registro (guariba: 41% dos brutos do RS descartados).
# Agora o critério (2) tem dois comportamentos:
#   - ESPÉCIMES (PRESERVED_SPECIMEN etc., ou basis ausente): chave forte, como antes —
#     é o caso legítimo do mesmo espécime repetido entre GBIF e SpeciesLink.
#   - OBSERVAÇÕES (HUMAN/MACHINE_OBSERVATION...): a chave passa a exigir também
#     coordenada (4 casas ≈ 11 m) + data — mesmo catálogo em lugar/dia diferente
#     NÃO é duplicata.
# Trava extra: chave forte cujo grupo tem > _CAMPANHA_MAX_COORDS coordenadas distintas
# é campanha/numeração reutilizada, não espécime — o grupo é preservado e reportado em
# `report["campanhas_preservadas"]`. O relatório também traz `top_keys` (as chaves que
# mais removeram) para nenhuma remoção em massa passar despercebida.
#
# O "rigor" (`level`) controla até onde ir:
#   - "low"    : só (1)   — remove apenas duplicatas quase certas.
#   - "medium" : (1)+(2)+(3) — padrão equilibrado.
#   - "high"   : (1)+(2)+(3)+(4) — mais agressivo.
#
# Em cada critério, só entram linhas cujas colunas-chave estão TODAS preenchidas;
# linhas com chave incompleta são preservadas (não dá para afirmar que são
# duplicatas). Mantém-se sempre a primeira ocorrência de cada grupo.

from __future__ import annotations

import hashlib

import numpy as np
import pandas as pd

# Critérios ativados por nível de rigor.
_LEVEL_CRITERIA: dict[str, list[str]] = {
    "low": ["occurrenceID"],
    "medium": ["occurrenceID", "catalog_institution", "coords_date_species"],
    "high": ["occurrenceID", "catalog_institution", "coords_date_species", "hash"],
}


_SRC_SEP = " | "

# basisOfRecord que denota OBSERVAÇÃO (catálogo pode ser licença/campanha, não espécime).
_BASIS_OBSERVACAO = {"human_observation", "machine_observation", "observation"}
# Chave forte com mais coordenadas distintas que isto = campanha, não espécime.
_CAMPANHA_MAX_COORDS = 5
# Quantas chaves aparecem no top de remoções do relatório.
_TOP_KEYS = 10


def _combine_sources(series: pd.Series) -> str:
    """Une as fontes de um grupo em uma lista ORDENADA e sem repetição (ordem de
    aparição = prioridade, pois o df vem ordenado). Achata fontes já combinadas."""
    seen: list[str] = []
    for val in series.dropna().astype(str):
        for part in val.split(_SRC_SEP):
            part = part.strip()
            if part and part not in seen:
                seen.append(part)
    return _SRC_SEP.join(seen)


def _drop_by_key(
    df: pd.DataFrame, key: pd.Series, keep_mask: pd.Series, label: str, report: dict,
    src_col: str = "source", top_report: dict | None = None,
) -> pd.DataFrame:
    """
    Remove duplicatas segundo `key`, apenas entre as linhas de `keep_mask`.

    `keep_mask` marca as linhas elegíveis (chave completa). As demais são sempre
    mantidas. ANTES de remover, PRESERVA A PROVENIÊNCIA: agrega em `src_col` da linha
    MANTIDA (a primeira = maior prioridade) TODAS as fontes do grupo — a mantida
    primeiro, depois as removidas. Registra quantas linhas cada critério removeu.
    """
    before = len(df)
    idx_all = df.index[keep_mask.to_numpy()]
    if len(idx_all) == 0:
        report[label] = 0
        return df
    k = key[keep_mask]
    dup = k.duplicated().to_numpy()

    # Agrega as fontes por grupo na linha mantida (só onde há duplicata real).
    if src_col in df.columns:
        sub = pd.DataFrame({"_k": k.to_numpy(), "_src": df.loc[idx_all, src_col].to_numpy()},
                           index=idx_all)
        firsts = sub.groupby("_k", sort=False).head(1)  # 1ª linha (mantida) por grupo
        combined = sub.groupby("_k", sort=False)["_src"].agg(_combine_sources)
        for fi, kv in zip(firsts.index, firsts["_k"]):
            merged = combined.loc[kv]
            if _SRC_SEP in merged:  # só reescreve quando havia mais de uma fonte
                df.at[fi, src_col] = merged

    to_drop = idx_all[dup]  # elegíveis que são duplicatas (mantém a 1ª = prioridade)
    # Transparência: as chaves que mais removeram (remoção em massa não pode ser muda).
    if top_report is not None and dup.any():
        cont = k[dup].value_counts().head(_TOP_KEYS)
        top_report[label] = [(str(kk), int(v)) for kk, v in cont.items()]
    out = df.drop(index=to_drop)
    report[label] = before - len(out)
    return out


def _hash_row(row: pd.Series) -> str:
    """Hash estável dos campos principais (coords arredondadas + data + espécie)."""
    lat = row.get("decimalLatitude")
    lon = row.get("decimalLongitude")
    parts = [
        f"{float(lat):.4f}" if pd.notna(lat) else "",
        f"{float(lon):.4f}" if pd.notna(lon) else "",
        str(row.get("year") or ""),
        str(row.get("month") or ""),
        str(row.get("day") or ""),
        str(row.get("species") or "").strip().lower(),
    ]
    return hashlib.sha1("|".join(parts).encode("utf-8")).hexdigest()


def deduplicate(df: pd.DataFrame, level: str = "medium",
                provider_priority: list[str] | None = None) -> tuple[pd.DataFrame, dict]:
    """
    Deduplica `df` no rigor `level`. Retorna (df_sem_duplicatas, relatório).

    `provider_priority`: ordem das fontes da MELHOR para a pior (ex.: ['gbif',
    'obis', ...]). A duplicata MANTIDA é sempre a da fonte de maior prioridade —
    e o resultado fica DETERMINÍSTICO (antes dependia do timing das threads: qual
    duplicata sobrevivia mudava a cada execução). Sem `provider_priority`, ordena
    por nome do provider (alfabético) só para garantir reprodutibilidade.
    """
    if level not in _LEVEL_CRITERIA:
        raise ValueError(f"level inválido: {level!r} (use 'low', 'medium' ou 'high').")
    report: dict = {"level": level, "initial": len(df), "removed_by": {}, "top_keys": {}}
    if df.empty:
        report["final"] = 0
        return df, report

    df = df.reset_index(drop=True)

    # DETERMINISMO + QUALIDADE: ordena (estável) para que `duplicated(keep='first')`
    # preserve sempre a mesma linha — a da fonte de maior prioridade.
    if "provider" in df.columns:
        if provider_priority:
            rank = {p: i for i, p in enumerate(provider_priority)}
            key_rank = df["provider"].map(lambda p: rank.get(p, len(rank)))
        else:
            key_rank = df["provider"].astype("string").fillna("~")
        df = (df.assign(_rank=key_rank)
                .sort_values("_rank", kind="stable")
                .drop(columns="_rank").reset_index(drop=True))

    for criterion in _LEVEL_CRITERIA[level]:
        if criterion == "occurrenceID":
            col = df["occurrenceID"].astype("string")
            mask = col.notna() & (col.str.strip() != "")
            df = _drop_by_key(df, col, mask, "occurrenceID", report["removed_by"],
                              top_report=report["top_keys"])

        elif criterion == "catalog_institution":
            cat = df["catalogNumber"].astype("string")
            inst = df["institutionCode"].astype("string")
            tem_catalogo = (
                cat.notna() & (cat.str.strip() != "")
                & inst.notna() & (inst.str.strip() != "")
            )
            key = cat.str.strip().str.lower() + "||" + inst.str.strip().str.lower()

            basis = (df["basisOfRecord"].astype("string").str.strip().str.lower()
                     if "basisOfRecord" in df.columns
                     else pd.Series("", index=df.index, dtype="string"))
            eh_obs = basis.isin(_BASIS_OBSERVACAO).fillna(False)

            lat4 = pd.to_numeric(df["decimalLatitude"], errors="coerce").round(4)
            lon4 = pd.to_numeric(df["decimalLongitude"], errors="coerce").round(4)
            coord4 = lat4.astype("string").fillna("") + "," + lon4.astype("string").fillna("")

            # (2a) ESPÉCIMES: chave forte — mas grupos com muitas coordenadas distintas
            # são campanha (licença/numeração reutilizada), não espécime: preserva.
            mask_esp = tem_catalogo & ~eh_obs
            n_coords = coord4[mask_esp].groupby(key[mask_esp]).nunique()
            campanhas = set(n_coords[n_coords > _CAMPANHA_MAX_COORDS].index)
            if campanhas:
                report.setdefault("campanhas_preservadas", {})["catalog_institution"] = [
                    (str(c), int(n_coords[c])) for c in sorted(campanhas)]
                mask_esp = mask_esp & ~key.isin(campanhas)
            df = _drop_by_key(df, key, mask_esp, "catalog_institution",
                              report["removed_by"], top_report=report["top_keys"])

            # (2b) OBSERVAÇÕES: catálogo pode ser licença SISBio — só é duplicata se
            # também coincidirem lugar (~11 m) e data. Sem coordenada, preserva.
            # (recalcula as séries: o df encolheu na fase 2a e os índices mudaram)
            cat = df["catalogNumber"].astype("string")
            inst = df["institutionCode"].astype("string")
            tem_catalogo = (cat.notna() & (cat.str.strip() != "")
                            & inst.notna() & (inst.str.strip() != ""))
            key = cat.str.strip().str.lower() + "||" + inst.str.strip().str.lower()
            basis = (df["basisOfRecord"].astype("string").str.strip().str.lower()
                     if "basisOfRecord" in df.columns
                     else pd.Series("", index=df.index, dtype="string"))
            eh_obs = basis.isin(_BASIS_OBSERVACAO).fillna(False)
            lat4 = pd.to_numeric(df["decimalLatitude"], errors="coerce").round(4)
            lon4 = pd.to_numeric(df["decimalLongitude"], errors="coerce").round(4)
            coord4 = lat4.astype("string").fillna("") + "," + lon4.astype("string").fillna("")
            mask_obs = tem_catalogo & eh_obs & lat4.notna() & lon4.notna()
            key_obs = (key + "||" + coord4 + "||"
                       + df["year"].astype("string").fillna("") + "-"
                       + df["month"].astype("string").fillna("") + "-"
                       + df["day"].astype("string").fillna(""))
            df = _drop_by_key(df, key_obs, mask_obs, "catalog_institution_obs",
                              report["removed_by"], top_report=report["top_keys"])

        elif criterion == "coords_date_species":
            lat = pd.to_numeric(df["decimalLatitude"], errors="coerce")
            lon = pd.to_numeric(df["decimalLongitude"], errors="coerce")
            sp = df["species"].astype("string")
            # Exige DATA presente: sem year/month/day, o antigo `<NA>` colidia e fundia
            # registros distintos sem data (mesma coord/espécie). Undatados são
            # preservados aqui (podem ser pegos pelo critério 'hash' no nível 'high').
            mask = (lat.notna() & lon.notna() & sp.notna() & (sp.str.strip() != "")
                    & df["year"].notna() & df["month"].notna() & df["day"].notna())
            key = pd.Series(
                lat.round(5).astype("string") + "|"
                + lon.round(5).astype("string") + "|"
                + df["year"].astype("string") + "|"
                + df["month"].astype("string") + "|"
                + df["day"].astype("string") + "|"
                + sp.str.strip().str.lower(),
                index=df.index,
            )
            df = _drop_by_key(df, key, mask, "coords_date_species", report["removed_by"],
                              top_report=report["top_keys"])

        elif criterion == "hash":
            key = df.apply(_hash_row, axis=1)
            mask = pd.Series(True, index=df.index)
            df = _drop_by_key(df, key, mask, "hash", report["removed_by"],
                              top_report=report["top_keys"])

        df = df.reset_index(drop=True)

    report["final"] = len(df)
    report["total_removed"] = report["initial"] - report["final"]
    return df, report
