// Use ONLY the App signing key certificate downloaded from Play Console > App integrity > App signing.
// The EAS/upload key does not establish the signer of a Google Play installation.
// node website/scripts/configure-assetlinks.mjs --play-signing-certificate /path/deployment_cert.der
// Repeat certificate arguments only for additional verified Play signing keys (e.g. key rotation).
import { X509Certificate } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const output = fileURLToPath(new URL('../.well-known/assetlinks.json', import.meta.url));
const args = process.argv.slice(2);
if (!args.length || (args.length === 1 && args[0] === '--check')) {
  const entries = JSON.parse(readFileSync(output, 'utf8'));
  if (!entries.length) {
    console.error('OWNER REQUIRED: download the Google Play App Signing certificate for in.medveda.app from Play Console > App integrity > App signing, then run this script with --play-signing-certificate. Do not use the EAS/upload certificate.');
    process.exitCode = 2;
  } else {
    if (entries.length !== 1 || entries[0].target?.namespace !== 'android_app' || entries[0].target?.package_name !== 'in.medveda.app' ||
        JSON.stringify(entries[0].relation) !== JSON.stringify(['delegate_permission/common.handle_all_urls']) ||
        !entries[0].target.sha256_cert_fingerprints?.length ||
        !entries[0].target.sha256_cert_fingerprints.every(f => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(f))) throw new Error('Invalid Digital Asset Links configuration.');
    console.log('Digital Asset Links JSON valid. Certificate provenance and deployed domain verification require owner verification.');
  }
} else {
  const fingerprints = [];
  while (args.length) {
    if (args.shift() !== '--play-signing-certificate' || !args.length) throw new Error('Expected --play-signing-certificate /path/to/Play-App-Signing-certificate.der');
    const certificate = new X509Certificate(readFileSync(args.shift()));
    fingerprints.push(certificate.fingerprint256);
  }
  writeFileSync(output, JSON.stringify([{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: { namespace: 'android_app', package_name: 'in.medveda.app', sha256_cert_fingerprints: [...new Set(fingerprints)] },
  }], null, 2) + '\n');
  console.log('Configured certificate SHA-256 fingerprints:', ...fingerprints);
  console.log('Confirm these match Play Console App signing key certificates, then deploy the website through the normal owner workflow.');
}
