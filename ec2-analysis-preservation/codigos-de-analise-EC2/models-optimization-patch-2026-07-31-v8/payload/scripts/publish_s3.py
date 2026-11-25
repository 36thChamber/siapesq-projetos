#!/usr/bin/env python3
"""Publica preditores e predições diárias do SDM no Amazon S3.

O script usa o AWS CLI e, portanto, respeita automaticamente a IAM Role da
instância EC2 e a cadeia padrão de credenciais da AWS. Nenhuma chave é lida ou
gravada diretamente por este módulo.
"""

from __future__ import annotations

import argparse
import csv
from dataclasses import dataclass
from datetime import date
import logging
import os
from pathlib import Path
import re
import shutil
import subprocess
from typing import Iterable, Mapping, Sequence
from urllib.parse import urlsplit


DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
SAFE_SPECIES_ID = re.compile(r"^[A-Za-z0-9_.-]+$")


class PublishError(RuntimeError):
    """Erro de configuração, validação ou publicação no S3."""


@dataclass(frozen=True)
class UploadItem:
    local_path: Path
    relative_key: str


def validate_prediction_date(value: str) -> str:
    if not DATE_PATTERN.fullmatch(value):
        raise PublishError("A data deve usar o formato AAAA-MM-DD.")
    try:
        date.fromisoformat(value)
    except ValueError as error:
        raise PublishError(f"Data inválida: {value}") from error
    return value


def normalize_s3_uri(value: str) -> str:
    value = value.strip().rstrip("/")
    parsed = urlsplit(value)
    if parsed.scheme != "s3" or not parsed.netloc:
        raise PublishError(
            f"URI S3 inválida: {value!r}. Use s3://bucket/prefixo."
        )
    if parsed.query or parsed.fragment:
        raise PublishError("A URI S3 não pode conter query string ou fragmento.")
    return value


def join_s3_uri(root: str, *parts: str) -> str:
    clean_parts = [part.strip("/") for part in parts if part.strip("/")]
    return "/".join([root.rstrip("/"), *clean_parts])


def resolve_s3_root(kind: str, environment: Mapping[str, str]) -> str:
    base_uri = environment.get("S3_BASE_URI", "").strip()
    if kind == "predictors":
        explicit_uri = environment.get("S3_PREDICTORS_URI", "").strip()
        if explicit_uri:
            return normalize_s3_uri(explicit_uri)
        if base_uri:
            return join_s3_uri(normalize_s3_uri(base_uri), "predictors", "daily")
        raise PublishError(
            "Defina S3_BASE_URI ou S3_PREDICTORS_URI para publicar os preditores."
        )

    if kind == "predictions":
        explicit_uri = environment.get("S3_PREDICTIONS_URI", "").strip()
        if explicit_uri:
            return normalize_s3_uri(explicit_uri)
        if base_uri:
            return join_s3_uri(normalize_s3_uri(base_uri), "predictions", "daily")
        legacy_uri = environment.get("S3_OUTPUT_URI", "").strip()
        if legacy_uri:
            return normalize_s3_uri(legacy_uri)
        raise PublishError(
            "Defina S3_BASE_URI ou S3_PREDICTIONS_URI para publicar as predições."
        )

    raise PublishError(f"Tipo de publicação desconhecido: {kind}")


def ensure_file(path: Path, description: str) -> Path:
    resolved = path.expanduser().resolve()
    if not resolved.is_file() or resolved.stat().st_size == 0:
        raise PublishError(f"{description} ausente ou vazio: {resolved}")
    return resolved


def collect_predictor_items(source: Path) -> list[UploadItem]:
    source = source.expanduser().resolve()
    if not source.is_dir():
        raise PublishError(f"Pasta de preditores não encontrada: {source}")

    items = [
        UploadItem(ensure_file(source / name, f"Preditor {name}"), name)
        for name in ("CHL.nc", "so.nc", "thetao.nc")
    ]
    depth_files = [
        path
        for path in source.glob("depth.*")
        if path.suffix.lower() in {".nc", ".tif", ".tiff"}
        and path.is_file()
        and path.stat().st_size > 0
    ]
    if len(depth_files) != 1:
        raise PublishError(
            f"Era esperado exatamente um depth.nc/depth.tif em {source}; "
            f"encontrados: {len(depth_files)}."
        )
    items.append(UploadItem(depth_files[0].resolve(), depth_files[0].name))

    # O manifesto vai por último: sua presença indica que os quatro rasters
    # daquela data já foram publicados.
    manifest = ensure_file(source / "manifest.json", "Manifesto dos preditores")
    items.append(UploadItem(manifest, "manifest.json"))
    return items


def resolve_output_path(raw_path: str, source: Path, label: str) -> Path:
    candidate = Path(raw_path).expanduser()
    if not candidate.is_absolute():
        candidate = source / candidate
    resolved = ensure_file(candidate, label)
    try:
        resolved.relative_to(source)
    except ValueError as error:
        raise PublishError(
            f"{label} aponta para fora da pasta da rodada: {resolved}"
        ) from error
    return resolved


def collect_prediction_items(source: Path) -> list[UploadItem]:
    source = source.expanduser().resolve()
    if not source.is_dir():
        raise PublishError(f"Pasta de predições não encontrada: {source}")

    summary = ensure_file(source / "run_summary.csv", "Resumo da rodada")
    items: list[UploadItem] = []
    with summary.open(encoding="utf-8", newline="") as stream:
        reader = csv.DictReader(stream)
        required = {"species_id", "status", "mean_file", "sd_file"}
        missing = required.difference(reader.fieldnames or [])
        if missing:
            raise PublishError(
                "Colunas ausentes em run_summary.csv: " + ", ".join(sorted(missing))
            )

        for row in reader:
            if row["status"].strip().lower() != "ok":
                continue
            species_id = row["species_id"].strip()
            if not SAFE_SPECIES_ID.fullmatch(species_id):
                raise PublishError(f"species_id inválido no resumo: {species_id!r}")

            mean_file = resolve_output_path(
                row["mean_file"], source, f"Predição mean de {species_id}"
            )
            sd_file = resolve_output_path(
                row["sd_file"], source, f"Predição sd de {species_id}"
            )
            for prediction_file in (mean_file, sd_file):
                relative = prediction_file.relative_to(source).as_posix()
                if not relative.startswith(f"{species_id}/"):
                    raise PublishError(
                        f"Arquivo de {species_id} está em pasta inesperada: {relative}"
                    )
                items.append(UploadItem(prediction_file, relative))

    # Publicado por último para a API distinguir uma rodada encerrada de uma
    # transferência ainda em andamento, mesmo quando houve erros de espécies.
    items.append(UploadItem(summary, "run_summary.csv"))
    return items


def build_aws_command(
    aws_cli: str,
    item: UploadItem,
    destination_root: str,
    dry_run: bool,
) -> list[str]:
    command = [
        aws_cli,
        "s3",
        "cp",
        str(item.local_path),
        join_s3_uri(destination_root, item.relative_key),
        "--only-show-errors",
    ]
    if dry_run:
        command.append("--dryrun")
    return command


def publish_items(
    items: Iterable[UploadItem],
    destination_root: str,
    *,
    aws_cli: str = "aws",
    dry_run: bool = False,
) -> int:
    executable = shutil.which(aws_cli)
    if executable is None:
        raise PublishError(f"AWS CLI não encontrado no PATH: {aws_cli}")

    uploaded = 0
    for item in items:
        destination = join_s3_uri(destination_root, item.relative_key)
        logging.info("Publicando %s -> %s", item.local_path.name, destination)
        try:
            subprocess.run(
                build_aws_command(executable, item, destination_root, dry_run),
                check=True,
            )
        except subprocess.CalledProcessError as error:
            raise PublishError(
                f"Falha ao publicar {item.local_path} em {destination}."
            ) from error
        uploaded += 1
    return uploaded


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Publica uma rodada diária validada no Amazon S3."
    )
    parser.add_argument("kind", choices=("predictors", "predictions"))
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--date", required=True)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--aws-cli",
        default=os.getenv("AWS_CLI", "aws"),
        help=argparse.SUPPRESS,
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(message)s",
    )

    try:
        prediction_date = validate_prediction_date(args.date)
        s3_root = resolve_s3_root(args.kind, os.environ)
        destination = join_s3_uri(s3_root, prediction_date)
        items = (
            collect_predictor_items(args.source)
            if args.kind == "predictors"
            else collect_prediction_items(args.source)
        )
        uploaded = publish_items(
            items,
            destination,
            aws_cli=args.aws_cli,
            dry_run=args.dry_run,
        )
        logging.info(
            "Publicação S3 concluída: %s arquivo(s) em %s.",
            uploaded,
            destination,
        )
        return 0
    except PublishError as error:
        logging.error("%s", error)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
