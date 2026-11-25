# Edita o código das APIs para trocar referências a buckets AWS por destinos configuráveis de armazenamento.
import os
from pathlib import Path
import re

root = Path(os.environ["PROJETOS_DIR"])


def edit(path, old, new):
    p = root / path
    s = p.read_text()
    assert old in s, (p, old)
    p.write_text(s.replace(old, new))


api = "siapesq-integracao-api/src/"
p = root / api / "repositories/scientific-media.ts"
s = p.read_text().replace(
    "if (!endpoint) return new AWS_S3_REPOSITORY(process.env.AWS_BUCKET_REGION);",
    'if (!endpoint) throw new Error("Endpoint de mídia científica ausente");',
)
p.write_text(
    s
    + """
export function rasterRepository() {
  const endpoint = process.env.COG_MIRROR_ENDPOINT;
  const accessKeyId = process.env.COG_MIRROR_ACCESS_KEY_ID;
  const secretAccessKey = process.env.COG_MIRROR_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey || !process.env.COG_MIRROR_BUCKET) {
    throw new Error("Configuração incompleta do armazenamento de mapas");
  }
  return new AWS_S3_REPOSITORY(process.env.COG_MIRROR_REGION || "us-east-1", false,
    { endpoint, credentials: { accessKeyId, secretAccessKey } });
}
"""
)
for n in ["analises-controller", "analisesBucket-controller"]:
    p = root / api / f"controllers/{n}.ts"
    s = (
        p.read_text()
        .replace(
            'import AWS_S3_REPOSITORY from "../repositories/aws-s3-repository";', ""
        )
        .replace(
            "import { scientificMediaRepository }",
            "import { scientificMediaRepository, rasterRepository }",
        )
    )
    if n == "analisesBucket-controller":
        s = (
            'import { scientificMediaRepository, rasterRepository } from "../repositories/scientific-media";\n'
            + s
        )
    s = re.sub(
        r"new AWS_S3_REPOSITORY\(\s*process.env.AWS_BUCKET_REGION\s*\)",
        "rasterRepository()",
        s,
    ).replace("process.env.AWS_TIFF_STE", "process.env.COG_MIRROR_BUCKET")
    if n == "analisesBucket-controller":
        before, rest = s.split("async getCsv(")
        s = (
            before
            + "async getCsv("
            + rest.replace("rasterRepository()", "scientificMediaRepository()")
            .replace(
                "process.env.COG_MIRROR_BUCKET", "process.env.SCIENTIFIC_MEDIA_BUCKET"
            )
            .replace(
                "const readstream =",
                'if (!object_name.startsWith("species-table/") || !object_name.endsWith(".csv")) return res.sendStatus(404);\n      const readstream =',
            )
        )
    p.write_text(s)
p = root / api / "use-cases/analises/obter-tif-adequabilidade.ts"
s = (
    p.read_text()
    .replace("process.env.AWS_TIFF_STE", "process.env.COG_MIRROR_BUCKET")
    .replace(
        "source_bucket: bucket",
        'source_bucket: process.env.COG_SOURCE_BUCKET || "bucket-exemplo"',
    )
)
p.write_text(s)
edit(
    "siapesq-integracao-frontend/lib/cog/catalog.ts",
    "s3 = new S3Client({ region });",
    'throw new Error("Endpoint do armazenamento COG ausente");',
)
# The mobile archive reader must use dedicated MinIO credentials, independently of the daily catalog.
p = root / "api-phytobloom/src/services/analises-services.ts"
s = (
    p.read_text()
    .replace("process.env.AWS_TIFF_PHYTOBLOOM_BUCKET", "process.env.ARCHIVE_BUCKET")
    .replace(
        "new Repository(process.env.AWS_BUCKET_REGION)", "this.archiveRepository()"
    )
)
pos = s.index("  private static storage()")
s = (
    s[:pos]
    + """  private static archiveRepository() {
    const { ARCHIVE_ENDPOINT: endpoint, ARCHIVE_ACCESS_KEY_ID: accessKeyId, ARCHIVE_SECRET_ACCESS_KEY: secretAccessKey } = process.env;
    if (!endpoint || !accessKeyId || !secretAccessKey) throw new Error("Armazenamento do histórico incompleto");
    return new Repository("us-east-1", false, { endpoint, accessKeyId, secretAccessKey });
  }

"""
    + s[pos:]
)
p.write_text(s)
p = root / "api-phytobloom/src/repositories/daily-raster-storage.ts"
s = p.read_text()
s = re.sub(r"  if \(\[endpoint.*?\n  \}\n", "", s, flags=re.S)
p.write_text(s)
p = root / "api-siapreps/src/repositories/aws-s3-repository.ts"
s = (
    p.read_text()
    .replace(
        'if (local) this.endpoint = "http://localhost:4566";',
        'this.endpoint = local ? "http://localhost:4566" : process.env.DAILY_RASTER_ENDPOINT;\n    if (!this.endpoint) throw new Error("Endpoint dos rasters diários ausente");',
    )
    .replace("endpoint: local ? this.endpoint : undefined", "endpoint: this.endpoint")
    .replace("process.env.AWS_ACCESS_KEY_ID", "process.env.DAILY_RASTER_ACCESS_KEY_ID")
    .replace(
        "process.env.AWS_SECRET_ACCESS_KEY",
        "process.env.DAILY_RASTER_SECRET_ACCESS_KEY",
    )
)
p.write_text(s)
edit(
    "api-siapreps/src/services/analises-services.ts",
    "process.env.AWS_TIFF_BUCKET",
    "process.env.DAILY_RASTER_BUCKET",
)
