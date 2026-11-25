"""
Teste de COMPATIBILIDADE com o restante do pipeline.

Prova que o CSV unificado gerado pela camada de ocorrências pode ser consumido
por `02_pseudoabsence/gen_pseudo_occurences.py` sem alterações: aquele script lê
um CSV e usa exatamente as colunas `decimalLatitude, decimalLongitude, year,
month, day, species` (define `sp=1`, extrai coordenadas e amostra ano/mês/dia).

Aqui reproduzimos esse "contrato" sobre a saída real do `OccurrenceManager`
(com um Provider dummy, sem rede), garantindo que a integração continua válida.

Execução:
    python -m unittest tests/test_occurrences_compat.py
"""

import os
import sys
import tempfile
import unittest

import pandas as pd

sys.path.insert(
    0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "01_data_acquisition"))
)

from occurrences.config import OccurrencesConfig  # noqa: E402
from occurrences.manager import OccurrenceManager  # noqa: E402
from occurrences.models import standardize_frame, DOWNSTREAM_REQUIRED_COLUMNS  # noqa: E402
from occurrences.base import BaseProvider, ProviderMetadata, TaxonMatch  # noqa: E402


class _DummyProvider(BaseProvider):
    metadata_spec = ProviderMetadata(
        name="dummy", title="Dummy", homepage="", api="memória",
        official_api=False, requires_auth=False, priority="high", implemented=True,
    )

    def __init__(self, config, rows):
        super().__init__(config)
        self._rows = rows

    def search_species(self, species):
        return TaxonMatch(provider=self.name, query_name=species, matched=True,
                          accepted_name=species, scientific_name=species)

    def download_occurrences(self, species, taxon, lon_range, lat_range, year_range, limit, stats):
        return pd.DataFrame(self._rows)

    def normalize(self, raw, taxon):
        return standardize_frame(raw)


class TestDownstreamContract(unittest.TestCase):
    def test_csv_feeds_pseudoabsence_step(self):
        with tempfile.TemporaryDirectory() as tmp:
            config = OccurrencesConfig(output_dir=os.path.join(tmp, "out"),
                                       cache_dir=os.path.join(tmp, "c"), use_cache=False)
            rows = [
                {"decimalLatitude": -23.5, "decimalLongitude": -45.1,
                 "year": 2015, "month": 5, "day": 3, "scientificName": "Aus bus"},
                {"decimalLatitude": -24.0, "decimalLongitude": -46.0,
                 "year": 2016, "month": 6, "day": 4, "scientificName": "Aus bus"},
            ]
            result = OccurrenceManager(config, providers=[_DummyProvider(config, rows)]).run("Aus bus")

            # 1) O arquivo existe e é lido como CSV.
            df = pd.read_csv(result.output_csv)

            # 2) Contém TODAS as colunas exigidas a jusante.
            for col in DOWNSTREAM_REQUIRED_COLUMNS:
                self.assertIn(col, df.columns)

            # 3) Reproduz o que gen_pseudo_occurences.py faz com o CSV:
            df["species"] = "Aus bus"           # o script sobrescreve 'species'
            df["sp"] = 1                          # marca presenças
            pts = df[df["sp"] == 1][["decimalLatitude", "decimalLongitude"]].to_numpy()
            self.assertEqual(pts.shape[1], 2)    # extrai coordenadas
            sample = df.sample(1).iloc[0]
            # amostra ano/mês/dia/espécie (usados para gerar pseudo-ausências)
            for col in ("year", "month", "day", "species"):
                _ = sample[col]
            self.assertTrue((df["species"] == "Aus bus").all())


if __name__ == "__main__":
    unittest.main(verbosity=2)
