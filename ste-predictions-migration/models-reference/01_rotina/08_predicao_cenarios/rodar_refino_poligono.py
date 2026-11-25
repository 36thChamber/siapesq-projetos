#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# rodar_refino_poligono.py — REFINO 30 m do polígono RS para os 5 modelos do STE.
#
# Estratégia (otimização "delta-downscaling", 17/08/2026 — ~10h em vez de ~2 dias):
#   FASE A  17 cenários × 5 modelos na grade de 250 m (RF completo — rápido).
#   FASE B  cenário ANUAL × 5 modelos na grade de 30 m (RF completo, 10 réplicas).
#   FASE C  demais 16 cenários em 30 m por DELTA: A30 + upsample(S250 − A250),
#           recortado a [0,1]; incerteza = upsample da incerteza 250 m.
#           Racional: entre cenários só o clima (~11 km) muda; a textura de 30 m
#           (habitat) é estática e vem do anual verdadeiro. Coerência ecológica é
#           testada em CADA mapa final.
#   FASE D  VALIDAÇÃO: 1 cenário mensal roda em 30 m "de verdade" (modelo do grupo)
#           e é comparado ao produto delta (r de Pearson, MAE, dif. máx.).
#
# Retomável: cada fase pula saídas que já existem.
# EXECUTAR DA RAIZ, no venv:
#   .venv/Scripts/python.exe 01_rotina/08_predicao_cenarios/rodar_refino_poligono.py

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

# Porta FIXA do cluster paralelo do R deste runner: clusters PSOCK simultâneos com
# porta aleatória (11000-11999) colidem e matam cenários com "serialize(node$con)"
# — visto em 17/08/2026 com 3 jobs paralelos. Cada runner/faixa usa uma porta própria.
ENV = {**os.environ, "R_PARALLEL_PORT": "11211"}

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

STACK30 = ROOT / "02_dados_entrada" / "variaveis_predicao" / "poligono_refino_rs_30m"
STACK250 = ROOT / "02_dados_entrada" / "variaveis_predicao" / "poligono_refino_rs_250m"
SAIDA = ROOT / "03_dados_saida" / "Poligono_refino_RS" / "2026-08-17"

RF = ROOT / "04_resultados_finais"
MODELOS = [
    ("guariba_v3", "Alouatta guariba",
     RF / "Alouatta_guariba" / "2026-08-14_metodologia_v3" / "modelo"),
    ("nigritus_v3", "Sapajus nigritus",
     RF / "Sapajus_nigritus" / "2026-08-14_metodologia_v3" / "modelo"),
    ("grupo_v3", "Primatas grupo",
     RF / "Primatas_grupo" / "2026-08-17_metodologia_v3" / "modelo"),
    ("caraya_nacional_v3", "Alouatta caraya",
     RF / "Alouatta_caraya" / "2026-08-14_metodologia_v3" / "modelo"),
    ("caraya_regional_v2", "Alouatta caraya",
     ROOT / "03_dados_saida" / "Alouatta_caraya" / "2026-08-12" / "regional_rs_v2" / "modelo_rf_v2"),
]

# ESCOPO (decisão do usuário, 17/08/2026): anual + 4 futuros agora; mensais depois.
GRUPOS_ATIVOS = "anual,futuro"
CEN_VALIDACAO = "futuro_2100_ssp585"    # fase D: o delta climático mais extremo = teste mais duro
MODELO_VALIDACAO = "grupo_v3"


def _p(m=""):
    print(m, flush=True)


def _banner(t):
    _p(f"\n{'=' * 78}\n>> {t}\n{'=' * 78}")


def _rodar_orquestrador(especie, model_dir, cen_dir, outdir, grupos=""):
    cmd = [PY, str(ORQ), "--especie", especie,
           "--model_dir", str(model_dir),
           "--cenarios_dir", str(cen_dir),
           "--outdir", str(outdir)]
    if grupos:
        cmd += ["--grupos", grupos]
    rc = subprocess.run(cmd, cwd=str(ROOT), env=ENV).returncode
    if rc != 0:
        _p(f"[ERRO] orquestrador rc={rc} ({outdir}) — seguindo.")


def _ler(path):
    with rasterio.open(path) as src:
        return src.read(1), src.profile


def _upsample_para(arr, perfil_src, perfil_dst):
    dest = np.full((perfil_dst["height"], perfil_dst["width"]), np.nan, dtype="float32")
    reproject(arr, dest, src_transform=perfil_src["transform"], src_crs="EPSG:4326",
              dst_transform=perfil_dst["transform"], dst_crs="EPSG:4326",
              resampling=Resampling.bilinear, src_nodata=np.nan, dst_nodata=np.nan)
    return dest


def fase_a():
    _banner(f"FASE A — cenários [{GRUPOS_ATIVOS}] × 5 modelos em 250 m (RF completo)")
    for slug_m, especie, mdir in MODELOS:
        out = SAIDA / slug_m / "predicoes_250m"
        _p(f"\n--- {slug_m} (250 m) -> {out}")
        _rodar_orquestrador(especie, mdir, STACK250, out, grupos=GRUPOS_ATIVOS)


def fase_b():
    _banner("FASE B — ANUAL × 5 modelos em 30 m (RF completo)")
    for slug_m, especie, mdir in MODELOS:
        out = SAIDA / slug_m / "predicoes_30m"
        _p(f"\n--- {slug_m} (30 m, anual) -> {out}")
        _rodar_orquestrador(especie, mdir, STACK30, out, grupos="anual")


def fase_c():
    _banner("FASE C — delta-downscale dos 16 cenários p/ 30 m + coerência")
    for slug_m, especie, mdir in MODELOS:
        slug = naming.slug_especie(especie)
        d250 = SAIDA / slug_m / "predicoes_250m"
        d30 = SAIDA / slug_m / "predicoes_30m"
        a30_p = d30 / "anual_2015_2024" / f"{slug}_anual_2015_2024_adequabilidade.tif"
        a250_p = d250 / "anual_2015_2024" / f"{slug}_anual_2015_2024_adequabilidade.tif"
        if not (a30_p.exists() and a250_p.exists()):
            _p(f"[delta] {slug_m}: âncora anual ausente (30m={a30_p.exists()}, "
               f"250m={a250_p.exists()}) — modelo pulado; re-rode fases A/B.")
            continue
        a30, p30 = _ler(a30_p)
        a250, p250 = _ler(a250_p)
        cenarios = sorted(p.name for p in d250.iterdir()
                          if p.is_dir() and p.name != "anual_2015_2024"
                          and p.name.split("_")[0] in GRUPOS_ATIVOS.split(","))
        for cen in cenarios:
            destino = d30 / cen
            out_mean = destino / f"{slug}_{cen}_adequabilidade.tif"
            if out_mean.exists():
                _p(f"[delta] {slug_m}/{cen}: já existe — pulando.")
                continue
            s250_p = d250 / cen / f"{slug}_{cen}_adequabilidade.tif"
            if not s250_p.exists():
                _p(f"[delta] {slug_m}/{cen}: 250 m ausente — PULADO.")
                continue
            s250, _ = _ler(s250_p)
            delta30 = _upsample_para(s250 - a250, p250, p30)
            mapa = np.clip(a30 + delta30, 0.0, 1.0).astype("float32")
            destino.mkdir(parents=True, exist_ok=True)
            pr = dict(p30)
            pr.update(dtype="float32", nodata=np.nan)
            with rasterio.open(out_mean, "w", **pr) as dst:
                dst.write(mapa, 1)
            # incerteza: a de 250 m upsampled (o delta não cria incerteza nova)
            i250_p = d250 / cen / f"{slug}_{cen}_incerteza.tif"
            if i250_p.exists():
                i250, _ = _ler(i250_p)
                inc30 = _upsample_para(i250, p250, p30)
                with rasterio.open(destino / f"{slug}_{cen}_incerteza.tif", "w", **pr) as dst:
                    dst.write(inc30.astype("float32"), 1)
            # coerência ecológica no mapa FINAL de 30 m
            treino = mdir / "predictor_climatologico.csv"
            if treino.exists():
                subprocess.run([PY, str(COER), "--mapa", str(out_mean),
                                "--treino", str(treino),
                                "--json", str(destino / f"{slug}_{cen}_coerencia.json")],
                               cwd=str(ROOT))
            _p(f"[delta] {slug_m}/{cen}: 30 m gerado (anual30 + Δ250).")


def fase_d():
    _banner(f"FASE D — validação do delta ({MODELO_VALIDACAO}, {CEN_VALIDACAO} em 30 m real)")
    slug_m = MODELO_VALIDACAO
    especie = next(e for s, e, _ in MODELOS if s == slug_m)
    mdir = next(m for s, _, m in MODELOS if s == slug_m)
    slug = naming.slug_especie(especie)
    dval = SAIDA / "_validacao_delta" / slug_m / CEN_VALIDACAO
    dval.mkdir(parents=True, exist_ok=True)
    out_mean = dval / f"{slug}_{CEN_VALIDACAO}_adequabilidade.tif"
    out_sd = dval / f"{slug}_{CEN_VALIDACAO}_incerteza.tif"
    if not out_mean.exists():
        rscript = shutil.which("Rscript") or sorted(
            glob.glob(r"C:\Program Files\R\R-*\bin\Rscript.exe"))[-1]
        sdm = sorted((Path(mdir)).glob("*.sdm"))[0].stem
        rc = subprocess.run([rscript, str(PREDICT_R), str(mdir), sdm,
                             str(STACK30 / CEN_VALIDACAO), str(out_mean), str(out_sd)],
                            cwd=str(ROOT), env=ENV).returncode
        if rc != 0:
            _p(f"[valid] rodada 30 m real FALHOU (rc={rc}) — validação incompleta.")
            return
    delta_p = SAIDA / slug_m / "predicoes_30m" / CEN_VALIDACAO / \
        f"{slug}_{CEN_VALIDACAO}_adequabilidade.tif"
    if not delta_p.exists():
        _p(f"[valid] produto delta ainda ausente ({delta_p.name}) — rode a fase C antes.")
        return
    verdade, _ = _ler(out_mean)
    aprox, _ = _ler(delta_p)
    ok = np.isfinite(verdade) & np.isfinite(aprox)
    r = float(np.corrcoef(verdade[ok], aprox[ok])[0, 1])
    mae = float(np.abs(verdade[ok] - aprox[ok]).mean())
    dmax = float(np.abs(verdade[ok] - aprox[ok]).max())
    laudo = {"cenario": CEN_VALIDACAO, "modelo": slug_m,
             "r_pearson": round(r, 5), "mae": round(mae, 5),
             "dif_maxima": round(dmax, 4), "n_pixels": int(ok.sum()),
             "veredito": "APROVADO" if (r > 0.98 and mae < 0.02) else "REVISAR"}
    (SAIDA / "_validacao_delta" / "laudo_validacao_delta.json").write_text(
        json.dumps(laudo, indent=2, ensure_ascii=False), encoding="utf-8")
    _p(f"[valid] r={r:.5f} | MAE={mae:.5f} | dif.máx={dmax:.4f} -> {laudo['veredito']}")


def main():
    t0 = time.time()
    fase_a()
    fase_b()
    fase_c()
    fase_d()
    _banner(f"REFINO DO POLÍGONO CONCLUÍDO em {(time.time()-t0)/3600:.1f} h — {SAIDA}")


if __name__ == "__main__":
    main()
