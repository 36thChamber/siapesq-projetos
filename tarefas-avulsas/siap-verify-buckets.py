# Testa a leitura de objetos nos buckets configurados com URLs assinadas e requisições parciais.
import argparse

import boto3
import requests
from botocore.config import Config

parser = argparse.ArgumentParser(
    description="Confere leitura parcial em buckets compatíveis com S3."
)
parser.add_argument("--endpoint", required=True)
parser.add_argument("--perfil", help="Perfil boto3 com permissão de leitura")
parser.add_argument("buckets", nargs="+")
args = parser.parse_args()
session = boto3.Session(profile_name=args.perfil)
client = session.client(
    "s3", endpoint_url=args.endpoint, config=Config(s3={"addressing_style": "path"})
)
for bucket in args.buckets:
    # Evita baixar um raster completo. Uma amostra de 16 bytes basta para testar o intervalo.
    pages = client.get_paginator("list_objects_v2").paginate(Bucket=bucket)
    key = next(
        (
            obj["Key"]
            for page in pages
            for obj in page.get("Contents", [])
            if obj["Size"] >= 16
        ),
        None,
    )
    if key is None:
        print(bucket, "sem objeto de pelo menos 16 bytes")
        continue
    url = client.generate_presigned_url(
        "get_object", Params={"Bucket": bucket, "Key": key}, ExpiresIn=45
    )
    with requests.get(
        url, headers={"Range": "bytes=0-15"}, timeout=10, stream=True
    ) as response:
        if response.status_code != 206 or len(response.raw.read(17)) != 16:
            raise RuntimeError(f"Leitura parcial inválida em {bucket}")
    print(bucket, "leitura parcial confirmada")
