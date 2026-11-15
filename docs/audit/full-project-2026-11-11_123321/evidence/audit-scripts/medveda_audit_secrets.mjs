import {scanSecrets} from '/home/ganeshp8545/AyurPulse/scripts/scan-secrets.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
const root='/home/ganeshp8545/AyurPulse/';const out=readFileSync('/tmp/medveda-current-audit','utf8');
const inventory=JSON.parse(readFileSync(out+'/evidence/initial-files.json','utf8'));let findings=[];let scanned=0;
for (const row of inventory){if(row.path.startsWith('docs/audit/')||row.path.includes('/build/')||row.path.endsWith('.lock'))continue;let s=readFileSync(root+row.path,'utf8');scanned++;for(const f of scanSecrets(s))findings.push({path:row.path,...f});}
writeFileSync(out+'/evidence/secret-scan.json',JSON.stringify({scanned,findings,limitation:'Pattern scan; excludes previous evidence, binary/build outputs and lock files. Not a complete history or entropy scan.'},null,2));console.log(JSON.stringify({scanned,findings}));
