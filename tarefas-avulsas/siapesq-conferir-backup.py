# Aciona uma execução do serviço de backup e depois consulta sua saúde.
import argparse
import subprocess

parser = argparse.ArgumentParser(
    description="Executa um ciclo de backup e verifica a saúde do worker."
)
parser.add_argument(
    "container", help="Nome do contêiner do worker no Docker configurado"
)
parser.add_argument("--worker", default="/app/worker.py")
args = parser.parse_args()
for action in ("once", "health"):
    subprocess.run(
        ["docker", "exec", args.container, "python3", args.worker, action], check=True
    )
