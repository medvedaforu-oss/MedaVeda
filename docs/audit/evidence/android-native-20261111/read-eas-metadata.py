"""Read-only, metadata-only EAS audit. Never fetches key material or env values."""
from pathlib import Path
import datetime
import json
import subprocess

OUT = Path(__file__).resolve().parent
query = """query MedvedaNativeReadiness {
  app { byId(appId: "2d642c70-8ec1-4d7b-a388-2f2f99e8a8df") {
    id
    androidAppCredentials(filter: {applicationIdentifier: "in.medveda.app"}) {
      applicationIdentifier
      googleServiceAccountKeyForFcmV1 { id }
      androidAppBuildCredentialsList {
        name isDefault isLegacy
        androidKeystore { type sha256CertificateFingerprint updatedAt }
      }
    }
    environmentVariables(environment: "production") { name visibility type environments }
    ownerAccount {
      environmentVariables(environment: "production") { name visibility type environments }
    }
  } }
}"""
transport = r"""
const fs = require('fs'), os = require('os');
const fetch = require('/usr/local/lib/node_modules/eas-cli/build/fetch.js').default;
const auth = JSON.parse(fs.readFileSync(os.homedir() + '/.expo/state.json', 'utf8')).auth;
const headers = {'Content-Type':'application/json', ...(process.env.EXPO_TOKEN
  ? {authorization:'Bearer '+process.env.EXPO_TOKEN} : {'expo-session':auth.sessionSecret})};
fetch('https://api.expo.dev/graphql', {method:'POST', headers,
 body:fs.readFileSync(0, 'utf8'), timeout:40000})
 .then(r=>r.json()).then(r=>process.stdout.write(JSON.stringify(r)))
 .catch(e=>{process.stderr.write('Metadata transport failed: '+e.message);process.exitCode=1;});
"""
p = subprocess.run(["node", "-e", transport], input=json.dumps({"query": query}),
                   capture_output=True, text=True, timeout=50)
if p.returncode:
    print(p.stderr)
    raise SystemExit(p.returncode)
result = json.loads(p.stdout)
result["observed_at_utc"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
result["scope"] = "Metadata only; no keystore/password/alias, environment value, build or mutation requested."
(OUT / "eas-remote-metadata.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
raise SystemExit(bool(result.get("errors")))
