"""Exercita falha entre uploads, reexecução idempotente e proteção contra regressão de data."""
import hashlib
import io
import json
import tempfile
import unittest
from pathlib import Path
from botocore.exceptions import ClientError
from rodada import publicar

class Storage:
    def __init__(self):
        self.data={}
        self.interrupt=None
    def get_object(self,*,Bucket,Key):
        if self.interrupt and Key.endswith(self.interrupt):raise ConnectionError('Falha de releitura simulada')
        if Key not in self.data:raise ClientError({'Error':{'Code':'NoSuchKey'},'ResponseMetadata':{'HTTPStatusCode':404}},'GetObject')
        raw=self.data[Key]
        return {'Body':io.BytesIO(raw),'ETag':hashlib.sha256(raw).hexdigest()}
    def put_object(self,*,Bucket,Key,Body,ContentType,IfNoneMatch=None,IfMatch=None):
        if (IfNoneMatch=='*' and Key in self.data) or (IfMatch and (Key not in self.data or hashlib.sha256(self.data[Key]).hexdigest()!=IfMatch)):
            raise ClientError({'Error':{'Code':'PreconditionFailed'},'ResponseMetadata':{'HTTPStatusCode':412}},'PutObject')
        self.data[Key]=Body if isinstance(Body,bytes) else Body.read()

class Publication(unittest.TestCase):
    def test_atomic(self):
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp)/'sample.nc';p.write_bytes(b'original')
            files=[('sample',p,True)]
            storage=Storage()
            publicar(files,'2026-11-15',storage,'teste')
            key='catalogo/publicado.json';old=storage.data[key]
            # Both uploads succeed but verification of the second object is interrupted.
            p.write_bytes(b'new data')
            files=[('first',p,True),('second',p,True)]
            storage.interrupt='/second'
            with self.assertRaises(ConnectionError):publicar(files,'2026-11-17',storage,'teste')
            self.assertEqual(storage.data[key],old)
            self.assertTrue(any(k.endswith('/first') for k in storage.data))
            storage.interrupt=None
            publicar(files,'2026-11-17',storage,'teste')
            catalog=storage.data[key]
            self.assertEqual(json.loads(catalog)['data_date'],'2026-11-17')
            publicar(files,'2026-11-17',storage,'teste')
            self.assertEqual(catalog,storage.data[key])
            with self.assertRaisesRegex(ValueError,'mais recente'):publicar(files,'2026-11-16',storage,'teste')
            self.assertEqual(catalog,storage.data[key])

if __name__=='__main__':unittest.main()
