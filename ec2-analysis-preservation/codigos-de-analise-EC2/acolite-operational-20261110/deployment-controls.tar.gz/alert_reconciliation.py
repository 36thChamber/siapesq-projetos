"""Opt-in reconciliation against actual SIAPESQ records. Requires one writer.

The backend's pre-read deduplication is not an atomic uniqueness constraint.
No retry is performed after an ambiguous write or failed verification.
"""
from datetime import datetime, timezone
from urllib.parse import urlsplit


class ReconciliationError(RuntimeError):
    pass


def _timestamp(value):
    value = datetime.fromisoformat(str(value).replace('Z', '+00:00'))
    # Legacy payload date strings have no offset; SIAPESQ treats these as UTC.
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat()


def _integer(value):
    if isinstance(value, bool) or str(value) != str(int(value)):
        raise ReconciliationError('Invalid alert identifier')
    return int(value)


def _key(row):
    return (_integer(row['id_reservatorio']), _timestamp(row['data_alerta']),
            row['tipo'], _integer(row['id_area_alerta']))


def reconcile_alerts(base_api, endpoint, api_key, alertas, transport, page_size=1000):
    """Return actual record IDs only after every material expected row is found."""
    base = urlsplit(base_api)
    if (base.scheme != 'https' or not base.netloc or base.username or base.password
            or base.query or base.fragment or base.path not in ('', '/')
            or endpoint.strip('/') != 'v1/phytoBloom/alertas/bulk'):
        raise ReconciliationError('Unsupported alert URI')
    url = base_api.rstrip('/') + '/v1/phytoBloom/alertas'
    if not isinstance(alertas, list):
        raise ReconciliationError('Expected alert list')
    if not alertas:
        return {'reconciled': True, 'record_ids': [], 'posted': False}
    expected = {}
    for row in alertas:
        key = _key(row)
        if key[0] not in (165, 541, 542):
            raise ReconciliationError('Unsupported reservoir')
        expected.setdefault(key, set()).add(row['nivel_critico'])
    if len({key[0] for key in expected}) != 1:
        raise ReconciliationError('Mixed reservoirs are unsupported')
    headers = {'x-api-key': api_key}

    def read():
        found = {key: [] for key in expected}
        for stamp in sorted({key[1] for key in expected}):
            offset, total, seen = 0, None, set()
            while total is None or offset < total:
                response = transport.get(url, headers=headers, timeout=(15, 60),
                    allow_redirects=False, params={'data_inicio': stamp,
                    'data_fim': stamp, 'limit': page_size, 'offset': offset})
                if response.status_code != 200:
                    raise ReconciliationError('Alert read failed')
                body = response.json()
                rows, count = body['alertas'], body['total']
                if (not isinstance(rows, list) or type(count) is not int or count < 0
                        or (total is not None and count != total)
                        or (not rows and offset < count)):
                    raise ReconciliationError('Unstable alert pagination')
                total = count
                for row in rows:
                    rid = str(row['id'])
                    if rid in seen:
                        raise ReconciliationError('Repeated alert pagination record')
                    seen.add(rid)
                    if int(row['id_reservatorio']) != next(iter(expected))[0]:
                        continue
                    key = _key(row)
                    if key in found:
                        found[key].append(row)
                offset += len(rows)
                if offset > total:
                    raise ReconciliationError('Inconsistent alert count')
        return found

    def inspect(found):
        complete = True
        for key, severities in expected.items():
            actual = {row['nivel_critico'] for row in found[key]}
            if actual and actual != severities:
                raise ReconciliationError('Existing alert group conflicts with expected payload')
            if not actual:
                complete = False
        return complete

    found = read()
    posted = False
    if not inspect(found):
        # Send only wholly absent backend groups. Never modify existing records.
        missing = [row for row in alertas if not found[_key(row)]]
        response = transport.post(url + '/bulk', headers=headers,
            json={'alertas': missing}, timeout=(15, 60), allow_redirects=False)
        if response.status_code != 200:
            raise ReconciliationError('Alert write outcome requires reconciliation')
        response.raise_for_status()
        posted = True
        found = read()
        if not inspect(found):
            raise ReconciliationError('Alert write not confirmed by readback')
    return {'reconciled': True, 'posted': posted,
            'record_ids': sorted({str(row['id']) for rows in found.values() for row in rows})}
