set -eu
base=/workspace/ste-ocean-daily
cat > "$base/README.md" <<'DOC'
# SIAPRESP — rotina diária STE para 19 espécies/grupos

Produção: `siapesq-models-daily.service`, diariamente às 14:00 America/Sao_Paulo.
A inicialização EC2 continua no Quick Setup existente (janela 13:45–19:00 BRT).
O desligamento após sucesso continua condicionado ao marcador de publicação
verificada. A rotina nova só grava esse marcador após concluir 19/19 espécies,
confirmar os dois backups de modelos e reler todos os produtos publicados.

```bash
sudo systemctl start siapesq-models-daily.service
journalctl -u siapesq-models-daily.service --no-pager
```

Código de produção: `production/ste/`, registro `production/models.csv`,
operador `ops/run_daily_all19.sh`. Modelos novos em `production/training/`.
Os `.sdm` antigos permanecem em `/workspace/models/oceanincs/`.

Backups imutáveis, com SHA-256 e leitura integral inicial:

- Antigos (19): s3://example-bucket/models/antigos/sha256-8f29b8c4b057037a5238/
- Novos (19): s3://example-bucket/models/novos/sha256-a8eeafecba4cb9ef9c42/

O manifesto `complete.json` de cada backup registra arquivos, tamanhos e hashes.
Os prefixos novos mudam quando muda o modelo, avaliação, dados ou código registrado.
Nenhuma credencial `.env` foi incluída nos backups.

## Publicação

Mantém o domínio configurado em `/etc/siapesq-models.env` (lon −90..55,
lat −60..40) e usa grade 0,1 grau em EPSG:4326. As datas são as datas comuns
reais dos produtos Copernicus, não necessariamente a data do relógio.

Mantém os nomes `<species_id>_rf_AAAA-MM-DD_mean.tif` e `_sd.tif` em
`s3://example-bucket/predictions/daily/AAAA-MM-DD/`, acrescentando extrapolação,
metodologia e marcadores. Publicação só começa com as 19 espécies completas.
Cada objeto é relido e conferido por SHA-256. Predições antigas deslocadas são
preservadas em `predictions/antigos/`. A limpeza local acontece após verificação.

A rodada de validação completa usou dados de 14/10/2026, terminou com 19/19,
publicou/verificou 97 arquivos de predição/diagnóstico/resumos e foi confirmada
no catálogo público do Occulus (38 TIFFs mean/sd de 19 espécies/grupos).

## Metodologia e limites

RF oceânico STE, 500 árvores, classes 1:1 e divisão aleatória balanceada.
As entradas históricas disponíveis foram reaproveitadas, sem inventar campos.
Engraulis anchoita mantém SST/salinidade; Merluccius merluccius mantém
SST/salinidade/profundidade. Isso está explícito no perfil operacional.
As demais 17 entradas usam também clorofila em log10 e profundidade.
A sardinha foi refeita com a tabela de 228 ocorrências do S3, captura diária
real, 228 pseudoausências oceânicas e QC APTO: treino com 227+227 casos completos.
A anchova mantém o modelo já validado localmente (501+501).
As outras 15 espécies/grupos reutilizam os CSVs históricos e o balanceamento STE.

A incerteza agora é dispersão entre árvores, não a antiga dispersão bootstrap.
Avaliação aleatória e execução correta não são validação ecológica/espacial.
O grupo Cynoscion tem amostra pequena; há extrapolação alta em alguns mapas
na extensão completa. Consulte `methodology.json` e o TIFF de extrapolação.

## Reversão

Com nenhuma rotina em execução:

    sudo /workspace/ste-ocean-daily/ops/rollback_to_legacy.sh

O runner, modelos e configuração originais foram preservados. Os serviços
`siapresp-ste-test` e `siapresp-ste-shadow` continuam apenas como testes manuais
da versão anterior; não possuem agendamento e não são a rotina de produção.
DOC
chown ubuntu:ubuntu "$base/README.md"
cat /workspace/models/data/last-successful-s3-run
systemctl show siapesq-models-daily.service -p ActiveState
