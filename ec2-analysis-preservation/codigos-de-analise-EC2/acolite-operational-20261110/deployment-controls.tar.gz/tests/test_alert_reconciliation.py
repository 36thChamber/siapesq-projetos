import unittest
from unittest.mock import Mock
from alert_reconciliation import reconcile_alerts, ReconciliationError, _timestamp


def row(**kw):
    result = dict(id_reservatorio=541, data_alerta='2026-11-05', tipo='NDVI',
                  id_area_alerta=7, nivel_critico='red', hora_alerta='2026-11-10')
    result.update(kw)
    return result


def response(rows, total=None):
    return Mock(status_code=200, json=Mock(return_value={
        'alertas': rows, 'total': len(rows) if total is None else total}))


class ReconciliationTests(unittest.TestCase):
    def run_transport(self, t, rows=None, **kw):
        return reconcile_alerts('https://api.example.test',
            'v1/phytoBloom/alertas/bulk', 'test-key', [row()] if rows is None else rows, t, **kw)

    def test_existing(self):
        t = Mock(); t.get.return_value = response([row(id=1, data_alerta='2026-11-05T00:00:00.000Z')])
        result = self.run_transport(t)
        self.assertEqual(result['record_ids'], ['1']); t.post.assert_not_called()

    def test_new_confirmed(self):
        t = Mock(); t.get.side_effect = [response([]), response([row(id=2)])]
        t.post.return_value = Mock(status_code=200)
        self.assertTrue(self.run_transport(t)['posted']); t.post.assert_called_once()

    def test_empty(self):
        t = Mock(); self.assertEqual(self.run_transport(t, [])['record_ids'], [])
        t.get.assert_not_called(); t.post.assert_not_called()

    def test_conflicting_and_partial_groups(self):
        for expected in ([row()], [row(), row(nivel_critico='yellow')]):
            t = Mock(); t.get.return_value = response([row(id=1, nivel_critico='yellow')])
            with self.assertRaises(ReconciliationError): self.run_transport(t, expected)
            t.post.assert_not_called()

    def test_ambiguous_readback(self):
        t = Mock(); t.get.side_effect = [response([]), TimeoutError('read')]
        t.post.return_value = Mock(status_code=200)
        with self.assertRaises(TimeoutError): self.run_transport(t)
        t.post.assert_called_once()

    def test_ambiguous_write(self):
        t = Mock(); t.get.return_value = response([]); t.post.side_effect = TimeoutError('write')
        with self.assertRaises(TimeoutError): self.run_transport(t)
        t.post.assert_called_once()

    def test_pagination(self):
        t = Mock(); t.get.side_effect = [response([row(id=1, id_reservatorio=542)], 2), response([row(id=2)], 2)]
        self.assertEqual(self.run_transport(t, page_size=1)['record_ids'], ['2'])
        self.assertEqual(t.get.call_args.kwargs['params']['offset'], 1)
        t.post.assert_not_called()

    def test_repeated_page_rejected(self):
        t = Mock(); t.get.return_value = response([row(id=1)], 2)
        with self.assertRaises(ReconciliationError): self.run_transport(t, page_size=1)
        t.post.assert_not_called()

    def test_scope(self):
        for rows in ([row(), row(id_reservatorio=542)], [row(id_reservatorio=99)]):
            t = Mock()
            with self.assertRaises(ReconciliationError): self.run_transport(t, rows)
            t.get.assert_not_called(); t.post.assert_not_called()

    def test_timestamp(self):
        self.assertEqual(_timestamp('2026-11-05'), _timestamp('2026-11-04T21:00:00-03:00'))
        self.assertNotEqual(_timestamp('2026-11-05'), _timestamp('2026-11-05T01:00:00Z'))

    def test_uri(self):
        t = Mock()
        with self.assertRaises(ReconciliationError):
            reconcile_alerts('https://api.example.test/?secret=1', 'v1/phytoBloom/alertas/bulk', 'key', [row()], t)
        t.get.assert_not_called()

    def test_distinct_missing_group_only(self):
        t = Mock(); existing = row(id=1)
        new = row(id_area_alerta=8)
        t.get.side_effect = [response([existing]), response([existing, dict(new, id=2)])]
        t.post.return_value = Mock(status_code=200)
        self.run_transport(t, [row(), new])
        self.assertEqual(t.post.call_args.kwargs['json'], {'alertas': [new]})


if __name__ == '__main__': unittest.main()
