"""Inventário e recuperação dos produtos de UMA espécie e dos cenários selecionados."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
import re
import shutil
import uuid


@dataclass
class ScenarioState:
    name: str
    mean: Path
    sd: Path
    files: list[Path]
    corrupt: dict[Path, str]
    strips: int

    @property
    def complete(self) -> bool:
        return all(p.is_file() and p not in self.corrupt for p in (self.mean, self.sd))


def validate_tif(path: Path) -> str | None:
    """Lê TODOS os blocos, sem carregar o raster inteiro. Nodata é válido."""
    import rasterio

    try:
        with rasterio.open(path) as ds:
            if ds.driver != "GTiff" or ds.count != 1 or not ds.crs:
                return "esperado GeoTIFF de uma banda com CRS"
            for _, window in ds.block_windows(1):
                ds.read(1, window=window)
    except (OSError, ValueError, rasterio.errors.RasterioError) as exc:
        return f"{type(exc).__name__}: {exc}"
    return None


def inspect_scenario(slug: str, name: str, out_base: Path, model_dir: Path) -> ScenarioState:
    prefix = f"{slug}_{name}"
    dest = out_base / name
    mean = dest / f"{prefix}_adequabilidade.tif"
    sd = dest / f"{prefix}_incerteza.tif"
    # Lista fechada: overwrite não toca no modelo, camadas, outras espécies ou cenários.
    outputs = [mean, sd, dest / f"{prefix}_extrapolacao.tif",
               dest / f"{prefix}_extrapolacao.json", dest / f"{prefix}_coerencia.json"]
    outputs += [p.with_name(p.stem + ".partial.tif") for p in (mean, sd)]
    strip_dir = model_dir / f"_strips_{mean.stem}"
    strips = sorted(p for p in strip_dir.glob("*.tif")
                    if re.fullmatch(r"(?:mean|sd)_\d+(?:\.partial)?\.tif", p.name))
    outputs += strips + [model_dir / f"_progress_{mean.stem}.txt"]
    files = [p for p in outputs if p.is_file()]
    corrupt = {}
    for p in files:
        if p.suffix == ".tif":
            error = "gravação interrompida (arquivo temporário)" if ".partial." in p.name else validate_tif(p)
            if error:
                corrupt[p] = error
    ready = sum(1 for p in strips if re.fullmatch(r"mean_\d+\.tif", p.name)
                and p not in corrupt and (p.with_name(p.name.replace("mean_", "sd_", 1))).is_file()
                and p.with_name(p.name.replace("mean_", "sd_", 1)) not in corrupt)
    return ScenarioState(name, mean, sd, files, corrupt, ready)


def prepare_existing(states: list[ScenarioState], out_base: Path, action: str,
                     dry_run: bool, log=print) -> bool:
    """Pergunta antes de remover; preserva os arquivos em backup antes da exclusão."""
    existing = [s for s in states if s.files]
    if not existing:
        log("[inventário] Nenhuma predição/checkpoint desta espécie nos cenários selecionados.")
        return action != "cancelar"
    log("[inventário] Encontradas predições/checkpoints desta espécie:")
    for s in states:
        status = "mapas prontos" if s.complete else "parcial" if s.files else "não iniciada"
        log(f"  {s.name}: {status}; {s.strips} faixas completas; {len(s.corrupt)} TIFF(s) inválido(s)")
        for p, reason in s.corrupt.items():
            log(f"    INVÁLIDO: {p} — {reason}")
    log("Retomar preserva os mapas/faixas válidos; os arquivos inválidos listados serão removidos "
        "da pasta ativa após backup e recalculados.")
    log("Overwrite refaz TODOS os cenários selecionados desta espécie, incluindo checkpoints "
        "e relatórios. Os arquivos substituídos ficam em backup.")
    if dry_run:
        log(f"[dry-run] Política: {action}; nenhum arquivo será removido e nenhuma pergunta será feita.")
        return True
    if action == "perguntar":
        while True:
            try:
                choice = input("[1] Retomar  [2] Overwrite em tudo selecionado  [3] Cancelar (padrão): ").strip().lower()
            except (EOFError, KeyboardInterrupt):
                log("\n[cancelado] Sem escolha; nenhum arquivo alterado. Para automação, use --existentes retomar|overwrite.")
                return False
            choices = {"1": "retomar", "retomar": "retomar", "2": "overwrite", "overwrite": "overwrite",
                       "3": "cancelar", "cancelar": "cancelar", "": "cancelar"}
            if choice in choices:
                action = choices[choice]
                break
            log("Escolha 1, 2 ou 3.")
    if action == "cancelar":
        log("[cancelado] Nenhum arquivo alterado.")
        return False
    selected = sorted({p for s in states for p in (s.files if action == "overwrite" else s.corrupt)})
    if selected:
        backup = out_base / "_backups" / (datetime.now().strftime("%Y%m%d_%H%M%S_") + uuid.uuid4().hex[:8])
        backup.mkdir(parents=True)
        # Copia tudo antes de excluir qualquer arquivo. Falha na cópia mantém os originais.
        import json
        records = []
        for i, source in enumerate(selected):
            target = backup / f"{i:04d}_{source.name}"
            shutil.copy2(source, target)
            records.append({"original": str(source.resolve()), "backup": target.name})
        (backup / "manifest.json").write_text(json.dumps(records, indent=2, ensure_ascii=False), encoding="utf-8")
        log(f"[backup] {backup}")
        for source in selected:
            log(f"[removendo para recalcular] {source}")
            source.unlink()
    return True
