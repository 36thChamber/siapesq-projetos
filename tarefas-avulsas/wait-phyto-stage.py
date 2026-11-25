# Acompanha o encerramento do contêiner de processamento e, quando solicitado, inicia a próxima implantação após sucesso.
import argparse
import subprocess

parser = argparse.ArgumentParser(
    description="Espera o worker terminar e propaga a falha antes da próxima etapa."
)
parser.add_argument("container")
parser.add_argument("proxima_etapa", nargs=argparse.REMAINDER)
args = parser.parse_args()
status = int(
    subprocess.check_output(["docker", "wait", args.container], text=True).strip()
)
if status:
    raise SystemExit(status)
if args.proxima_etapa:
    subprocess.run(args.proxima_etapa, check=True)
