"""
Testes do Provider GBIF que NÃO exigem rede.

Exercitam o mapeamento `normalize()` (campos nativos do GBIF -> modelo único) e o
backfill taxonômico a partir da linhagem resolvida, usando dados sintéticos.

Um smoke test REAL (com rede) fica em `test_provider_gbif_live` e é pulado
automaticamente quando não há conectividade/pygbif.

Execução:
    python -m unittest tests/test_provider_gbif.py
"""

import os
import sys
import unittest
import tempfile
import time
import requests
from types import SimpleNamespace
from unittest.mock import patch

import pandas as pd

sys.path.insert(
    0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "01_data_acquisition"))
)

from occurrences.config import OccurrencesConfig  # noqa: E402
from occurrences.base import TaxonMatch  # noqa: E402
from occurrences.providers.gbif.provider import GBIFProvider, _pygbif_retry, _wait_for_request  # noqa: E402


class TestGBIFNormalize(unittest.TestCase):
    def setUp(self):
        gate = patch('occurrences.providers.gbif.provider._wait_for_request')
        gate.start()
        self.addCleanup(gate.stop)
        self.provider = GBIFProvider(OccurrencesConfig(use_cache=False))
        self.taxon = TaxonMatch(
            provider="gbif", query_name="Pomatomus saltatrix", matched=True,
            accepted_name="Pomatomus saltatrix", scientific_name="Pomatomus saltatrix",
            taxon_id="5208090",
            raw={"classification": [
                {"rank": "KINGDOM", "name": "Animalia"},
                {"rank": "PHYLUM", "name": "Chordata"},
                {"rank": "FAMILY", "name": "Pomatomidae"},
            ]},
        )

    def _raw(self):
        # Campos como o GBIF os devolve na busca (muitos já em Darwin Core).
        return pd.DataFrame([{
            "scientificName": "Pomatomus saltatrix (Linnaeus, 1766)",
            "species": "Pomatomus saltatrix",
            "taxonKey": 5208090,
            "order": "Perciformes",
            "decimalLatitude": -23.5,
            "decimalLongitude": -45.1,
            "year": 2019, "month": 8, "day": 29,
            "basisOfRecord": "HUMAN_OBSERVATION",
            "occurrenceID": "obs-1",
            "datasetName": "iNaturalist research-grade observations",
            "country": "Brazil",
        }])

    def test_maps_core_fields(self):
        out = self.provider.normalize(self._raw(), self.taxon)
        self.assertEqual(out.loc[0, "taxonID"], "5208090")
        self.assertEqual(out.loc[0, "accepted_species"], "Pomatomus saltatrix")
        self.assertEqual(out.loc[0, "species"], "Pomatomus saltatrix")
        self.assertEqual(out.loc[0, "provider"], "gbif")
        self.assertEqual(out.loc[0, "source"], "GBIF")
        self.assertEqual(out.loc[0, "decimalLatitude"], -23.5)
        # original_provider vem do datasetName.
        self.assertEqual(out.loc[0, "original_provider"],
                         "iNaturalist research-grade observations")

    def test_taxonomy_backfill_from_lineage(self):
        out = self.provider.normalize(self._raw(), self.taxon)
        # kingdom/phylum/family não vinham no registro -> preenchidos pela linhagem.
        self.assertEqual(out.loc[0, "kingdom"], "Animalia")
        self.assertEqual(out.loc[0, "phylum"], "Chordata")
        self.assertEqual(out.loc[0, "family"], "Pomatomidae")
        # order veio no próprio registro e é preservado.
        self.assertEqual(out.loc[0, "order"], "Perciformes")

    def test_empty_raw_returns_standard_empty(self):
        out = self.provider.normalize(pd.DataFrame(), self.taxon)
        self.assertTrue(out.empty)
        self.assertIn("decimalLatitude", out.columns)

    def test_backbone_uses_configured_request_timeout(self):
        self.provider.config.timeout = 17
        with patch('occurrences.providers.gbif.provider.species.name_backbone', return_value={}) as request, \
             patch('occurrences.providers.gbif.provider._normalize_backbone', return_value={'usageKey': 5208090}):
            self.provider.search_species('Pomatomus saltatrix')
        self.assertEqual(request.call_args.kwargs['timeout'], 17)

    def test_every_occurrence_page_uses_configured_request_timeout(self):
        self.provider.config.timeout = 23
        stats = SimpleNamespace(attempts=0, pages=0)
        pages = [{'results': [{'key': 1}], 'endOfRecords': False},
                 {'results': [], 'endOfRecords': True}]
        with patch('occurrences.providers.gbif.provider.occurrences.search', side_effect=pages) as request:
            result = self.provider.download_occurrences('Pomatomus saltatrix', self.taxon,
                                                        (-180,180),(-90,90),(2010,2026),None,stats)
        self.assertEqual(len(result), 1)
        self.assertEqual(request.call_count, 2)
        self.assertTrue(all(call.kwargs['timeout'] == 23 for call in request.call_args_list))

    def test_parallel_pages_preserve_order_and_cap_boundary(self):
        stats = SimpleNamespace(attempts=0, pages=0)
        def request(**kwargs):
            offset, size = kwargs['offset'], kwargs['limit']
            if offset == 300:
                time.sleep(.02)  # Later pages may finish first.
            self.assertLessEqual(offset + size, 1000)
            return {'offset':offset, 'count':1500, 'endOfRecords':False,
                    'results':[{'key':i} for i in range(offset,offset+size)]}
        with patch('occurrences.providers.gbif.provider._GBIF_MAX_OFFSET',1000), \
             patch('occurrences.providers.gbif.provider.occurrences.search',side_effect=request) as search:
            result = self.provider.download_occurrences('test',self.taxon,(-180,180),(-90,90),(2010,2026),None,stats)
        self.assertEqual(result['key'].tolist(),list(range(1000)))
        self.assertEqual(search.call_count,4)
        self.assertEqual(stats.pages,4)

    def test_complete_pages_are_reused_and_query_changes_do_not_collide(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.provider.cache.enabled = True
            self.provider.cache.cache_dir = tmp
            def request(**kwargs):
                offset = kwargs['offset']
                return {'offset':offset,'count':500,'endOfRecords':offset>0,
                        'results':[{'key':i} for i in range(offset,min(offset+300,500))]}
            with patch('occurrences.providers.gbif.provider.occurrences.search',side_effect=request) as search:
                first=self.provider.download_occurrences('test',self.taxon,(-180,180),(-90,90),(2010,2026),None,SimpleNamespace(attempts=0,pages=0))
                second=self.provider.download_occurrences('test',self.taxon,(-180,180),(-90,90),(2010,2026),None,SimpleNamespace(attempts=0,pages=0))
                self.assertEqual(search.call_count,2)
                pd.testing.assert_frame_equal(first,second)
                self.provider.download_occurrences('test',self.taxon,(-180,180),(-90,90),(2011,2026),None,SimpleNamespace(attempts=0,pages=0))
                self.assertEqual(search.call_count,4)

    def test_explicit_record_limit_preserves_original_first_records(self):
        def request(**kwargs):
            offset=kwargs['offset']
            return {'offset':offset,'count':1500,'endOfRecords':False,
                    'results':[{'key':i} for i in range(offset,offset+kwargs['limit'])]}
        with patch('occurrences.providers.gbif.provider.occurrences.search',side_effect=request) as search:
            result=self.provider.download_occurrences('test',self.taxon,(-180,180),(-90,90),(2010,2026),350,SimpleNamespace(attempts=0,pages=0))
        self.assertEqual(result['key'].tolist(),list(range(350)))
        self.assertEqual(search.call_count,2)

    def test_rate_limit_retry_respects_server_wait(self):
        response=requests.Response();response.status_code=429;response.headers['Retry-After']='12'
        error=requests.HTTPError('rate limited',response=response)
        calls=iter([error,{'results':[]}])
        def query():
            value=next(calls)
            if isinstance(value,Exception):raise value
            return value
        with patch('occurrences.providers.gbif.provider.time.sleep') as sleep:
            self.assertEqual(_pygbif_retry(query),{'results':[]})
        sleep.assert_called_once_with(12.0)

    def test_concurrent_requests_receive_separate_time_slots(self):
        with patch('occurrences.providers.gbif.provider._next_request_at',0.0), \
             patch('occurrences.providers.gbif.provider.time.monotonic',return_value=0.0), \
             patch('occurrences.providers.gbif.provider.time.sleep') as sleep:
            for _ in range(3):_wait_for_request()
        self.assertEqual([c.args[0] for c in sleep.call_args_list],[1.0,2.0])


if __name__ == "__main__":
    unittest.main(verbosity=2)
