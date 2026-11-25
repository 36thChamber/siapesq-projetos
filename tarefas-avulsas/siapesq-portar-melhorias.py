# Transfere arquivos escolhidos entre revisões Git para portar melhorias.
import argparse
import subprocess
from pathlib import Path

parser = argparse.ArgumentParser(
    description="Transfere arquivos selecionados de outra revisão Git para a árvore de trabalho."
)
parser.add_argument("repositorio", type=Path)
parser.add_argument("revisao")
parser.add_argument("arquivos", nargs="+")
args = parser.parse_args()
git = ["git", "-C", str(args.repositorio), "--literal-pathspecs"]
revision = subprocess.check_output(
    git + ["rev-parse", "--verify", "--end-of-options", args.revisao + "^{commit}"],
    text=True,
).strip()
# Transfere apenas caminhos escolhidos e interrompe se houver trabalho local nesses caminhos.
if subprocess.check_output(
    git + ["status", "--porcelain", "--untracked-files=all", "--", *args.arquivos]
):
    raise SystemExit("Há mudanças locais nos caminhos selecionados.")
subprocess.run(
    git + ["restore", "--source", revision, "--worktree", "--", *args.arquivos],
    check=True,
)
