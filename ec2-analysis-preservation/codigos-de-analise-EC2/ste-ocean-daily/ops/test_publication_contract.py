import csv
import hashlib
import json
from pathlib import Path
import tempfile
import unittest

from publish_run import check_complete


class PublicationContractTest(unittest.TestCase):
    def fixture(self, base):
        root=base/'2026-10-13';root.mkdir()
        rows=[];records=[]
        for i in range(19):
            sid=f'species_{i}';folder=root/sid;folder.mkdir();files=[]
            for suffix in ('mean.tif','sd.tif','extrapolacao.tif','methodology.json'):
                name=f'{sid}_rf_{root.name}_{suffix}' if suffix!='methodology.json' else suffix
                p=folder/name;p.write_bytes(b'small test artifact')
                files.append({'name':name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
            (folder/'complete.json').write_text(json.dumps({'status':'complete','files':files,'signature':{'layers':{'data_date':root.name}}}))
            rows.append({'species_id':sid});records.append({'species_id':sid,'status':'complete'})
        config=base/'models.csv'
        with config.open('w',newline='') as f:
            w=csv.DictWriter(f,fieldnames=['species_id']);w.writeheader();w.writerows(rows)
        (root/'run_summary.json').write_text(json.dumps({'expected':19,'records':records}))
        return root,config

    def test_partial_species_or_failed_species_blocks_publication(self):
        for change in ('missing','failed','duplicate'):
            with self.subTest(change=change),tempfile.TemporaryDirectory() as tmp:
                root,config=self.fixture(Path(tmp));p=root/'run_summary.json';d=json.loads(p.read_text())
                if change=='missing':d['records'].pop()
                elif change=='failed':d['records'][0]['status']='failed'
                else:d['records'][0]['species_id']=d['records'][1]['species_id']
                p.write_text(json.dumps(d))
                with self.assertRaises(ValueError):check_complete(root,config)
                self.assertFalse((root/'run_summary.csv').exists())

    def test_complete_run_and_corruption_or_missing_product(self):
        with tempfile.TemporaryDirectory() as tmp:
            root,config=self.fixture(Path(tmp));self.assertEqual(len(check_complete(root,config)),19)
            p=root/'species_0'/f'species_0_rf_{root.name}_mean.tif';p.write_bytes(b'corrupt')
            with self.assertRaises(ValueError):check_complete(root,config)
        with tempfile.TemporaryDirectory() as tmp:
            root,config=self.fixture(Path(tmp));p=root/'species_0/complete.json';d=json.loads(p.read_text());d['files']=[];p.write_text(json.dumps(d))
            with self.assertRaises(ValueError):check_complete(root,config)


if __name__=='__main__':unittest.main()
