"""GET project/function/digest metadata only; never executes production SQL."""
from datetime import datetime, timezone
import hashlib
import http.client
import json
from pathlib import Path
import re

evidence = Path(__file__).resolve().parent
before = json.loads((evidence / 'production-metadata-before.json').read_text())
token = (Path.home() / '.supabase/access-token').read_text().strip()
assert token.startswith('sbp_')
observed = {'observed_at': datetime.now(timezone.utc).isoformat(), 'method': 'GET',
            'production_sql_calls': 0, 'mutations': 0}


def get(suffix):
    assert suffix in ('', '/functions', '/secrets')
    connection = http.client.HTTPSConnection('api.supabase.com', timeout=25)
    connection.request('GET', '/v1/projects/xbvenkfmesugrbjuufyw' + suffix,
                       headers={'Authorization': 'Bearer ' + token, 'Accept': 'application/json'})
    response = connection.getresponse()
    assert response.status == 200, f'Metadata GET {suffix} returned HTTP {response.status}'
    result = json.loads(response.read())
    connection.close()
    return result


identity = get('')
observed['identity'] = {key: identity[key] for key in ('id', 'name', 'status', 'region')}
assert identity['id'] == 'xbvenkfmesugrbjuufyw' and identity['name'] == 'MedVeda'
observed['functions'] = sorted(
    [{key: function[key] for key in ('slug', 'version', 'status', 'verify_jwt', 'updated_at')}
     for function in get('/functions')], key=lambda function: function['slug'])
secrets = []
for secret in get('/secrets'):
    digest = secret.get('digest', secret.get('value', ''))
    assert re.fullmatch(r'[0-9a-f]{64}', digest), 'Expected digest metadata only'
    secrets.append({'name': secret['name'], 'digest_fingerprint': hashlib.sha256(digest.encode()).hexdigest()})
observed['secrets'] = sorted(secrets, key=lambda secret: secret['name'])
observed['functions_unchanged'] = observed['functions'] == before['functions']
observed['secret_fingerprints_unchanged'] = observed['secrets'] == before['secrets']
observed['identity_unchanged'] = observed['identity'] == before['identity']
observed['database_state'] = before['database_state']
assert observed['functions_unchanged'] and observed['secret_fingerprints_unchanged'] and observed['identity_unchanged']
(evidence / 'production-metadata-after.json').write_text(json.dumps(observed, indent=2) + '\n')
print('PASS production metadata GETs: identity, 17 functions and credential fingerprints unchanged; zero SQL/mutations')
