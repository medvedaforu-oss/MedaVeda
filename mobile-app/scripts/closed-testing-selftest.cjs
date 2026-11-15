const {spawnSync}=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const suites=[
 'android-release','auth-recovery','login-network','login-submit','auth-state-race','deep-link',
 'course-state-race','course-year-selection','course-year-confirmation','course-year-picker-race',
 'notes-open','notes-entitlement','pdf-lifecycle','pdf-remote-retry','offline-owner','offline-download','download-actions',
 'purchases','purchases-unavailable-ui','release-payments-disabled',
 'quiz-editing','quiz-input','quiz-hooks','navigation-lazy','route-validation','load-resource','list-states',
 'video-data','video-link','video-tap',
];
let failed=0;
for(const suite of suites){
 const script=`mobile-app/scripts/${suite}-selftest.cjs`;
 const result=spawnSync(process.execPath,[script],{cwd:root,encoding:'utf8',timeout:60_000});
 const passed=result.status===0&&!result.error;
 process.stdout.write(`\n${suite}: ${passed?'PASS':'FAIL'}\n${result.stdout||''}${result.stderr||''}${result.error?.message||''}`);
 if(!passed)failed++;
}
console.log(`\n${suites.length-failed}/${suites.length} closed-testing suites passed`);
process.exitCode=failed?1:0;
