# Modifica o código legado que acessa relatórios, mapas e TIFFs e ajusta a configuração de implantação.
from pathlib import Path

p = Path("src/repositories/aws-s3-repository.ts")
s = p.read_text()
start = s.index("  private local:")
end = s.index("  async listar_buckets", start)
s = (
    s[:start]
    + """  public bucket: string;
  constructor(group: "MAPAS" | "COG" | "MIDIA" | "COPEL" | "RELATORIOS") {
    const env = (field: string) => {
      const value = process.env[group + "_" + field];
      if (!value) throw new Error("Configuração de armazenamento incompleta: " + group);
      return value;
    };
    this.region = "us-east-1";
    this.endpoint = env("ENDPOINT");
    this.bucket = env("BUCKET");
    this.client = new S3Client({ region: this.region, endpoint: this.endpoint, forcePathStyle: true,
      credentials: {accessKeyId: env("ACCESS_KEY_ID"), secretAccessKey: env("SECRET_ACCESS_KEY")} });
  }
"""
    + s[end:]
)
a = s.index("      // const input=")
b = s.index("        Bucket: bucket_nome,\n        Body: stream,", a)
s = s[:a] + "      const input = {\n" + s[b:]
a = s.index("      const uri =")
b = s.index("      return uri;", a)
s = s[:a] + '      const uri = "/v1/relatorios/arquivo/" + id + extension;\n' + s[b:]
p.write_text(s)
for filename, group in [
    ("mapas-controller.ts", "MAPAS"),
    ("phytobloom-controllers/tifs-controllers.ts", "COPEL"),
    ("siapesq_controllers/analisesBucket-controller.ts", "COG"),
]:
    p = Path("src/controllers") / filename
    s = p.read_text().replace(
        "new AWS_S3_REPOSITORY(process.env.AWS_BUCKET_REGION)",
        f'new AWS_S3_REPOSITORY("{group}")',
    )
    import re

    s = re.sub(
        r"const bucket_name=process.env.AWS_[^\n]+",
        "const bucket_name=aws_bucken_repo.bucket",
        s,
    )
    if "async getCsv(" in s:
        a, b = s.split("async getCsv(")
        s = (
            a
            + "async getCsv("
            + b.replace('REPOSITORY("COG")', 'REPOSITORY("MIDIA")').replace(
                "await DownloadCsvAnalises.valida",
                'if (!object_name.endsWith(".csv")) return res.sendStatus(404);\n            await DownloadCsvAnalises.valida',
            )
        )
    p.write_text(s)
p = Path("src/use-cases/relatorio/upload-relatorio.ts")
p.write_text(
    p.read_text()
    .replace("process.env.AWS_BUCKET_REGION", '"RELATORIOS"')
    .replace("process.env.AWS_PDF_BUCKET as string", "fileuploader.bucket")
)
p = Path("src/controllers/relatorio-controller.ts")
s = """import Relatorios from "../models/Relatorios";
import ObjectStorage from "../repositories/aws-s3-repository";
import { pipeline } from "node:stream/promises";
""" + p.read_text()
s = s.replace(
    "    async salvar",
    """    async arquivo(req:RequestAutenticado,res:Response) {
        const key = req.params.key;
        if (!/^[0-9a-f-]{36}\\.pdf$/i.test(key)) return res.sendStatus(404);
        try {
            const uri = "/v1/relatorios/arquivo/" + key;
            const record = await Relatorios.findOne({ where: {uri, id_usuario:req.id_usuario, ativo:true} });
            if (!record) return res.sendStatus(404);
            const storage = new ObjectStorage("RELATORIOS");
            const body = await storage.download_object(storage.bucket,key);
            if (!body) return res.sendStatus(404);
            res.type("application/pdf").set("Cache-Control","private, no-store");
            await pipeline(body as any,res);
        } catch {
            if (!res.headersSent) return res.sendStatus(503);
            res.destroy();
        }
    }
    async salvar""",
)
s = s.replace(
    "await UploadRelatorioUseCase.valida(req.body,req.file)",
    "if (String(req.body.id_usuario) !== String(req.id_usuario)) return res.sendStatus(403);\n            await UploadRelatorioUseCase.valida(req.body,req.file)",
)
p.write_text(s)
p = Path("src/routes/v1/relatorios-router.ts")
p.write_text(
    p.read_text().replace(
        "export default router",
        'router.get("/arquivo/:key",checa_token,(req:any,res)=>controller.arquivo(req,res))\nexport default router',
    )
)
p = Path(".github/workflows/deploy-vps.yaml")
s = p.read_text()
a = s.index("            - name: 'Create .env file'")
b = s.index("            - name: 'copy", a)
s = (
    s[:a]
    + """            - name: Preparar configuração de armazenamento
              env:
                STORAGE_ENV: ${{ secrets.VPS_STORAGE_ENV }}
              run: |
                umask 077
                test -n "$STORAGE_ENV"
                printf '%s\\n' "$STORAGE_ENV" > .storage.env
"""
    + s[b:]
)
s = (
    s.replace("debug: true", "debug: false")
    .replace(
        "                  cd /server",
        """                  set -eu
                  cd /server
                  test -s .env
                  test -s .storage.env
                  chmod 600 .storage.env
                  umask 077
                  tmp=$(mktemp .env.XXXXXX)
                  awk '!/^[[:space:]]*(AWS_|(MAPAS|COG|MIDIA|COPEL|RELATORIOS)_(BUCKET|ENDPOINT|ACCESS_KEY_ID|SECRET_ACCESS_KEY)=)/' .env > "$tmp"
                  cat .storage.env >> "$tmp"
                  mv "$tmp" .env""",
    )
    .replace(
        "pm2 start build/server.js --name siapesq-api || pm2 restart siapesq-api",
        'pm2 restart "$APP_NAME" --update-env\n                  pm2 save',
    )
)
p.write_text(s)
