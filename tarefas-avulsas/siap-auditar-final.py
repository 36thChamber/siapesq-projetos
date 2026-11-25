# Analisa configuração e logs exportados e conta indícios de uso de credenciais AWS e falhas de acesso.
import argparse
import json
from pathlib import Path

parser = argparse.ArgumentParser(
    description="Audita localmente a configuração e o log exportados de um contêiner."
)
parser.add_argument("config", type=Path, help="JSON de docker inspect")
parser.add_argument("log", type=Path, help="Texto de docker logs")
args = parser.parse_args()
config = json.loads(args.config.read_text())
container = config[0] if isinstance(config, list) else config
variables = [item.partition("=") for item in container["Config"].get("Env", [])]
log = args.log.read_text(errors="replace")
# O resultado só traz indicadores e contagens, sem imprimir valores de configuração nem linhas do log.
print(
    json.dumps(
        {
            "referencia_chave_aws": any(
                value.startswith(("AKIA", "ASIA")) for _, _, value in variables
            ),
            "configuracao_sns": any("SNS" in name for name, _, _ in variables),
            "erros_acesso": sum(
                log.count(error) for error in ("AccessDenied", "InvalidAccessKeyId")
            ),
        }
    )
)
