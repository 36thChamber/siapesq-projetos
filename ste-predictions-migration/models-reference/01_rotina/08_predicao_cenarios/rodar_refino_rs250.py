#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# rodar_refino_rs250.py — NÍVEL 2 da entrega: todos os cenários do RS em 250 m.
#
# Arquitetura de apresentação do STE (decisão do usuário, 17/08/2026):
#   nível 1: nacional 1,1 km (pronto) · nível 2: RS 250 m (este script)
#   · nível 3: polígono de estudo 30 m (rodar_refino_poligono.py)
#
# Estratégia delta (âncoras grossas JÁ EXISTEM — os mapas nacionais/regionais):
#   FASE A  cenário ANUAL × 5 modelos em 250 m na janela RS (RF completo).
#   FASE B  demais 16 cenários (futuros E mensais) por delta:
#           S250 = clip01( anual250 + upsample(S_grosso − anual_grosso) ),
#           onde S_grosso são os mapas de 1,1 km já validados (nacionais; para o
#           caraya regional, os regionais v2). Incerteza = upsample da grossa.
#           Coerência ecológica testada em CADA mapa final.
#   FASE C  VALIDAÇÃO: futuro_2100_ssp585 (grupo) roda em 250 m RF real e é
#           comparado ao delta (gate: r > 0,98 e MAE < 0,02).
#
# Janela RS (padrão regional do projeto): [-60.5, -34, -49.5, -25] @ 0,0025°.
# Retomável: pula saídas existentes. EXECUTAR DA RAIZ, no venv.

from __future__ import annotations

import glob
import io
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

ENV = {**os.environ, "R_PARALLEL_PORT": "11411"}  # porta fixa: evita colisao de clusters R entre faixas
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.warp import reproject

ROTINA = Path(__file__).resolve().parents[1]
ROOT = ROTINA.parent
sys.path.insert(0, str(ROTINA))
import naming  # noqa: E402

PY = sys.executable
ORQ = ROTINA / "08_predicao_cenarios" / "run_predicoes_cenarios.py"
COER = ROTINA / "07_validacao_ecologica" / "teste_coerencia_ecologica.py"
PREDICT_R = ROTINA / "06_modelagem_rf" / "run_predict_climatologico.R"

STACK = ROOT / "02_dados_entrada" / "variaveis_predicao" / "rs_250m"
SAIDA = ROOT / "03_dados_saida" / "RS_refino_250m" / "2026-08-17"

RF = ROOT / "04_resultados_finais"
# (slug_saida, espécie, pasta do modelo, pasta das PREDIÇÕES-ÂNCORA grossas)
MODELOS = [
    ("guariba_v3", "Alouatta guariba",
     RF / "Alouatta_guariba" / "2026-08-14_metodologia_v3" / "modelo",
     RF / "Alouatta_guariba" / "2026-08-14_metodologia_v3" / "predicoes"),
    ("nigritus_v3", "Sapajus nigritus",
     RF / "Sapajus_nigritus" / "2026-08-14_metodologia_v3" / "modelo",
     RF / "Sapajus_nigritus" / "2026-08-14_metodologia_v3" / "predicoes"),
    ("grupo_v3", "Primatas grupo",
     RF / "Primatas_grupo" / "2026-08-17_metodologia_v3" / "modelo",
     RF / "Primatas_grupo" / "2026-08-17_metodologia_v3" / "predicoes"),
    ("caraya_nacional_v3", "Alouatta caraya",
     RF / "Alouatta_caraya" / "2026-08-14_metodologia_v3" / "modelo",
     RF / "Alouatta_caraya" / "2026-08-14_metodologia_v3" / "predicoes"),
    ("caraya_regional_v2", "Alouatta caraya",
     ROOT / "03_dados_saida" / "Alouatta_caraya" / "2026-08-12" / "regional_rs_v2" / "modelo_rf_v2",
     ROOT / "03_dados_saida" / "Alouatta_caraya" / "2026-08-12" / "regional_rs_v2" / "predicoes_v2"),
]

CEN_VALIDACAO = "futuro_2100_ssp585"
MODELO_VALIDACAO = "grupo_v3"


def _p(m=""):
    print(m, flush=True)


def _banner(t):
    _p(f"\n{'=' * 78}\n>> {t}\n{'=' * 78}")


def _ler(path):
    with rasterio.open(path) as src:
        return src.read(1), src.profile


def _para_grade(arr, perfil_src, perfil_dst):
    """Reprojeta (recorta + reamostra bilinear) um array para a grade destino."""
    dest = np.full((perfil_dst["height"], perfil_dst["width"]), np.nan, dtype="float32")
    reproject(arr.astype("float32"), dest,
              src_transform=perfil_src["transform"], src_crs="EPSG:4326",
              dst_transform=perfil_dst["transform"], dst_crs="EPSG:4326",
              resampling=Resampling.bilinear, src_nodata=np.nan, dst_nodata=np.nan)
    return dest


def fase_a():
    _banner("FASE A — ANUAL × 5 modelos em 250 m na janela RS (RF completo)")
    for slug_m, especie, mdir, _anc in MODELOS:
        out = SAIDA / slug_m
        _p(f"\n--- {slug_m} -> {out}")
        cmd = [PY, str(ORQ), "--especie", especie, "--model_dir", str(mdir),
               "--cenarios_dir", str(STACK), "--outdir", str(out), "--grupos", "anual"]
        rc = subprocess.run(cmd, cwd=str(ROOT), env=ENV).returncode
        if rc != 0:
            _p(f"[ERRO] orquestrador rc={rc} ({slug_m}) — seguindo.")


def fase_b():
    _banner("FASE B — 16 cenários por delta (âncoras de 1,1 km já validadas)")
    for slug_m, especie, mdir, ancora in MODELOS:
        slug = naming.slug_especie(especie)
        a250_p = (SAIDA / slug_m / "anual_2015_2024"
                  / f"{slug}_anual_2015_2024_adequabilidade.tif")
        if not a250_p.exists():
            _p(f"[delta] {slug_m}: anual 250 m AUSENTE — modelo pulado "
               f"(re-rode a fase A p/ repor).")
            continue
        a250, p250 = _ler(a250_p)
        agr_p = ancora / "anual_2015_2024" / f"{slug}_anual_2015_2024_adequabilidade.tif"
        agr_arr, agr_perf = _ler(agr_p)
        agr250 = _para_grade(agr_arr, agr_perf, p250)
        cenarios = sorted(p.name for p in ancora.iterdir()
                          if p.is_dir() and p.name != "anual_2015_2024"
                          and not p.name.startswith("_"))
        for cen in cenarios:
            destino = SAIDA / slug_m / cen
            out_mean = destino / f"{slug}_{cen}_adequabilidade.tif"
            if out_mean.exists():
                _p(f"[delta] {slug_m}/{cen}: já existe — pulando.")
                continue
            sg_p = ancora / cen / f"{slug}_{cen}_adequabilidade.tif"
            if not sg_p.exists():
                _p(f"[delta] {slug_m}/{cen}: âncora grossa ausente — PULADO.")
                continue
            sg_arr, sg_perf = _ler(sg_p)
            delta = _para_grade(sg_arr, sg_perf, p250) - agr250
            mapa = np.clip(a250 + delta, 0.0, 1.0).astype("float32")
            destino.mkdir(parents=True, exist_ok=True)
            pr = dict(p250)
            pr.update(dtype="float32", nodata=np.nan)
            with rasterio.open(out_mean, "w", **pr) as dst:
                dst.write(mapa, 1)
            ig_p = ancora / cen / f"{slug}_{cen}_incerteza.tif"
            if ig_p.exists():
                ig_arr, ig_perf = _ler(ig_p)
                with rasterio.open(destino / f"{slug}_{cen}_incerteza.tif", "w", **pr) as dst:
                    dst.write(_para_grade(ig_arr, ig_perf, p250).astype("float32"), 1)
            treino = mdir / "predictor_climatologico.csv"
            if treino.exists():
                subprocess.run([PY, str(COER), "--mapa", str(out_mean),
                                "--treino", str(treino),
                                "--json", str(destino / f"{slug}_{cen}_coerencia.json")],
                               cwd=str(ROOT))
            _p(f"[delta] {slug_m}/{cen}: 250 m gerado (anual250 + Δ1,1km).")


def fase_c():
    _banner(f"FASE C — validação ({MODELO_VALIDACAO}, {CEN_VALIDACAO} em 250 m RF real)")
    slug_m = MODELO_VALIDACAO
    especie = next(e for s, e, _m, _a in MODELOS if s == slug_m)
    mdir = next(m for s, _e, m, _a in MODELOS if s == slug_m)
    slug = naming.slug_especie(especie)
    dval = SAIDA / "_validacao_delta" / slug_m / CEN_VALIDACAO
    dval.mkdir(parents=True, exist_ok=True)
    out_mean = dval / f"{slug}_{CEN_VALIDACAO}_adequabilidade.tif"
    out_sd = dval / f"{slug}_{CEN_VALIDACAO}_incerteza.tif"
    if not out_mean.exists():
        rscript = shutil.which("Rscript") or sorted(
            glob.glob(r"C:\Program Files\R\R-*\bin\Rscript.exe"))[-1]
        sdm = sorted(Path(mdir).glob("*.sdm"))[0].stem
        rc = subprocess.run([rscript, str(PREDICT_R), str(mdir), sdm,
                             str(STACK / CEN_VALIDACAO), str(out_mean), str(out_sd)],
                            cwd=str(ROOT), env=ENV).returncode
        if rc != 0:
            _p(f"[valid] rodada 250 m real FALHOU (rc={rc}).")
            return
    verdade, _ = _ler(out_mean)
    aprox, _ = _ler(SAIDA / slug_m / CEN_VALIDACAO
                    / f"{slug}_{CEN_VALIDACAO}_adequabilidade.tif")
    ok = np.isfinite(verdade) & np.isfinite(aprox)
    r = float(np.corrcoef(verdade[ok], aprox[ok])[0, 1])
    mae = float(np.abs(verdade[ok] - aprox[ok]).mean())
    laudo = {"cenario": CEN_VALIDACAO, "modelo": slug_m, "r_pearson": round(r, 5),
             "mae": round(mae, 5),
             "dif_maxima": round(float(np.abs(verdade[ok] - aprox[ok]).max()), 4),
             "n_pixels": int(ok.sum()),
             "veredito": "APROVADO" if (r > 0.98 and mae < 0.02) else "REVISAR"}
    (SAIDA / "_validacao_delta" / "laudo_validacao_delta.json").write_text(
        json.dumps(laudo, indent=2, ensure_ascii=False), encoding="utf-8")
    _p(f"[valid] r={r:.5f} | MAE={mae:.5f} -> {laudo['veredito']}")


def main():
    t0 = time.time()
    fase_a()
    fase_b()
    fase_c()
    _banner(f"REFINO RS 250 m CONCLUÍDO em {(time.time()-t0)/3600:.1f} h — {SAIDA}")


if __name__ == "__main__":
    main()
