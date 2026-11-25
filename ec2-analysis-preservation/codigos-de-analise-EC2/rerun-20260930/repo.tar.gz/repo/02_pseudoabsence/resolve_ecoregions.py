#!/usr/bin/env python3
# resolve_ecoregions.py - Provedor da base RESOLVE Ecoregions 2017
#
# Responsabilidade ÚNICA deste módulo:
#   -> Garantir a disponibilidade local do shapefile das ecorregiões terrestres
#      "RESOLVE Ecoregions 2017" (Dinerstein et al., 2017) e devolver o caminho
#      completo do `.shp` extraído para as demais etapas do pipeline.
#
# Estratégia (segue o padrão preguiçoso/cacheado de `cleaning/reference_data.py`):
#   1. Se o shapefile já foi extraído -> reutiliza (não baixa nem extrai de novo).
#   2. Se o ZIP já existe e está íntegro -> apenas extrai.
#   3. Caso contrário -> baixa (mostrando tamanho e progresso) e extrai.
#
# Robustez:
#   - Download em arquivo temporário `.part` renomeado ao final (uma interrupção
#     nunca deixa um ZIP "meio baixado" que aparente estar completo).
#   - Validação de integridade do ZIP (`zipfile.is_zipfile` + `testzip`); um ZIP
#     corrompido é descartado e rebaixado automaticamente uma vez.
#   - `pathlib.Path` em todos os caminhos (compatível com Windows/WSL/Linux).
#   - Nenhum caminho absoluto embutido: o destino padrão é relativo ao CWD,
#     respeitando o invariante "o projeto roda sempre da raiz".
#
# Reutilização:
#   `download_resolve()` pode ser chamado por QUALQUER etapa do pipeline; devolve
#   sempre um `pathlib.Path` para o `.shp`, sem depender de caminhos fixos
#   espalhados pelo código.

from __future__ import annotations

import zipfile
from pathlib import Path
from typing import Optional, Union

import requests

# URL oficial da base RESOLVE Ecoregions 2017 (hospedada pelos autores no GCS).
RESOLVE_URL: str = "https://storage.googleapis.com/teow2016/Ecoregions2017.zip"

# Destino padrão relativo ao CWD (o projeto sempre roda da raiz). Não usar
# caminhos absolutos: mantém portabilidade Windows/WSL/Linux.
DEFAULT_DEST_DIR: Path = Path("resolve_ecoregions")

# Nome do arquivo compactado e da subpasta de extração.
_ZIP_NAME: str = "Ecoregions2017.zip"
_EXTRACT_SUBDIR: str = "Ecoregions2017"

# Tamanho do bloco de leitura do stream de download (8 MiB).
_CHUNK_SIZE: int = 8 * 1024 * 1024


PathLike = Union[str, Path]


def _human_size(num_bytes: float) -> str:
    """Formata um número de bytes de forma legível (KiB/MiB/GiB)."""
    for unit in ("B", "KiB", "MiB", "GiB", "TiB"):
        if abs(num_bytes) < 1024.0:
            return f"{num_bytes:.1f} {unit}"
        num_bytes /= 1024.0
    return f"{num_bytes:.1f} PiB"


def _find_shapefile(directory: Path) -> Optional[Path]:
    """
    Procura recursivamente o primeiro `.shp` sob `directory`.

    Retorna o `Path` do shapefile ou None se nenhum for encontrado.
    """
    if not directory.exists():
        return None
    shapefiles = sorted(directory.rglob("*.shp"))
    return shapefiles[0] if shapefiles else None


def _zip_is_valid(zip_path: Path) -> bool:
    """
    Verifica se `zip_path` é um ZIP íntegro.

    Combina `is_zipfile` (assinatura/EOCD) com `testzip()` (CRC de cada membro),
    detectando tanto arquivos truncados quanto corrompidos.
    """
    if not zip_path.exists() or zip_path.stat().st_size == 0:
        return False
    if not zipfile.is_zipfile(zip_path):
        return False
    try:
        with zipfile.ZipFile(zip_path) as zf:
            return zf.testzip() is None
    except (zipfile.BadZipFile, OSError):
        return False


def _download_stream(url: str, zip_path: Path, chunk_size: int = _CHUNK_SIZE) -> None:
    """
    Baixa `url` para `zip_path` exibindo tamanho e progresso.

    O conteúdo é gravado primeiro num arquivo temporário `<zip>.part` e só então
    renomeado para o destino final — uma interrupção (rede/processo) jamais deixa
    um ZIP parcial que aparente estar completo. Em caso de erro, o `.part` é
    removido.
    """
    part_path = zip_path.with_suffix(zip_path.suffix + ".part")
    try:
        with requests.get(url, stream=True, timeout=(30, 300)) as resp:
            resp.raise_for_status()
            total = int(resp.headers.get("Content-Length", 0))
            if total > 0:
                print(f"[resolve] Tamanho do download: {_human_size(total)}")
            else:
                print("[resolve] Tamanho do download: desconhecido (sem Content-Length)")

            downloaded = 0
            with open(part_path, "wb") as f:
                for chunk in resp.iter_content(chunk_size=chunk_size):
                    if not chunk:  # keep-alive vazio
                        continue
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total > 0:
                        pct = downloaded / total * 100
                        print(
                            f"\r[resolve] Baixando: {pct:5.1f}% "
                            f"({_human_size(downloaded)}/{_human_size(total)})",
                            end="",
                            flush=True,
                        )
                    else:
                        print(
                            f"\r[resolve] Baixando: {_human_size(downloaded)}",
                            end="",
                            flush=True,
                        )
            print()  # quebra a linha do progresso

        # Renomeia atomicamente o `.part` -> destino final.
        part_path.replace(zip_path)
    except BaseException:
        # Limpa o arquivo parcial em qualquer falha/interrupção e propaga.
        if part_path.exists():
            part_path.unlink(missing_ok=True)
        raise


def download_resolve(
    dest_dir: Optional[PathLike] = None,
    *,
    force: bool = False,
    url: str = RESOLVE_URL,
) -> Path:
    """
    Garante a base RESOLVE Ecoregions 2017 localmente e devolve o `.shp`.

    Fluxo (idempotente e cacheado):
      1. Se o shapefile já está extraído e `force=False`  -> retorna-o direto.
      2. Se o ZIP existe e está íntegro                    -> apenas extrai.
      3. Caso contrário                                     -> baixa e extrai.

    Parâmetros:
        dest_dir: diretório de trabalho onde o ZIP e o shapefile ficam. Se None,
            usa `DEFAULT_DEST_DIR` (relativo ao CWD). Aceita str ou Path.
        force: se True, ignora artefatos existentes e refaz download + extração.
        url: URL da base (permite espelho/override; padrão = fonte oficial).

    Retorna:
        pathlib.Path para o arquivo `.shp` das ecorregiões.

    Lança:
        requests.RequestException: falha de rede não recuperável.
        zipfile.BadZipFile: ZIP corrompido mesmo após rebaixar.
        FileNotFoundError: nenhum `.shp` encontrado dentro do pacote extraído.
    """
    base = Path(dest_dir) if dest_dir is not None else DEFAULT_DEST_DIR
    base.mkdir(parents=True, exist_ok=True)

    zip_path = base / _ZIP_NAME
    extract_dir = base / _EXTRACT_SUBDIR

    # (1) Reutiliza o shapefile já extraído.
    if not force:
        existing_shp = _find_shapefile(extract_dir)
        if existing_shp is not None:
            print(f"[resolve] Shapefile já disponível (reuso): {existing_shp}")
            return existing_shp

    # (2) Garante um ZIP íntegro (baixa se faltar/estiver corrompido).
    need_download = force or not _zip_is_valid(zip_path)
    if not need_download:
        print(f"[resolve] ZIP já existe e está íntegro (reuso): {zip_path}")
    else:
        if zip_path.exists() and not force:
            print("[resolve] ZIP ausente ou corrompido; refazendo download...")
        print(f"[resolve] Baixando RESOLVE Ecoregions 2017 de {url}")
        _download_stream(url, zip_path)

        # Revalida; um único rebaixe automático cobre corrupção pontual de rede.
        if not _zip_is_valid(zip_path):
            print("[resolve] ZIP baixado inválido; tentando novamente uma vez...")
            zip_path.unlink(missing_ok=True)
            _download_stream(url, zip_path)
            if not _zip_is_valid(zip_path):
                raise zipfile.BadZipFile(
                    f"ZIP da base RESOLVE corrompido após rebaixar: {zip_path}"
                )

    # (3) Extrai (idempotente): só extrai se ainda não houver `.shp`.
    shp = _find_shapefile(extract_dir)
    if shp is None:
        extract_dir.mkdir(parents=True, exist_ok=True)
        print(f"[resolve] Extraindo para {extract_dir} ...")
        with zipfile.ZipFile(zip_path) as zf:
            zf.extractall(extract_dir)
        shp = _find_shapefile(extract_dir)

    if shp is None:
        raise FileNotFoundError(
            f"Nenhum arquivo .shp encontrado em {extract_dir} após extrair "
            f"{zip_path}. O pacote pode ter mudado de estrutura."
        )

    print(f"[resolve] Shapefile pronto: {shp}")
    return shp


def main() -> None:
    """CLI mínima: baixa/extrai a base e imprime o caminho do shapefile."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Baixa e extrai a base RESOLVE Ecoregions 2017."
    )
    parser.add_argument(
        "--dest_dir",
        type=str,
        default=None,
        help="Diretório de destino (padrão: ./resolve_ecoregions).",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Refaz download e extração mesmo se já existirem.",
    )
    args = parser.parse_args()

    shp = download_resolve(args.dest_dir, force=args.force)
    print(shp)


if __name__ == "__main__":
    main()
