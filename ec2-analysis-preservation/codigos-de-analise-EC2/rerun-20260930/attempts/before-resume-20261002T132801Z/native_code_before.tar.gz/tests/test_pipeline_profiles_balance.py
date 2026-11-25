"""Roteamento e preparação do treino, sem downloads ou predições em grande escala."""
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import perfil
from balanceamento import preparar_treino, dividir_treino_teste, validar_csv_treino
from run_pipeline_especies import plano, ler_listas


class PerfisTest(unittest.TestCase):
    def test_oceanico_e_semiaquatico(self):
        itens = plano(['Chelonia mydas', 'Mugil liza', 'Hydrochoerus hydrochaeris', 'Vireo chivi'])
        self.assertEqual([i['pipeline'] for i in itens],
                         ['run_pipeline_ocean.py']*2 + ['run_pipeline.py']*2)
        self.assertEqual(itens[0]['perfil'], 'repteis_marinhos')
        self.assertEqual(itens[3]['perfil'], 'aves_migratorias')

    def test_especie_nova_e_perfil_incompativel(self):
        with self.assertRaisesRegex(ValueError, 'sem perfil'):
            plano(['Espécie desconhecida'])
        with self.assertRaisesRegex(ValueError, 'incompatível'):
            plano(['Chelonia mydas'], 'repteis')
        self.assertEqual(plano(['Ramphastos toco'], 'aves')[0]['perfil'], 'aves')

    def test_precedencia_flags_inclusive_booleano(self):
        import argparse
        p = argparse.ArgumentParser()
        p.add_argument('--radius_km', type=float, default=10)
        p.add_argument('--com_amplitudes', action=argparse.BooleanOptionalAction, default=False)
        p.add_argument('--area_max_dist_km', type=float)
        p.add_argument('--min_year', type=int)
        p.add_argument('--config')
        argv = ['--radius_km=3', '--no-com_amplitudes']
        a = p.parse_args(argv)
        perfil.aplicar_perfil('aves_migratorias', a, p, argv)
        self.assertEqual(a.radius_km, 3)
        self.assertFalse(a.com_amplitudes)
        self.assertEqual(a.area_max_dist_km, 300)

    def test_intersecao_primeiro_sem_duplicatas(self):
        with tempfile.TemporaryDirectory() as tmp:
            a, b = Path(tmp)/'rs.txt', Path(tmp)/'es.txt'
            a.write_text('Butia eriospatha\nVireo chivi\nVireo chivi\n')
            b.write_text('Mugil liza\nVireo chivi\n')
            self.assertEqual(ler_listas([a,b]), ['Vireo chivi','Butia eriospatha','Mugil liza'])

    def test_perfil_propagado_ate_treinamento(self):
        result = subprocess.run([sys.executable, 'run_pipeline.py', '--especie', 'Cedrela fissilis',
                                 '--dry_run'], cwd=ROOT, text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        treino = next(line for line in result.stdout.splitlines() if 'Rscript' in line and 'run_rf_' in line)
        self.assertIn('ocup_solo_mapbiomas t2m_amp,e_amp,tp_amp,ndvi_amp 42', treino)

    def test_proporcao_invalida_para_antes_de_aquisicao(self):
        result = subprocess.run([sys.executable, 'run_pipeline.py', '--especie', 'Cedrela fissilis',
                                 '--ratio=2'], cwd=ROOT, text=True, capture_output=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('exige --ratio 1.0', result.stderr)
        self.assertNotIn('ETAPA 1', result.stdout)

    def test_config_perfil_resolvido_antes_de_mudar_cwd(self):
        import argparse
        import run_pipeline
        args = argparse.Namespace(especie='Eugenia uniflora', occ_csv=None,
            config='01_data_acquisition/occurrences/config_plantas.yaml',
            no_cache=False, min_lon=None, max_lon=None, min_lat=None,
            max_lat=None, min_year=None, max_year=None, dry_run=True)
        with patch('run_pipeline._run') as call, patch('run_pipeline.naming.achar'):
            run_pipeline.etapa_ocorrencias(args, ROOT/'unused-test-output')
        cmd = call.call_args.args[0]
        config = Path(cmd[cmd.index('--config')+1])
        self.assertTrue(config.is_absolute())
        self.assertTrue(config.is_file())
        self.assertEqual(call.call_args.kwargs['cwd'], run_pipeline.ACQ_DIR)

    def test_sibbr_alias_nao_duplica_colunas_na_uniao(self):
        sys.path.insert(0, str(ROOT/'01_data_acquisition'))
        from occurrences.providers.sibbr.provider import SiBBrProvider
        from occurrences.config import OccurrencesConfig
        from occurrences.base import TaxonMatch
        from occurrences.merger import merge_frames
        raw = pd.DataFrame({'recordedBy':['Nome canônico',None],
                            'collector':['Alias','Preenche ausente'],
                            'decimalLatitude':[-20,-21],
                            'decimalLongitude':[-45,-46]})
        provider = SiBBrProvider(OccurrencesConfig())
        taxon = TaxonMatch(provider='sibbr',query_name='Eugenia uniflora',
                           scientific_name='Eugenia uniflora')
        frame = provider.normalize(raw, taxon)
        self.assertTrue(frame.columns.is_unique)
        self.assertEqual(frame.recordedBy.tolist(),['Nome canônico','Preenche ausente'])
        self.assertEqual(len(merge_frames([frame,frame])),4)


class BalanceamentoTest(unittest.TestCase):
    def test_filtra_na_inf_e_nao_duplica_minoria(self):
        df = pd.DataFrame({'id': range(15), 'sp': [0]*10+[1]*5,
                           'x': [np.inf, np.nan]+list(range(13))})
        d, audit = preparar_treino(df, ['x'], seed=17)
        d2, _ = preparar_treino(df, ['x'], seed=17)
        pd.testing.assert_frame_equal(d, d2)
        self.assertEqual(d.sp.value_counts().to_dict(), {0:5,1:5})
        self.assertTrue(d.id.is_unique)
        self.assertEqual(set(d[d.sp==1].id), set(df[df.sp==1].id))
        self.assertEqual(audit['casos_completos'], {'0':8,'1':5})

    def test_sp_invalido_e_classe_ausente(self):
        for valores in ([0,1,0.5], [0,0,0], [0,1,np.nan]):
            with self.assertRaises(ValueError):
                preparar_treino(pd.DataFrame({'sp':valores,'x':[1,2,3]}), ['x'])

    def test_split_impar_balanceado_e_sem_vazamento(self):
        y = np.array([0]*11+[1]*11)
        tr, te = dividir_treino_teste(y)
        self.assertFalse(set(tr) & set(te))
        self.assertEqual(set(tr)|set(te), set(range(22)))
        self.assertEqual(np.bincount(y[tr]).tolist(), [7,7])
        self.assertEqual(np.bincount(y[te]).tolist(), [4,4])

    def test_predicao_recusa_csv_legado_antes_de_criar_saida(self):
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp);csv=base/'predictor_climatologico.csv'
            (base/'rf_Cedrela_fissilis_clima.sdm').touch()
            pd.DataFrame({'sp':[0,0,1], 'x':[1,2,3]}).to_csv(csv,index=False)
            out=base/'saida'
            result=subprocess.run([sys.executable,'run_predicoes_cenarios.py','--especie','Cedrela fissilis',
                                   '--model_dir',str(base),'--outdir',str(out),'--dry_run'],
                                  cwd=ROOT,text=True,capture_output=True)
            self.assertNotEqual(result.returncode,0)
            self.assertIn('Treino fora de 1:1',result.stderr)
            self.assertFalse(out.exists())
            pd.DataFrame({'sp':[0,1], 'x':[1,2]}).to_csv(csv,index=False)
            with self.assertRaisesRegex(ValueError,'preditores do perfil'):
                validar_csv_treino(csv,['t2m_amp'])

    def test_predicao_marinha_recusa_modelo_legado(self):
        import argparse
        import run_pipeline_ocean as ocean
        with tempfile.TemporaryDirectory() as tmp:
            base=Path(tmp)
            (base/'rf_Mugil_liza_marinho_eval.json').write_text('{}')
            args=argparse.Namespace(especie='Mugil liza',dry_run=False,janela='2015-2024',engine='python')
            with self.assertRaisesRegex(SystemExit,'sem registro de treinamento 1:1'):
                ocean.etapa_predicao(args,base,base,'Rscript')

    def test_extrapolacao_inclui_amplitude_do_perfil(self):
        import rasterio
        spec=importlib.util.spec_from_file_location('extrapolacao',ROOT/'04_modeling/mapa_extrapolacao.py')
        mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
        with tempfile.TemporaryDirectory() as tmp:
            base=Path(tmp);cen=base/'anual';cen.mkdir();csv=base/'treino.csv'
            pd.DataFrame({'sp':[0,1],'ndvi':[0,1],'t2m_amp':[1,2]}).to_csv(csv,index=False)
            for nome,valor in [('ndvi',0.5),('t2m_amp',3),('ocup_solo_mapbiomas',3)]:
                with rasterio.open(cen/(nome+'.tif'),'w',driver='GTiff',width=2,height=2,count=1,
                                   dtype='float32',crs='EPSG:4326',
                                   transform=rasterio.transform.from_origin(-50,-20,0.1,0.1),nodata=-9999) as dst:
                    dst.write(np.full((2,2),valor,dtype='float32'),1)
            with patch('builtins.print'):
                resultado=mod.gerar(cen,csv,out_dir=base/'saida')
            with rasterio.open(resultado) as src:
                self.assertTrue((src.read(1)==1).all())
            meta=json.loads(resultado.with_suffix('.json').read_text())
            self.assertEqual(meta['pct_fora_por_variavel']['t2m_amp'],100)

    @unittest.skipUnless(shutil.which('Rscript'), 'Rscript não instalado')
    def test_preparacao_r_finito_1x1_e_sem_duplicacao(self):
        script = '''source("04_modeling/balanceamento.R")
        d <- data.frame(id=1:16, sp=c(rep(0,11),rep(1,5)), x=c(Inf,NA,1:14))
        a <- preparar_treino_balanceado(d,c("x"),17)
        b <- preparar_treino_balanceado(d,c("x"),17)
        stopifnot(identical(a,b), sum(a$dados$sp==0)==5, sum(a$dados$sp==1)==5,
                  !anyDuplicated(a$dados$id), all(is.finite(a$dados$x)))
        # Uma única ausência com índice > 1 não deve ser interpretada como 1:índice.
        z <- preparar_treino_balanceado(data.frame(sp=c(1,1,0),x=1:3),"x")
        stopifnot(identical(sort(z$dados$sp),c(0,1)))
        '''
        result = subprocess.run(['Rscript','-e',script], cwd=ROOT, text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_modelo_marinho_pequeno_e_split_publicado(self):
        spec = importlib.util.spec_from_file_location('modelo_marinho', ROOT/'04_modeling/modelo_marinho.py')
        mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
        rng = np.random.default_rng(19)
        data = pd.DataFrame({'sp':[0]*31+[1]*11,'year':[2025]*42})
        for col in mod.PREDITORES:
            data[col] = rng.normal(size=42)
        data.loc[0,'sst'] = np.inf
        with tempfile.TemporaryDirectory() as tmp:
            csv = Path(tmp)/'variables.csv';data.to_csv(csv,index=False)
            with patch('builtins.print'):
                modelo = mod.treinar(csv,Path(tmp)/'modelo','Mugil liza',42,20,2025)
            metrics = json.loads(modelo.with_name(modelo.stem+'_eval.json').read_text())
            self.assertEqual(metrics['n_presencas'],11)
            self.assertEqual(metrics['n_pseudo'],11)
            self.assertEqual(metrics['classes_treino'], {'0':7,'1':7})
            split = pd.read_csv(modelo.with_name(modelo.stem+'_dados_split.csv'))
            for _, part in split.groupby('split'):
                self.assertEqual((part.sp==0).sum(), (part.sp==1).sum())
            self.assertEqual(len(split),22)
            self.assertTrue(np.isfinite(split[mod.PREDITORES]).all().all())
            if shutil.which('Rscript'):
                rdir = Path(tmp)/'modelo_r'
                cmd = ['Rscript', str(ROOT/'04_modeling/modelo_marinho.R'),
                       str(modelo.with_name(modelo.stem+'_dados_split.csv')), str(rdir),
                       'Mugil liza', '20']
                valid = subprocess.run(cmd, cwd=ROOT, text=True, capture_output=True)
                self.assertEqual(valid.returncode, 0, valid.stderr)
                rmetrics = json.loads((rdir/'rf_Mugil_liza_marinho_R_eval.json').read_text())
                self.assertEqual(rmetrics['n_treino'],14)
                self.assertEqual(rmetrics['n_teste'],8)
                # R deve recusar um split legado desbalanceado, sem treinar silenciosamente.
                split.iloc[1:].to_csv(modelo.with_name(modelo.stem+'_dados_split.csv'),index=False)
                invalid = subprocess.run(cmd, cwd=ROOT, text=True, capture_output=True)
                self.assertNotEqual(invalid.returncode,0)
                self.assertIn('não está em 1:1',invalid.stderr)


if __name__ == '__main__':
    unittest.main()
