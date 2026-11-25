"""Regressões com GeoTIFFs reais pequenos; nenhum modelo/serviço externo necessário."""
import contextlib
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

import numpy as np
import rasterio
from rasterio.transform import from_origin

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from prediction_state import inspect_scenario, prepare_existing, validate_tif
from run_predicoes_cenarios import rodar


def tif(path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with rasterio.open(path, "w", driver="GTiff", width=32, height=32, count=1,
                       dtype="float32", crs="EPSG:4326", tiled=True,
                       blockxsize=16, blockysize=16,
                       transform=from_origin(-55, -20, .01, .01)) as ds:
        ds.write(np.full((32, 32), .5, dtype="float32"), 1)


class ResumeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.out = self.root / "out"
        self.model = self.root / "model"
        self.model.mkdir()
        self.slug = "Sapajus_nigritus"
        self.name = "anual_2015_2024"

    def state(self):
        return inspect_scenario(self.slug, self.name, self.out, self.model)

    def pair(self):
        s = self.state()
        tif(s.mean)
        tif(s.sd)
        return self.state()

    def invoke(self, scenarios=None, **kwargs):
        stream = io.StringIO()
        with contextlib.redirect_stdout(stream):
            result = rodar("Sapajus nigritus", self.model, "rf", scenarios or [Path(self.name)],
                           "Rscript", self.out, kwargs.pop("dry_run", False),
                           kwargs.pop("pular_extrap", True), **kwargs)
        return result, stream.getvalue()

    def test_reads_pixels_not_only_header(self):
        s = self.pair()
        data = s.mean.read_bytes()
        s.mean.write_bytes(data[:-500])
        with rasterio.open(s.mean) as ds:
            self.assertEqual(ds.width, 32)  # cabeçalho ainda abre
        self.assertIsNotNone(validate_tif(s.mean))
        self.assertFalse(self.state().complete)

    def test_cancel_and_eof_preserve_everything(self):
        s = self.pair()
        before = {p: p.read_bytes() for p in s.files}
        for answer in ("", "3", EOFError()):
            args = {"side_effect": answer} if isinstance(answer, Exception) else {"return_value": answer}
            with patch("builtins.input", **args):
                self.assertFalse(prepare_existing([s], self.out, "perguntar", False, lambda x: None))
        self.assertEqual(before, {p: p.read_bytes() for p in s.files})
        self.assertFalse((self.out / "_backups").exists())

    def test_resume_removes_only_corrupt_after_backup(self):
        s = self.pair()
        s.sd.write_bytes(b"broken")
        checkpoint = self.model / f"_strips_{s.mean.stem}"
        tif(checkpoint / "mean_001.tif")
        tif(checkpoint / "sd_001.tif")
        partial = checkpoint / "mean_002.partial.tif"
        partial.write_bytes(b"incomplete")
        s = self.state()
        self.assertEqual(s.strips, 1)
        with patch("builtins.input", return_value="1"):
            self.assertTrue(prepare_existing([s], self.out, "perguntar", False, lambda x: None))
        self.assertTrue(s.mean.exists())
        self.assertTrue((checkpoint / "mean_001.tif").exists())
        self.assertFalse(s.sd.exists())
        self.assertFalse(partial.exists())
        manifest = next((self.out / "_backups").glob("*/manifest.json"))
        records = json.loads(manifest.read_text())
        self.assertEqual(len(records), 2)
        self.assertTrue(all((manifest.parent / r["backup"]).exists() for r in records))

    def test_overwrite_is_scoped_and_really_runs(self):
        s = self.pair()
        model_file = self.model / "rf.sdm"
        model_file.write_text("model")
        unrelated = s.mean.parent / "Outra_especie_adequabilidade.tif"
        unrelated.write_bytes(b"preserve")
        other_scenario = self.out / "mensal_01" / "keep.txt"
        other_scenario.parent.mkdir()
        other_scenario.write_text("preserve")
        checkpoint = self.model / f"_strips_{s.mean.stem}"
        tif(checkpoint / "mean_001.tif")
        def run(cmd, **kw):
            self.assertFalse(s.mean.exists())
            self.assertFalse((checkpoint / "mean_001.tif").exists())
            tif(Path(cmd[5])); tif(Path(cmd[6]))
        with patch("builtins.input", return_value="2"), patch("subprocess.run", side_effect=run) as process:
            ok, text = self.invoke()
        self.assertTrue(ok)
        process.assert_called_once()
        self.assertIn("FINALIZADA 1/1", text)
        self.assertEqual(unrelated.read_bytes(), b"preserve")
        self.assertTrue(model_file.exists() and other_scenario.exists())

    def test_backup_failure_keeps_originals(self):
        s = self.pair()
        with patch("prediction_state.shutil.copy2", side_effect=OSError("disk full")):
            with self.assertRaises(OSError):
                prepare_existing([s], self.out, "overwrite", False, lambda x: None)
        self.assertTrue(s.mean.exists() and s.sd.exists())

    def test_dry_run_no_prompt_or_writes(self):
        self.pair()
        before = sorted(self.root.rglob("*"))
        with patch("builtins.input", side_effect=AssertionError("prompt")), patch("subprocess.run") as process:
            ok, text = self.invoke(dry_run=True, existentes="overwrite")
        self.assertTrue(ok)
        self.assertIn("SIMULAÇÃO", text)
        self.assertEqual(before, sorted(self.root.rglob("*")))
        process.assert_not_called()

    def test_empty_dry_run_does_not_create_output(self):
        ok, _ = self.invoke(dry_run=True)
        self.assertTrue(ok)
        self.assertFalse(self.out.exists())

    def test_completed_maps_reused(self):
        self.pair()
        with patch("subprocess.run") as process:
            ok, text = self.invoke(existentes="retomar")
        self.assertTrue(ok)
        process.assert_not_called()
        self.assertIn("1 pares de mapas reaproveitados", text)

    def test_failure_continues_and_reports_failure(self):
        def run(cmd, **kw):
            if self.name in cmd[4]:
                raise subprocess.CalledProcessError(2, cmd)
            tif(Path(cmd[5])); tif(Path(cmd[6]))
        with patch("subprocess.run", side_effect=run):
            ok, text = self.invoke(scenarios=[Path(self.name), Path("mensal_01")])
        self.assertFalse(ok)
        self.assertIn("PRÓXIMA 2/2", text)
        self.assertIn("FINALIZADA 2/2", text)
        self.assertIn("LOTE ENCERRADO COM FALHAS", text)
        self.assertNotIn("PREDIÇÕES CONCLUÍDAS", text)

    def test_exit_zero_missing_output_is_failure(self):
        with patch("subprocess.run"):
            ok, text = self.invoke()
        self.assertFalse(ok)
        self.assertIn("saída ausente/inválida", text)

    def test_extrap_failure_is_reported(self):
        self.pair()
        (self.model / "predictor_climatologico.csv").write_text("data")
        with patch("subprocess.run", side_effect=subprocess.CalledProcessError(1, ["extrap"])):
            ok, text = self.invoke(pular_extrap=False, existentes="retomar")
        self.assertFalse(ok)
        self.assertIn("FALHOU 1/1", text)


if __name__ == "__main__":
    unittest.main()
