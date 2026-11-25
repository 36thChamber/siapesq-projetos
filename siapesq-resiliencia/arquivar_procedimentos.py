"""Preserva a versão dos procedimentos e confere uma restauração do arquivo enviado."""
import hashlib
import io
import json
import os
from datetime import datetime, timezone
from pathlib import Path
import subprocess
import tarfile
import tempfile

ROOT = Path(__file__).resolve().parent
PROJECTS = ROOT.parent
SHARE = Path.home() / ".local/share"
CONFIG = SHARE / "siapesq-ensaio-restauracao/destino-drive-novo.json"
KEY = SHARE / "siapesq-rds-vps/backup-key"
RCLONE = SHARE / "siapesq-drive-copy/tools/usr/bin/rclone"
REPOSITORIES = {
    "legado": ("siapesq-legado-storage", "siapesq/siapesq-api"),
    "plataforma": ("siapesq-integracao-frontend", "siapesq/SIAPESQ-Front-end"),
    "clone_utilitarios": ("siapesq-cog-clone", "siapesq/SIAPESQ-Front-end"),
    "api": ("siapesq-integracao-api", "siapesq/api-plataforma-siapesq"),
    "phyto": ("api-phytobloom", "siapesq/api-phytobloom"),
    "siapreps": ("api-siapreps", "siapesq/api-siapreps"),
}
# Arquivos de estado, contas e configurações particulares não participam da seleção.
PATTERNS = {
    ROOT: ("RECUPERACAO-DA-PLATAFORMA.md", "arquivar_procedimentos.py", "SIAPESQ-Arquitetura-e-Recuperacao-2026-11-24.pdf"),
    ROOT / "backup": ("*.py", "diagnostico-agenda.sh", "fallback-service.conf", "fallback-timer.conf", "verificacao-drive.json", "*.service", "*.timer", "*.md", "recipient.pem"),
    ROOT / "recuperacao": ("*.py", "*.cjs", "*.md", "resultado-*.json", "verificacao-copiador-acervo.json"),
    ROOT / "integracao": ("*.json",),
    ROOT / "monitor": ("mapa-restaurado.sh", "*.mjs", "*.py", "README.md", "systemd/*.service", "systemd/*.timer",
                       "package.json", "package-lock.json", "evidencias/implantacao.json"),
    SHARE / "siapesq-rds-vps": ("backup.py", "drive_backup.py", "dump-vps.cjs"),
    PROJECTS / "siapesq-cog-clone/scripts/deploy": ("remote-exec.cjs",),
    PROJECTS / "operacao-diaria-vps/agenda": ("agendador.py", "aviso.py", "aviso_provisionar.py", "aviso_testar.py", "test_agendador.py"),
    PROJECTS / "operacao-diaria-vps/worker-phyto": ("deploy.py",),
    SHARE / "siapesq-vps-cog": ("provision_daily_prod.py", "atualizar-storage.py"),
    SHARE / "siapesq-consolidacao-20261124": ("ensaio.py", "publicar-csv-legados.py", "testar-api.cjs"),
    SHARE / "siapesq-vps-cog/daily": ("copiar-copel.py",),
    PROJECTS / "operacao-diaria-vps/ensaio/phyto": ("alert_delivery.py", "runtime_state.py"),
}


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def git_revision(folder):
    return subprocess.check_output(["git", "-C", PROJECTS / folder, "rev-parse", "HEAD"], text=True).strip()


def archive(temp):
    files = {}
    for folder, patterns in PATTERNS.items():
        manifest = [file for pattern in patterns for file in folder.glob(pattern) if file.is_file()]
        for f in manifest:
            if f.is_symlink() or f.resolve().parent != f.parent:
                raise ValueError("A lista de arquivos de código contém um link inesperado")
            files[f.relative_to(Path.home()).as_posix()] = f
    for component in ("backup", "recuperacao", "monitor"):
        if not any((ROOT / component / name).is_file() for name in ("README.md", "LEIA-ME.md")):
            raise RuntimeError(f"O guia de {component} ainda não está finalizado")
    info = {
        "repositorios": {key: {"github": repo, "revisao_local": git_revision(folder)}
                         for key, (folder, repo) in REPOSITORIES.items()},
        "arquivos_sha256": {name: digest(file) for name, file in sorted(files.items())},
    }
    data = json.dumps(info, indent=2, ensure_ascii=False).encode()
    raw = temp / "procedimentos.tar.gz"
    with tarfile.open(raw, "w:gz") as tar:
        for name, file in sorted(files.items()):
            tar.add(file, arcname=name, recursive=False)
        member = tarfile.TarInfo("inventario.json")
        member.size = len(data)
        tar.addfile(member, io.BytesIO(data))
    return raw, info


def main():
    os.umask(0o077)
    target = json.loads(CONFIG.read_text())
    if target.get("verified_private") is not True:
        raise RuntimeError("O destino ainda precisa de conferência de privacidade")
    flags = ["--config", target["config"], "--drive-root-folder-id", target["folder_id"],
             "--retries", "10", "--retries-sleep", "5s", "--low-level-retries", "5", "--tpslimit", "1"]
    gpg = ["gpg", "--batch", "--pinentry-mode", "loopback", "--passphrase-file", str(KEY)]
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    name = "procedimentos-siapesq-" + stamp + ".tar.gz.gpg"
    with tempfile.TemporaryDirectory() as folder:
        tmp = Path(folder)
        raw, info = archive(tmp)
        enc = tmp / name
        subprocess.run([*gpg, "--cipher-algo", "AES256", "--symmetric", "--output", enc, raw], check=True)
        remote = "destino:" + name
        subprocess.run([RCLONE, "copyto", enc, remote, "--immutable", *flags], check=True, timeout=540)
        verified = tmp / "copia.gpg"
        with verified.open("xb") as out:
            subprocess.run([RCLONE, "cat", remote, *flags], check=True, stdout=out, timeout=180)
        if digest(verified) != digest(enc):
            raise RuntimeError("A releitura cifrada divergiu")
        plain = tmp / "relido.tar.gz"
        subprocess.run([*gpg, "--output", plain, "--decrypt", verified], check=True, stderr=subprocess.DEVNULL)
        if digest(plain) != digest(raw):
            raise RuntimeError("A restauração do arquivo de procedimentos divergiu")
        with tarfile.open(plain) as tar:
            for member, expected in info["arquivos_sha256"].items():
                with tar.extractfile(member) as stream:
                    if hashlib.file_digest(stream, "sha256").hexdigest() != expected:
                        raise RuntimeError("O conteúdo de um procedimento divergiu")
        evidence = {"verificado_utc": stamp, "arquivo_no_drive": name, "bytes_cifrados": enc.stat().st_size,
                    "sha256_cifrado": digest(enc), "arquivos_verificados": len(info["arquivos_sha256"]),
                    "revisoes": info["repositorios"], "destino": "pasta privada da segunda conta aprovada",
                    "releitura_e_decifragem": "ok"}
    out = ROOT / "recuperacao/procedimentos-conferidos.json"
    with tempfile.NamedTemporaryFile(mode="w", dir=out.parent, delete=False) as f:
        json.dump(evidence, f, indent=2, ensure_ascii=False)
        f.write("\n")
    os.replace(f.name, out)
    print(f"{evidence['arquivos_verificados']} arquivos de procedimentos recuperados do Drive.")


if __name__ == "__main__":
    main()
