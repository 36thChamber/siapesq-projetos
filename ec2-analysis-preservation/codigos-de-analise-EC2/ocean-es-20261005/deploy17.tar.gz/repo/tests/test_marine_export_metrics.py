"""Regressions for masked marine pixels and MCC on several thousand test rows."""
import ast
from pathlib import Path
import shutil,subprocess,tempfile,unittest
import numpy as np
import rasterio
import rioxarray
import xarray as xr

ROOT=Path(__file__).resolve().parents[1]

class MarineRegression(unittest.TestCase):
    def test_export_declares_mask_without_changing_probabilities(self):
        # Execute the actual writer statements with a tiny ocean/land grid.
        tree=ast.parse((ROOT/'04_modeling/predizer_marinho.py').read_text())
        function=next(n for n in ast.walk(tree) if isinstance(n,ast.FunctionDef) and any(isinstance(x,ast.Expr) and isinstance(x.value,ast.Call) and ast.unparse(x.value.func)=='da.rio.to_raster' for x in n.body))
        body=function.body;start=next(i for i,n in enumerate(body) if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='da' for t in n.targets))
        end=next(i for i,n in enumerate(body) if isinstance(n,ast.Expr) and isinstance(n.value,ast.Call) and ast.unparse(n.value.func)=='da.rio.to_raster')
        grid=np.array([[np.nan,0.25],[0.75,np.nan]])
        with tempfile.TemporaryDirectory() as tmp:
            env={'np':np,'xr':xr,'grid':grid,'lat_g':np.array([-10.,-11.]),'lon_g':np.array([-40.,-39.]),'outdir':Path(tmp),'slug':'test','janela':'2015-2024'}
            exec(compile(ast.Module(body=body[start:end+1],type_ignores=[]),'<native marine export>','exec'),env)
            with rasterio.open(env['tif']) as r:
                result=r.read(1,masked=True)
                self.assertTrue(np.isnan(r.nodata))
                np.testing.assert_array_equal(result.mask,np.isnan(grid))
                np.testing.assert_array_equal(result.compressed(),[.25,.75])

    @unittest.skipUnless(shutil.which('Rscript'),'R unavailable')
    def test_mcc_large_balanced_confusion_matrices(self):
        source=(ROOT/'04_modeling/modelo_marinho.R').read_text()
        native=source[source.index('pred <- as.integer(p_te >= thr)'):source.index('# importância (MeanDecreaseGini)')]
        # Known MCC: perfect, inverted, and 75% accuracy with balanced classes.
        for tp,tn,fp,fn,expected in [(1900,1900,0,0,1),(0,0,1900,1900,-1),(1500,1500,500,500,.5),(0,1900,0,1900,0)]:
            code=f'y_te <- c(rep(1,{tp}),rep(0,{tn}),rep(0,{fp}),rep(1,{fn})); p_te <- c(rep(1,{tp}),rep(0,{tn}),rep(1,{fp}),rep(0,{fn})); thr <- .5\n'+native+f'\nstopifnot(is.finite(mcc),abs(mcc-({expected}))<1e-12)'
            result=subprocess.run(['Rscript','-e',code],capture_output=True,text=True)
            self.assertEqual(result.returncode,0,result.stderr)

if __name__=='__main__':unittest.main()
