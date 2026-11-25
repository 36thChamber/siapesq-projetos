# Altera scripts de provisionamento, preparação do Drive e renovação para distinguir backups do legado e da plataforma.
import argparse
import json
import re
from pathlib import Path

parser = argparse.ArgumentParser(
    description="Parametriza as três rotinas de backup em uma cópia do código."
)
parser.add_argument(
    "perfil",
    type=Path,
    help="JSON com os nomes de banco, usuários, schemas e prefixos desta instalação",
)
args = parser.parse_args()
profile = json.loads(args.perfil.read_text())


def render(template):
    # Os campos entram em trechos de código e SQL. Aceite apenas nomes simples de configuração.
    def field(match):
        value = profile[match.group(1)]
        if not re.fullmatch(r"[A-Za-z0-9_, .-]+", value):
            raise ValueError("Identificador inválido: " + match.group(1))
        return value

    return re.sub(r"CFG_(\w+?)_FIM", field, template)


from pathlib import Path

p = Path("provisionar.py")
s = p.read_text().replace(
    render('STATE = HOME / ".local/share/CFG_estado_legado_FIM"'),
    render(
        'PLATAFORMA = os.environ.get("SIAPESQ_BANCO_BACKUP") == "plataforma"\nSTATE = HOME / ".local/share" / ("CFG_projeto_plataforma_FIM-vps" if PLATAFORMA else "CFG_estado_legado_FIM")'
    ),
)
s = s.replace(
    render('PROJECT = "CFG_projeto_legado_FIM"'),
    render(
        'PROJECT = "CFG_projeto_plataforma_FIM" if PLATAFORMA else "CFG_projeto_legado_FIM"'
    ),
)
s = s.replace(
    '    terminal(db_container, check, b"LEITURA_OK")',
    render(
        "    if PLATAFORMA:\n        # Escopo limitado aos schemas presentes em CFG_banco_plataforma_FIM e ao seu proprietário.\n        check = check.replace('siapesq_backup_legado_vps', 'CFG_usuario_plataforma_FIM')\n        check = check.replace('ON DATABASE CFG_banco_legado_FIM', 'ON DATABASE \"CFG_banco_plataforma_FIM\"').replace('-d CFG_banco_legado_FIM', '-d CFG_banco_plataforma_FIM')\n        check = check.replace('-U postgres ', '-U \"$POSTGRES_USER\" ').replace('\"CFG_dono_legado_FIM\"', '\"CFG_dono_plataforma_FIM\"')\n        check = check.replace('CFG_schemas_legado_FIM', 'CFG_schemas_plataforma_FIM')\n    terminal(db_container, check, b\"LEITURA_OK\")"
    ),
)
s = s.replace(
    "    return yaml.safe_dump(",
    render(
        '    if PLATAFORMA:\n        service["build"]["dockerfile_inline"] = image.replace("postgres:15-bookworm", "postgres:18-bookworm")\n        service["environment"].update(PGDATABASE="CFG_banco_plataforma_FIM", PGUSER="CFG_usuario_plataforma_FIM", PGSSLMODE="prefer")\n        service["tmpfs"] = ["/tmp:mode=1777,size=192m"]\n        service["mem_limit"] = "400m"\n    return yaml.safe_dump('
    ),
)
a = s.index("    db = api(", s.index("def install():"))
b = s.index("    db_net = ", a)
s = (
    s[:a]
    + render(
        '    STATE.mkdir(mode=0o700, parents=True, exist_ok=True)\n    if PLATAFORMA:\n        candidates = [item for p in api("GET", "project.all") for e in p["environments"] for item in e["postgres"]]\n        databases = [api("GET", "postgres.one", params={"postgresId": x["postgresId"]}) for x in candidates]\n        db, = [x for x in databases if x["appName"] == "CFG_database_app_FIM"]\n        db_name = db["appName"]\n        db_id, = [x["containerId"] for x in api("GET", "docker.getContainers") if x["state"] == "running" and x["name"].startswith(db_name + ".")]\n    else:\n        db = api("GET", "compose.one", params={"composeId":(ORIGINAL/"compose-id").read_text().strip()})\n        db_name = db["appName"] + "-postgres-1"\n        db_id = find_container(db_name)\n'
    )
    + s[b:]
)
s = s.replace(
    '"name":"Backup privado do PostgreSQL legado"',
    '"name":"Backup privado da plataforma original" if PLATAFORMA else "Backup privado do PostgreSQL legado"',
)
p.write_text(s)
p = Path("preparar_drive.py")
s = p.read_text().replace(
    render('name=f"CFG_prefixo_legado_FIM-{day}.p7m"'),
    render(
        'prefixo = getattr(args, "prefixo", "CFG_prefixo_legado_FIM")\n            name=f"{prefixo}-{day}.p7m"'
    ),
)
p.write_text(s)
p = Path("renovar.py")
s = (
    p.read_text()
    .replace(
        "from provisionar import STATE", "from provisionar import PLATAFORMA, STATE"
    )
    .replace(
        "SimpleNamespace(pending=pending",
        render(
            'SimpleNamespace(prefixo="CFG_prefixo_plataforma_FIM-vps" if PLATAFORMA else "CFG_prefixo_legado_FIM",pending=pending'
        ),
    )
)
p.write_text(s)
