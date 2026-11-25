"""Offline scientific transforms, full tiny 17-scenario run, resume and real R export."""
import json,shutil,subprocess,tempfile,unittest
from pathlib import Path
import joblib,numpy as np,pandas as pd,rasterio,xarray as xr
from sklearn.ensemble import RandomForestClassifier
from marine_scenarios import MarineLayers,Scenario,scenarios,check_months,annual_and_monthly,delta_fields,sha,ROOT
from run_predicoes_cenarios_ocean import forest_moments,run_scenario,complete_marker

class MarineScenariosTests(unittest.TestCase):
    def test_17_names_groups_and_real_months(self):
        plan=scenarios();self.assertEqual(len(plan),17);self.assertEqual(len({s.name for s in plan}),17)
        self.assertEqual([s.month for s in scenarios(groups=['mensal'])],list(range(1,13)))
        self.assertEqual(len(scenarios(groups=['futuro'])),4)
        with self.assertRaises(ValueError):scenarios(groups=['inventado'])

    def test_calendar_requires_each_month_once(self):
        times=pd.date_range('2015-01-01','2016-12-01',freq='MS')
        check_months(times,'2015-2016')
        for bad in [times[1:],times.append(times[:1])]:
            with self.assertRaises(ValueError):check_months(bad,'2015-2016')
        a=xr.DataArray(np.array(times.month,dtype=float).reshape(24,1,1),dims=['time','lat','lon'],coords={'time':times,'lat':[0.],'lon':[0.]})
        result=annual_and_monthly(a,'2015-2016')
        np.testing.assert_allclose(result.monthly.values.ravel(),np.arange(1,13))
        self.assertAlmostEqual(float(result.annual.values.item()),6.5)

    def test_changes_preserve_units_and_mask_invalid_ratio(self):
        obs={k:xr.DataArray(v) for k,v in {'sst':[20.,21.],'sss':[35.,36.],'chl':[2.,3.]}.items()}
        ref={k:xr.DataArray(v) for k,v in {'sst':[10.,11.],'sss':[34.,35.],'chl':[.000002,0.]}.items()}
        fut={k:xr.DataArray(v) for k,v in {'sst':[13.,14.],'sss':[33.,34.],'chl':[.000001,.000002]}.items()}
        result=delta_fields(obs,ref,fut)
        np.testing.assert_allclose(result['sst'],[23.,24.]);np.testing.assert_allclose(result['sss'],[34.,35.])
        self.assertAlmostEqual(float(result['chl'][0]),1.);self.assertTrue(np.isnan(result['chl'][1]))

    def test_forest_moments_match_actual_ensemble(self):
        rng=np.random.default_rng(42);X=rng.normal(size=(100,4)).astype('float32');y=np.arange(100)%2
        model=RandomForestClassifier(n_estimators=11,random_state=42).fit(X,y)
        mean,sd=forest_moments(model,X,2)
        all_predictions=np.array([t.predict_proba(X)[:,1] for t in model.estimators_])
        np.testing.assert_allclose(mean,model.predict_proba(X)[:,1],atol=1e-12)
        np.testing.assert_allclose(sd,all_predictions.std(axis=0),atol=1e-12)

    def fixture(self,b):
        times=pd.date_range('2015-01-01','2016-12-01',freq='MS');lat=[-11.,-10.];lon=[-40.,-39.]
        coords={'time':times,'latitude':lat,'longitude':lon};monthly=np.asarray(times.month)[:,None,None]*.1+np.zeros((24,2,2))
        phy=xr.Dataset({'thetao':(('time','latitude','longitude'),18.+monthly),'so':(('time','latitude','longitude'),35.+monthly*.1)},coords=coords)
        phy.thetao.attrs['units']='degrees_C';phy.so.attrs['units']='1e-3'
        chl=xr.Dataset({'CHL':(('time','latitude','longitude'),1.+monthly*.1)},coords=coords);chl.CHL.attrs['units']='milligram m-3'
        cache=b/'cmems';cache.mkdir();phy.to_netcdf(cache/'phy_2015-2016.nc');chl.to_netcdf(cache/'chl_2015-2016.nc')
        bath=b/'depth.nc';xr.Dataset({'elevation':(('lat','lon'),[[-100.,-200.],[-300.,10.]])},coords={'lat':lat,'lon':lon}).to_netcdf(bath)
        layers=MarineLayers((-40,-11,-39,-10),'2015-2016',1.,b/'layers',cache,bath)
        for ssp in ['ssp245','ssp585']:
            means={}
            for variable,value in [('tos',18.),('sos',35.),('chl',.000001)]:
                means[variable]=xr.Dataset({name:xr.DataArray(np.full((2,2),value+(3 if name=='2050' else 5 if name=='2100' else 0)) if variable!='chl' else np.full((2,2),value*(.8 if name=='2050' else .6 if name=='2100' else 1)),dims=['lat','lon'],coords={'lat':lat,'lon':lon}) for name in ['base','2050','2100']})
            layers._future[ssp]=(means,{v:{'zstore':'fixture://offline/'+ssp+'/'+v} for v in means})
        predictors=['sst','sss','chl_log10','profundidade'];rng=np.random.default_rng(42)
        X=np.column_stack([rng.uniform(17,30,100),rng.uniform(30,45,100),rng.uniform(-2,1,100),rng.uniform(-1000,-1,100)]).astype('float32');y=np.arange(100)%2
        model=RandomForestClassifier(n_estimators=7,random_state=42).fit(X,y)
        ranges={v:[float(X[:,i].min()),float(X[:,i].max())] for i,v in enumerate(predictors)}
        path=b/'rf_Mugil_liza_marinho.joblib';joblib.dump({'modelo':model,'preditores':predictors,'faixa_treino':ranges},path)
        evaluation={'faixa_treino':ranges,'balanceamento':{'proporcao':'1:1'},'n_presencas':50,'n_pseudo':50}
        return layers,path,evaluation,X,y,predictors

    def test_full_17_run_real_tiffs_and_resume_with_model_fingerprint(self):
        with tempfile.TemporaryDirectory() as tmp:
            b=Path(tmp);layers,model,ev,*_=self.fixture(b);out=b/'outputs'
            for scenario in scenarios('2015-2016'):
                result=run_scenario('Mugil liza',model,ev,scenario,layers,out,'python',jobs=2)
                self.assertEqual(result['status'],'complete')
                folder=out/scenario.name;marker=json.loads((folder/'complete.json').read_text())
                self.assertEqual(len(marker['files']),4)
                for f in marker['files']:
                    self.assertEqual(sha(folder/f['name']),f['sha256'])
                    if f['name'].endswith('.tif'):
                        with rasterio.open(folder/f['name']) as r:self.assertEqual(r.read(1,masked=True).count(),3)
                self.assertTrue(run_scenario('Mugil liza',model,ev,scenario,layers,out,'python',jobs=2)['reused'])
                bad=dict(marker['signature'],model_sha256='different')
                with self.assertRaises(ValueError):complete_marker(folder,bad)
            self.assertEqual(len(list(out.glob('*/complete.json'))),17)

    @unittest.skipUnless(shutil.which('Rscript'),'R unavailable')
    def test_real_R_export_shares_grid_and_keeps_land_mask(self):
        with tempfile.TemporaryDirectory() as tmp:
            b=Path(tmp);layers,model,ev,X,y,predictors=self.fixture(b)
            split=pd.DataFrame(X,columns=predictors);split['sp']=y;split['split']=np.where(np.arange(100)<80,'treino','teste');csv=b/'split.csv';split.to_csv(csv,index=False)
            trained=subprocess.run(['Rscript',str(ROOT/'04_modeling/modelo_marinho.R'),str(csv),str(b),'Mugil liza','7'],capture_output=True,text=True)
            self.assertEqual(trained.returncode,0,trained.stderr)
            scenario=scenarios('2015-2016')[0]
            result=run_scenario('Mugil liza',model,ev,scenario,layers,b/'outputs','ambos',jobs=2)
            self.assertEqual(result['status'],'complete')
            marker=json.loads((b/'outputs'/scenario.name/'complete.json').read_text());self.assertEqual(len(marker['files']),5)

if __name__=='__main__':unittest.main()
