# Edita serviços, controladores e testes para integrar o acesso a imagens, ocorrências e outras mídias científicas.
import os
from pathlib import Path
import subprocess

base = Path(os.environ["PROJETOS_DIR"])
api = base / "siapesq-integracao-api"
front = base / "siapesq-integracao-frontend"
clone = base / "siapesq-cog-clone"
p = api / "src/repositories/aws-s3-repository.ts"
s = (
    p.read_text()
    .replace(
        '  constructor(region = "us-east-1", local: boolean = false) {',
        """  static scientificMedia() {
    const endpoint = process.env.SCIENTIFIC_MEDIA_ENDPOINT;
    if (!endpoint) return new AWS_S3_REPOSITORY(process.env.AWS_BUCKET_REGION);
    const accessKeyId = process.env.SCIENTIFIC_MEDIA_ACCESS_KEY_ID;
    const secretAccessKey = process.env.SCIENTIFIC_MEDIA_SECRET_ACCESS_KEY;
    if (!accessKeyId || !secretAccessKey || !process.env.SCIENTIFIC_MEDIA_BUCKET) {
      throw new Error("Configuração incompleta do armazenamento de mídia científica");
    }
    return new AWS_S3_REPOSITORY(process.env.SCIENTIFIC_MEDIA_REGION || "us-east-1", false,
      { endpoint, credentials: { accessKeyId, secretAccessKey } });
  }

  constructor(region = "us-east-1", local = false,
    storage?: { endpoint: string; credentials: { accessKeyId: string; secretAccessKey: string } }) {""",
    )
    .replace(
        "endpoint: local ? this.endpoint : undefined,",
        "endpoint: storage?.endpoint ?? this.endpoint,",
    )
    .replace(
        "credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {",
        "credentials: storage?.credentials ?? (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {",
    )
    .replace("      } : undefined,", "      } : undefined),")
)
p.write_text(s)
p = api / "src/controllers/especies-controller.ts"
s = p.read_text().replace(
    "const speciesImagesRepository = new AWS_S3_REPOSITORY(process.env.AWS_BUCKET_REGION);",
    "const speciesImagesRepository = AWS_S3_REPOSITORY.scientificMedia();",
)
p.write_text(s)
p = api / "src/controllers/analises-controller.ts"
s = p.read_text().replace(
    "async getCsvOcorrencias(req: RequestAutenticado, res: Response) {\n    try {\n      const awsRepository = new AWS_S3_REPOSITORY(process.env.AWS_BUCKET_REGION);",
    "async getCsvOcorrencias(req: RequestAutenticado, res: Response) {\n    try {\n      const awsRepository = AWS_S3_REPOSITORY.scientificMedia();",
)
p.write_text(s)
for path, previous in [
    ("src/use-cases/analises/obter-csv-ocorrencias.ts", "process.env.AWS_TIFF_STE"),
    (
        "src/services/especies-imagens-service.ts",
        "process.env.AWS_SPECIES_IMAGES_BUCKET",
    ),
]:
    p = api / path
    p.write_text(
        p.read_text().replace(
            previous, "process.env.SCIENTIFIC_MEDIA_BUCKET || " + previous
        )
    )
for name in ("responsive-review.spec.ts", "session-order.spec.ts"):
    p = front / "tests" / name
    p.write_text(
        (clone / "tests" / name)
        .read_text()
        .replace("Privacidade no ambiente de testes", "Privacidade na plataforma")
    )
p = front / "tests/account-actions.spec.ts"
p.write_text(
    (clone / "tests/account-checkout.spec.ts")
    .read_text()
    .split("for (const [label, method, provider, outcome]")[0]
    .rstrip()
    + "\n"
)
p = front / ".github/workflows/validate-production-cog.yml"
p.write_text(
    p.read_text().replace(
        "tests/cog-range.spec.ts --project",
        "tests/cog-range.spec.ts tests/account-actions.spec.ts tests/responsive-review.spec.ts tests/session-order.spec.ts --project",
    )
)
p = api / ".github/workflows/validate-api.yml"
p.parent.mkdir(exist_ok=True, parents=True)
p.write_text(
    (base / "siapesq-cog-api/.github/workflows/validate-clone.yml")
    .read_text()
    .replace("Validate isolated clone API", "Validar API da plataforma")
    .replace('["feat/complete-clone-priorities"]', '["main"]')
)
