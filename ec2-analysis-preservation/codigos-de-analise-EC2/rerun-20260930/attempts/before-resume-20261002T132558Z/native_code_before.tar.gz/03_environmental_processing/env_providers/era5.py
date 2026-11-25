#!/usr/bin/env python3
# era5.py — Provider ERA5-Land (clima): t2m (média diária), tp/e (acumulado do dia)
from __future__ import annotations

import os
from pathlib import Path

import pandas as pd

from .base import EnvProvider, CaptureContext, apply_downloader_step, ensure_downloaders_on_path


class ERA5Provider(EnvProvider):
    name = "era5"
    columns = ["t2m", "e", "tp"]

    def capture(self, df: pd.DataFrame, ctx: CaptureContext) -> pd.DataFrame:
        ensure_downloaders_on_path()
        from downloaders.cdsapi import run_cmd as era5_cmd, era5_max_workers
        data_dir = str(ctx.data_root / "era5")
        os.makedirs(data_dir, exist_ok=True)
        stem = f"step_era5_{ctx.token}"
        out = Path(f"out_{stem}.csv")  # cdsapi grava out_<base> no CWD
        try:
            # 2 threads POR CONTA do CDS — medido, não chutado (2026-07-13):
            #   2 threads -> 3,0 datas/min, 7,6 MB/min, ZERO recusas
            #   8 threads -> 2,5 datas/min, 8,5 MB/min, e o CDS começou a RECUSAR
            #                ('rejected'), perdendo datas. A vazão é a MESMA.
            # O CDS limita POR USUÁRIO: subir threads na MESMA conta não acelera nada.
            # A única alavanca é ter MAIS CONTAS (cada uma tem sua fila) — por isso o
            # teto vem de `era5_max_workers()` = 2 x nº de contas no `.env`, e o pool de
            # vagas do downloader garante o limite de 2 dentro de CADA conta.
            era5_workers = min(ctx.workers, era5_max_workers())
            return apply_downloader_step(
                df, era5_cmd, out, ctx.work, stem=stem,
                data_dir=data_dir, max_workers=era5_workers, max_retries=5,
                # barra ao vivo no painel do orquestrador
                progress_cb=lambda f, t, e="": ctx.report(self.name, f, t, e),
            )
        finally:
            out.unlink(missing_ok=True)
