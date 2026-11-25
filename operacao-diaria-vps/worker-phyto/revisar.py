"""Gera a prévia somente a partir dos produtos confirmados em produção."""
from pathlib import Path
import json,os
from alert_delivery import deliver_once
from alert_reconciliation import reconcile_alerts
from image_processor.alertas import ClassificacaoAlertas,extrair_data
from runtime_state import state_root,exclusive_lock,write_json
import requests
from areas import limites

def processar(publicar=False, proof=None):
    root=state_root()
    from contextlib import nullcontext
    with (exclusive_lock(root/'vps.lock') if proof is None else nullcontext()):
        if proof is None:
            proofs=sorted((root/'publications').glob('*/vps-readback.json'),key=lambda p:p.stat().st_mtime)
            if not proofs:raise ValueError('Ainda não há rodada publicada')
            proof=json.loads(proofs[-1].read_text())
        manifest_path=Path(proof['manifest']);manifest=json.loads(manifest_path.read_text())
        by_aoi={str(scene['aoi_id']):scene for scene in manifest['scenes']}
        keys={p['key'] for p in proof['products']}
        assert len(keys)==15
        boundaries=limites(os.environ['SIAPESQ_BASE_API'],os.environ['SIAPESQ_API_KEY'],by_aoi)
        preview=[]
        for path in sorted((root/'alertas-em-validacao').glob('*.json')):
            identity=json.loads(path.read_text())['request']
            scene=by_aoi.get(identity['aoi_id'])
            if not scene or identity['acquisition']!=scene['acquisition']:continue
            kind=identity['product']
            p=next(p for p in scene['products'] if p['key'].lower().endswith('_'+kind+'.tif'))
            assert p['key'] in keys
            classifier=ClassificacaoAlertas()
            bounds=boundaries[(identity['aoi_id'],identity['area_id'])]
            if [round(n,6) for n in bounds]!=identity['bbox']:raise ValueError('Área alterada desde a aquisição')
            classifier.separar_area_alerta(manifest_path.parent/p['path'],bounds,kind)
            alerts=classifier.criar_alertas(int(identity['aoi_id']),extrair_data(p['key']),kind,int(identity['area_id']))
            if not isinstance(alerts,list):raise RuntimeError('Classificação incompleta')
            preview.append({'request':identity,'alertas':alerts,'limites':bounds})
        assert len(preview)==39
        write_json(manifest_path.parent/'previa-alertas.json',preview)
        if publicar:
            for batch in preview:
                deliver_once(batch['request'],lambda:reconcile_alerts(os.environ['SIAPESQ_BASE_API'],'v1/phytoBloom/alertas/bulk',os.environ['SIAPESQ_API_KEY'],batch['alertas'],requests))
        print('Grupos revisados:',len(preview),'Alertas:',sum(len(b['alertas']) for b in preview),'publicação habilitada:',publicar,flush=True)
if __name__=='__main__':
    import sys
    processar(publicar=sys.argv[1:]==['--publicar'])
