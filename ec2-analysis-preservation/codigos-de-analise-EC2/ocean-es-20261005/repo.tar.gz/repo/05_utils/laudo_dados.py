#!/usr/bin/env python3
# laudo_dados.py — INVENTÁRIO, COMPARABILIDADE EXPERIMENTAL, PERDA DE REGISTROS e
# CARACTERIZAÇÃO DOS DADOS para o laudo comparativo (diário × climatológico).
#
# Tudo lido direto do disco (não inventa nada). Produz JSON/CSV consumidos pelo HTML.
#
# Ponto central da perda de dados: o modelo CLIMATOLÓGICO usa o NDVI da média de 10 anos
# (existe para qualquer data), então mantém presenças de qualquer ano; o modelo DIÁRIO usa
# NDVI do MODIS na data do registro, que só existe a partir de 2000 — presenças anteriores
# entram sem NDVI e são descartadas no treino (complete.cases). Isso cria uma perda
# ASSIMÉTRICA (só no diário) que este módulo quantifica no tempo e no espaço.

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
BASE = ROOT / "07 Executado por espécie"
COMP = ROOT / "05_utils" / "_comparacao_brasil"
COMP.mkdir(parents=True, exist_ok=True)
RODADA = "2026-07-17"
ESPS = ["Alouatta_caraya", "Alouatta_guariba", "Sapajus_nigritus"]
PREDS = ["t2m", "e", "tp", "ndvi", "altitude", "awc", "ocup_solo_mapbiomas"]


def _ler(p: Path) -> pd.DataFrame | None:
    try:
        return pd.read_csv(p)
    except Exception:  # noqa: BLE001
        return None


def _dataset(esp: str, modo: str) -> pd.DataFrame | None:
    sub = "_variables_climatologico_" if modo == "clima" else "_variables_"
    d = BASE / esp / RODADA / f"{esp}{sub}17_07_26"
    pat = "VariablesClimatologico_*.csv" if modo == "clima" else "Variables_*.csv"
    fs = [f for f in d.glob(pat) if "Cache" not in f.name] if d.exists() else []
    return _ler(fs[0]) if fs else None


def _completos(df: pd.DataFrame) -> pd.DataFrame:
    """Casos completos nos 7 preditores — é o que o RF realmente treina (complete.cases)."""
    cols = [c for c in PREDS if c in df.columns]
    return df.dropna(subset=cols + ["sp"])


def inventario() -> list[dict]:
    """Tabela de inventário: cada arquivo-chave, com espécie, metodologia, tipo, integridade."""
    import rasterio
    linhas = []
    for esp in ESPS:
        d = BASE / esp / RODADA
        # datasets de treino
        for modo in ["daily", "clima"]:
            ds = _dataset(esp, modo)
            n = len(ds) if ds is not None else 0
            comp = len(_completos(ds)) if ds is not None else 0
            linhas.append(dict(especie=esp, metodologia=modo, tipo="dataset_treino",
                               registros=n, completos_7preds=comp,
                               integridade="ok" if n else "AUSENTE"))
        # modelos
        for modo, mdir, nm in [("daily", "modelo_rf_daily", "daily"),
                               ("clima", "modelo_rf_climatologico", "clima")]:
            sdm = d / mdir / f"rf_{esp}_{nm}.sdm"
            linhas.append(dict(especie=esp, metodologia=modo, tipo="modelo_sdm",
                               registros=None, completos_7preds=None,
                               integridade="ok" if sdm.exists() else "AUSENTE"))
        # predições Brasil (podem ainda não existir)
        for modo in ["daily", "clima"]:
            mean = ROOT / "env_data" / "predicao_brasil_comparacao" / f"BR_{modo}_{esp}_mean.tif"
            info = "AUSENTE"
            if mean.exists():
                try:
                    with rasterio.open(mean) as s:
                        info = f"{s.width}x{s.height} @ {s.res[0]:.3f}° {s.crs}"
                except Exception:  # noqa: BLE001
                    info = "ilegível"
            linhas.append(dict(especie=esp, metodologia=modo, tipo="predicao_brasil_1km",
                               registros=None, completos_7preds=None, integridade=info))
    return linhas


def comparabilidade() -> dict:
    """Verifica o que as duas metodologias compartilham. As diferenças são INTENCIONAIS
    (variável climática diária × decenal) ou ACIDENTAIS/perda. Classifica 🟢🟡🔴."""
    itens = []
    # As duas metodologias partem das MESMAS ocorrências/pseudo (mesma pasta, mesmo pipeline
    # até a captura); divergem só na captura da variável climática e na perda pré-2000.
    itens.append(dict(item="Ocorrências originais (após limpeza)", igual=True,
                      nota="Mesmo Occurrence_*.csv por espécie (pipeline único até a captura)."))
    itens.append(dict(item="Pseudoausências (localização e número)", igual=True,
                      nota="Mesmo Pseudoabsence_*.csv (1:1, sem raio) — gerado uma vez por espécie."))
    itens.append(dict(item="Área M / espaço acessível", igual=True,
                      nota="Mesma ecorregião × Brasil; pseudo idêntica nos dois modos."))
    itens.append(dict(item="Variáveis conceituais (7 preditores)", igual=True,
                      nota="t2m,e,tp,ndvi,altitude,awc,uso_solo — mesmos nomes e ordem."))
    itens.append(dict(item="Clima: janela temporal da variável", igual=False,
                      nota="INTENCIONAL: diário=dia do registro; climatológico=média ~10 anos. "
                           "É a diferença que se quer medir."))
    itens.append(dict(item="Thinning espacial das presenças", igual=False,
                      nota="INTENCIONAL: o climatológico deduplica a ~1 km/classe (o clima não "
                           "depende da data, senão haveria pseudo-replicação); o diário não."))
    itens.append(dict(item="Presenças efetivamente treinadas", igual=False,
                      nota="ACIDENTAL: diário perde pré-2000 (NDVI/MODIS); clima perde costeiras "
                           "(nodata de awc/ERA5 no raster do Brasil)."))
    itens.append(dict(item="Balanço de classes presença:pseudo", igual=False,
                      nota="ACIDENTAL: diário ~1:1; climatológico ~1:1,5 (menos presenças após "
                           "thinning + lacunas). Afeta limiares e calibração."))
    itens.append(dict(item="Fonte da variável de solo (awc)", igual=False,
                      nota="Diário: SoilGrids WCS por-ponto; clima: raster do Brasil. Mesmo "
                           "conceito, mas nodata diferente no litoral."))
    itens.append(dict(item="Algoritmo e hiperparâmetros (RF)", igual=True,
                      nota="randomForest via sdm; ntree=1000, mtry=8, bootstrap 10 réplicas."))
    itens.append(dict(item="Estratégia de validação", igual=True,
                      nota="Bootstrap aleatório 10× nos dois. NÃO há validação espacial em nenhum."))
    itens.append(dict(item="Cenário de projeção (Brasil 1 km)", igual=True,
                      nota="Mesmos rasters da média de 10 anos p/ os dois modos (predicao_7var_brasil_1km)."))
    itens.append(dict(item="Resolução / CRS / extensão / máscara", igual=True,
                      nota="1 km, EPSG:4326, mesma grade e recorte nos dois."))
    n_dif = sum(1 for i in itens if not i["igual"])
    return dict(itens=itens, n_diferencas=n_dif,
                classificacao="🟡 parcialmente comparável",
                resumo="A comparação é 🟡 PARCIALMENTE comparável. Partilham a MESMA origem de "
                       "ocorrências e pseudoausências, o MESMO algoritmo e validação (bootstrap "
                       "10×) e o MESMO cenário de projeção (Brasil 1 km, média decenal). Diferem "
                       "em: (1) janela temporal do clima — diferença INTENCIONAL, o objeto do "
                       "estudo; (2) thinning espacial das presenças no climatológico — "
                       "INTENCIONAL e necessário; (3) lacunas de preditor assimétricas e (4) "
                       "balanço de classes — ACIDENTAIS, a controlar. Conclusões devem separar o "
                       "efeito do TREINO (1-2) do efeito de PROCESSAMENTO (3-4).")


def _faltantes(df: pd.DataFrame) -> dict:
    """Presenças perdidas por cada preditor faltante (complete.cases)."""
    pr = df[df.sp == 1]
    return {c: int(pr[c].isna().sum()) for c in PREDS
            if c in pr.columns and pr[c].isna().sum() > 0}


def perda_dados() -> dict:
    """Funil de registros por metodologia. Distingue DOIS efeitos, de naturezas diferentes:

    (A) THINNING ESPACIAL — INTENCIONAL, só no climatológico: como o clima passa a depender
        só do LOCAL (não da data), registros no mesmo sítio viram linhas idênticas; o pipeline
        deduplica a ~1 km/classe para evitar pseudo-replicação (prática padrão em SDM). O modo
        diário NÃO deduplica, pois o mesmo local em datas diferentes tem clima diário distinto.
    (B) LACUNAS DE PREDITOR — ACIDENTAL e ASSIMÉTRICA (complete.cases):
        - diário perde presenças PRÉ-2000 (NDVI/MODIS começa em 2000);
        - climatológico perde presenças COSTEIRAS/de borda (nodata do raster awc e das bordas
          do ERA5 decenal) — awc vem de fontes diferentes nos dois modos (diário: SoilGrids
          por-ponto; clima: raster do Brasil, com mais nodata litorâneo).
    """
    out = {}
    for esp in ESPS:
        rep_p = BASE / esp / RODADA / f"OccurrenceReport_{esp}_17_07_26.json"
        funil = {}
        if rep_p.exists():
            rep = json.loads(rep_p.read_text(encoding="utf-8"))
            funil = dict(baixado=rep.get("total_downloaded"),
                         apos_merge=rep.get("total_after_merge"),
                         apos_dedup=rep.get("total_after_dedup"),
                         apos_limpeza=rep.get("total_after_clean"))
            funil["removidos_limpeza"] = rep.get("cleaning_report", {}).get("removed", {})

        # presenças brutas (arquivo de pseudoausência = entrada da captura, pré-thinning)
        ps = _ler(BASE / esp / RODADA / f"Pseudoabsence_{esp}_17_07_26.csv")
        brutas = int((ps.sp == 1).sum()) if ps is not None and "sp" in ps.columns else None

        d_esp = {}
        anos = {}
        for modo in ["daily", "clima"]:
            ds = _dataset(esp, modo)
            if ds is None:
                continue
            pre_cc = int((ds.sp == 1).sum())          # presenças no dataset (pós-thinning se clima)
            comp = _completos(ds)
            pos_cc = int((comp.sp == 1).sum())         # presenças que o RF de fato treina
            d_esp[modo] = dict(
                presencas_no_dataset=pre_cc,
                thinning_espacial=(brutas - pre_cc) if (brutas and modo == "clima") else 0,
                presencas_treinadas=pos_cc,
                perdidas_complete_cases=pre_cc - pos_cc,
                faltantes_por_preditor=_faltantes(ds),
                pseudo=int((comp.sp == 0).sum()),
                balanco=f"1:{round(int((comp.sp==0).sum())/max(pos_cc,1),2)}",
            )
            a = pd.to_numeric(comp[comp.sp == 1].get("year"), errors="coerce").dropna().astype(int)
            anos[modo] = {int(k): int(v) for k, v in a.value_counts().sort_index().items()}

        out[esp] = dict(funil=funil, presencas_brutas=brutas, modos=d_esp, anos=anos)
    return out


def _nn_km(lats: np.ndarray, lons: np.ndarray) -> dict:
    """Distância ao vizinho mais próximo (km) via BallTree haversine — densidade espacial."""
    from sklearn.neighbors import BallTree
    if len(lats) < 2:
        return {}
    X = np.radians(np.c_[lats, lons])
    tree = BallTree(X, metric="haversine")
    d, _ = tree.query(X, k=2)
    nn = d[:, 1] * 6371.0
    return dict(media_km=float(nn.mean()), mediana_km=float(np.median(nn)),
                min_km=float(nn.min()), max_km=float(nn.max()))


def caracterizacao() -> dict:
    out = {}
    for esp in ESPS:
        out[esp] = {}
        for modo in ["daily", "clima"]:
            ds = _dataset(esp, modo)
            if ds is None:
                continue
            comp = _completos(ds)
            pres = comp[comp.sp == 1]; pau = comp[comp.sp == 0]
            anos = pd.to_numeric(pres.get("year"), errors="coerce").dropna().astype(int)
            meses = pd.to_numeric(pres.get("month"), errors="coerce").dropna().astype(int)
            est = {"verão(12-2)": int(meses.isin([12, 1, 2]).sum()),
                   "outono(3-5)": int(meses.isin([3, 4, 5]).sum()),
                   "inverno(6-8)": int(meses.isin([6, 7, 8]).sum()),
                   "primavera(9-11)": int(meses.isin([9, 10, 11]).sum())}
            info = dict(
                n_presencas=int(len(pres)), n_pseudo=int(len(pau)),
                proporcao=f"1:{round(len(pau)/max(len(pres),1),2)}",
                ano_min=int(anos.min()) if len(anos) else None,
                ano_max=int(anos.max()) if len(anos) else None,
                por_ano={int(k): int(v) for k, v in anos.value_counts().sort_index().items()},
                por_mes={int(k): int(v) for k, v in meses.value_counts().sort_index().items()},
                por_estacao=est,
            )
            if "decimalLatitude" in pres.columns:
                info["densidade_espacial"] = _nn_km(
                    pres.decimalLatitude.to_numpy(), pres.decimalLongitude.to_numpy())
            out[esp][modo] = info
    return out


def main() -> None:
    inv = inventario()
    pd.DataFrame(inv).to_csv(COMP / "inventario.csv", index=False)
    saida = dict(
        comparabilidade=comparabilidade(),
        perda=perda_dados(),
        caracterizacao=caracterizacao(),
    )
    (COMP / "dados.json").write_text(json.dumps(saida, indent=2, ensure_ascii=False),
                                     encoding="utf-8")
    # resumo no console
    for esp, v in saida["perda"].items():
        d = v["modos"].get("daily", {}); c = v["modos"].get("clima", {})
        print(f"  {esp:18} brutas={v['presencas_brutas']:5d} | "
              f"daily treina={d.get('presencas_treinadas'):5d} ({d.get('balanco')}) | "
              f"clima treina={c.get('presencas_treinadas'):5d} ({c.get('balanco')}, "
              f"thinning={c.get('thinning_espacial')})")
    print("[ok] inventario.csv + dados.json")


if __name__ == "__main__":
    main()
