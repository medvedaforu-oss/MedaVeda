// Preserve the Node entrypoint while running actual pinned PDF parsing in Deno.
const {execFileSync}=require('node:child_process');
const path=require('node:path');
execFileSync('deno',['test','--cached-only','--config',path.resolve(__dirname,'../deno.json'),path.join(__dirname,'question-paper-access-test.ts')],{stdio:'inherit'});
