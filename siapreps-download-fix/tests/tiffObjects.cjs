const assert = require('node:assert/strict');
const {resolveTiffObjects, listAllTiffKeys, isTiff} = require(process.argv[2]);
const prediction = (n, d) => `predictions/daily/${d}/${n}/${n}_rf_${d}_mean.tif`;
const predictor = (n, d) => `predictors/daily/${d}/${n}_${d}.tif`;
async function main() {
  const names = ['micropogonias_furnieri','caranx_all','SouthAtlanticTemp','SouthAtlanticSal','SouthAtlanticChl'];
  const keys = names.map(n => n.startsWith('South') ? predictor(n,'2026-11-15') : prediction(n,'2026-11-15'));
  keys.push(prediction(names[0],'2026-11-16'), prediction(names[1],'2026-11-16'));
  let plan = resolveTiffObjects([...names,'MS_bathymetry'], [...keys,'predictors/daily/2026-11-15/depth.nc']);
  assert.equal(plan.date,'2026-11-15');
  assert.equal(plan.selected.length,5);
  assert.deepEqual(plan.missing,['MS_bathymetry.tif']);
  assert.equal(plan.selected[0].key,keys[0]);
  assert.equal(plan.selected[0].filename,'micropogonias_furnieri.tif');
  plan = resolveTiffObjects(['caranx_all'],[prediction('caranx_all','2027-01-01')]);
  assert.equal(plan.date,'2027-01-01');
  assert.deepEqual(resolveTiffObjects(['caranx_all'],['caranx_rf.tif']).missing,['caranx_all.tif']);
  assert.equal(resolveTiffObjects(['x'],['x.tif']).selected[0].key,'x.tif');
  assert.equal(resolveTiffObjects(['x','y'],[prediction('x','2026-11-15'),prediction('y','2026-11-16')]).selected.length,0);
  assert.equal(resolveTiffObjects(['x'],['predictions/daily/2026-11-15/x/x_rf_2026-11-15_std.tif']).selected.length,0);
  let calls = [];
  assert.deepEqual(await listAllTiffKeys(async t => {
    calls.push(t);
    return t ? {objects:[{Key:'b.tif'}]} : {objects:[{Key:'a.tif'},{Key:'a.nc'}],next_aws_pagination_token:'next'};
  }),['a.tif','b.tif']);
  assert.deepEqual(calls,[undefined,'next']);
  await assert.rejects(listAllTiffKeys(async () => undefined));
  await assert.rejects(listAllTiffKeys(async () => ({objects:[],next_aws_pagination_token:'same'})));
  assert.equal(isTiff(new Uint8Array([73,73,42,0])),true);
  assert.equal(isTiff(new Uint8Array([77,77,0,43])),true);
  assert.equal(isTiff(Buffer.from('{"Code":"NoSuchKey"}')),false);
  assert.equal(isTiff(new Uint8Array()),false);
  console.log('TIFF resolver, pagination, date consistency, unavailable layer and signature tests passed');
}
main().catch(e=>{console.error(e);process.exitCode=1});
