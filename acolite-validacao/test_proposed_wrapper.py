"""Exercise sandbox copies of the proposed wrapper, never production paths."""
import json
from pathlib import Path
import os
import subprocess
import tempfile

root=Path(__file__).resolve().parent
base=Path(tempfile.mkdtemp(prefix='wrapper-test-',dir=root))
repo=base/'repo'
(repo/'venv'/'bin').mkdir(parents=True)
python=repo/'venv'/'bin'/'python'
python.write_text('#!/bin/sh\nexit 99\n')
python.chmod(0o700)
(repo/'publication.py').write_text('# stub marker\n')
stub=repo/'run.sh'
stub.write_text('#!/bin/bash\nprintf "%s\\n" "$@" > "$TEST_ARGUMENTS"\nexit "$TEST_EXIT"\n')
marker=base/'production-enabled'
source=(root/'run-acolite-daily.PROPOSED.sh').read_text()
source=source.replace('/workspace/acolite_application',str(repo))
source=source.replace('/workspace/.local/state/acolite',str(base/'state'))
source=source.replace('/workspace/.config/acolite/production-enabled',str(marker))
wrapper=base/'wrapper.sh'
wrapper.write_text(source)
env=dict(os.environ,TEST_ARGUMENTS=str(base/'args.txt'),TEST_EXIT='0')
assert subprocess.run(['bash','-n',str(wrapper)]).returncode==0
assert subprocess.run(['bash',str(wrapper)],env=env,capture_output=True).returncode==1
assert not (base/'args.txt').exists()
marker.touch()
for code in (0,2,1):
    env['TEST_EXIT']=str(code)
    result=subprocess.run(['bash',str(wrapper)],env=env,capture_output=True)
    assert result.returncode==code
    assert (base/'args.txt').read_text().splitlines()==['165','541','542']
result={'only_ids':[165,541,542],'propagated_exit_codes':[0,2,1],'disabled_gate_passed':True,
        'sandbox':str(base),'syntax_passed':True}
(root/'wrapper-local-tests.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result))
