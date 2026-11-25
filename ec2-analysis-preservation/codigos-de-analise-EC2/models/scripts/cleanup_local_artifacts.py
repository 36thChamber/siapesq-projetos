#!/usr/bin/env python3
"""Remove artefatos diários locais somente de diretórios validados.

Este módulo não verifica o S3. Ele deve ser chamado pelo executor diário apenas
depois de a publicação correspondente ter terminado com código zero.
"""

from __future__ import annotations

import argparse
from datetime import date
import logging
from pathlib import Path
import shutil
from typing import Sequence


class CleanupError(RuntimeError):
    """Erro de validação ou remoção segura."""


def validate_date(value: str) -> str:
    try:
        parsed = date.fromisoformat(value)
    except ValueError as error:
        raise CleanupError("A data deve usar o formato AAAA-MM-DD.") from error
    normalized = parsed.isoformat()
    if value != normalized:
        raise CleanupError("A data deve usar o formato AAAA-MM-DD.")
    return normalized


def expected_root(project_root: Path, kind: str) -> Path:
    if kind == "predictors":
        return project_root / "data" / "daily"
    if kind == "predictions":
        return project_root / "outputs"
    raise CleanupError(f"Tipo de artefato desconhecido: {kind}")


def validate_source(
    *,
    project_root: Path,
    source: Path,
    kind: str,
    prediction_date: str,
) -> tuple[Path, Path]:
    project_root = project_root.expanduser().resolve(strict=True)
    root = expected_root(project_root, kind).resolve(strict=True)
    resolved_source = source.expanduser().resolve(strict=True)

    if not resolved_source.is_dir():
        raise CleanupError(f"Pasta local não encontrada: {resolved_source}")
    if resolved_source.parent != root:
        raise CleanupError(
            f"Remoção recusada: {resolved_source} não é filha direta de {root}."
        )
    if resolved_source.name != prediction_date:
        raise CleanupError(
            "Remoção recusada: o nome da pasta não corresponde à data "
            f"{prediction_date}: {resolved_source.name}"
        )
    return root, resolved_source


def cleanup_local_artifacts(
    *,
    project_root: Path,
    source: Path,
    kind: str,
    prediction_date: str,
    dry_run: bool = False,
) -> Path:
    prediction_date = validate_date(prediction_date)
    root, resolved_source = validate_source(
        project_root=project_root,
        source=source,
        kind=kind,
        prediction_date=prediction_date,
    )

    current_link: Path | None = None
    if kind == "predictors":
        candidate = root / "current"
        if candidate.is_symlink():
            try:
                points_to_source = candidate.resolve(strict=True) == resolved_source
            except FileNotFoundError:
                points_to_source = False
            if points_to_source:
                current_link = candidate

    if dry_run:
        logging.info("DRY-RUN: removeria %s", resolved_source)
        if current_link is not None:
            logging.info("DRY-RUN: removeria o link %s", current_link)
        return resolved_source

    # O link é removido primeiro para não apontar para uma pasta apagada. Se a
    # remoção da pasta falhar, o downloader seguinte recria o link com segurança.
    if current_link is not None:
        current_link.unlink()
    shutil.rmtree(resolved_source)
    logging.info("Artefatos locais removidos: %s", resolved_source)
    return resolved_source


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Remove uma pasta diária local após publicação S3 confirmada."
    )
    parser.add_argument("kind", choices=("predictors", "predictions"))
    parser.add_argument("--project-root", type=Path, required=True)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--date", required=True)
    parser.add_argument("--dry-run", action="store_true")
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(message)s",
    )
    try:
        cleanup_local_artifacts(
            project_root=args.project_root,
            source=args.source,
            kind=args.kind,
            prediction_date=args.date,
            dry_run=args.dry_run,
        )
        return 0
    except (CleanupError, FileNotFoundError, OSError) as error:
        logging.error("%s", error)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
