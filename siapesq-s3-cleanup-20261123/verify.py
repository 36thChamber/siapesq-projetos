import json
import sys
from inventory import file, summary, BACK, TIF, STE, current_target, oldyear

before, after = [json.loads(file(s).read_text()) for s in ('before','after')]
assert set(before) == set(after)
def should_remove(name, row):
    if name == TIF:
        return row[5] or not row[2] or current_target(row[0])
    if name == STE:
        return oldyear(row[0])
    if name == BACK and sys.argv[1:] == ['backup']:
        return row[5] or not row[2]
    return False
totals = []
for name in sorted(before):
    old = before[name]
    new = after[name]
    assert {tuple(r) for r in new['objects']} == {tuple(r) for r in old['objects'] if not should_remove(name,r)},name
    assert new['uploads'] == old['uploads'] and new['versioning'] == old['versioning'],name
    print(name,summary(new))
for inventory in (before,after):
    items=[summary(x) for x in inventory.values()]
    totals.append({k:sum(i[k] for i in items) for k in items[0]})
print('before and after',totals)
for prefix in ('predictors/', 'models/'):
    items=[r for r in before[TIF]['objects'] if r[2] and not r[5] and r[0].startswith(prefix)]
    print(prefix,len(items),sum(i[3] for i in items))
items=[r for r in before[STE]['objects'] if oldyear(r[0])]
print('years files & bytes',sum(not (r[0].endswith('/') and not r[3]) for r in items),sum(r[3] for r in items))
print('removed bytes',sum(totals[0][k]-totals[1][k] for k in ('current','old','multipart')))
print('combined after',sum(totals[1][k] for k in ('current','old','multipart')))
