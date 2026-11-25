# Consultas avulsas

| Tarefa | Comando |
| --- | --- |
| Consultar os dias e os estados registrados na agenda SQLite | `python agenda-conferir.py agenda.sqlite` |
| Contar pixels válidos em TIFFs de índices a partir de uma data | `python phyto-coverage.py ./rasters --desde 2026_01_01` |
| Comparar dois TIFFs, incluindo georreferenciamento, valores e máscaras | `python phyto-compare.py referencia.tif candidato.tif` |
| Consultar a organização dos dados e o tempo de leitura no Copernicus Marine | `python consulta-copernicus.py --servico arco-geo-series` |
| Verificar a interpolação de uma matriz pequena com um valor NaN | `sh phyto-zoom.sh` |
| Listar as versões das bibliotecas geoespaciais do ambiente | `sh phyto-vrs.sh` |

A consulta SQLite abre o banco em modo de leitura e usa as tabelas `config` e `dias`. A comparação de TIFFs imprime as propriedades diferentes e retorna 0 para equivalência ou 1 para diferença. As consultas de rasters usam NumPy e Rasterio. Os dois scripts de diagnóstico usam as bibliotecas que importam.

A consulta ao Copernicus Marine usa o pacote `copernicusmarine` e lê `CMEMS_USERNAME` e `CMEMS_PASSWORD` do ambiente. Use `--servico arco-time-series` para comparar a outra organização dos dados ou `--chunk-zero` para consultar com limite de chunk igual a zero.
