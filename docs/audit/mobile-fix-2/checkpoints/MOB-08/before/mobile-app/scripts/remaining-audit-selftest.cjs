const assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
const {harness,load,jsx,nodes,tick}=require('./ui-harness.cjs');
const tests={};
const storageMock=s=>({__esModule:true,default:s});
const themes=Object.fromEntries(['colors','fonts','typography','spacing','radius','shadows'].map(n=>['../../theme/'+n,{COLORS:{},FONT:{},SPACING:{},RADIUS:{},SHADOW:{}}]));
const native={View:'View',Text:'Text',ScrollView:'ScrollView',Switch:'Switch',TouchableOpacity:'Button',ActivityIndicator:'Spinner',Platform:{OS:'android'},StyleSheet:{create:x=>x},Alert:{alert(){}},Linking:{openURL:async()=>{throw Error('offline')}}};
tests['AUD-007']=async()=>{
 const blobs=new Map(),keys=new Map();let fail=false,keyFail=false,afterCommit=false,removeFailure=false;
 const storage={getItem:async k=>blobs.get(k)||null,setItem:async(k,v)=>{if(fail)throw Error('disk full');blobs.set(k,v);if(afterCommit)throw Error('ambiguous disk acknowledgement')},removeItem:async k=>{if(removeFailure)throw Error('disk');blobs.delete(k)}};
 const mocks={'react-native-get-random-values':{},'aes-js':require('../node_modules/aes-js'),'react-native':native,'expo-secure-store':{getItemAsync:async k=>keys.get(k)||null,setItemAsync:async(k,v)=>{if(keyFail)throw Error('locked');keys.set(k,v)},deleteItemAsync:async k=>keys.delete(k)},'@react-native-async-storage/async-storage':storageMock(storage)};
 const reopen=()=>load('mobile-app/src/config/secureSessionStorage.ts',mocks,{crypto:webcrypto,Uint8Array}).secureSessionStorage;
 const adapter=reopen();const old=JSON.stringify({refresh_token:'synthetic-old'}),next=JSON.stringify({refresh_token:'synthetic-new'});
 await adapter.setItem('session',old);fail=true;await assert.rejects(adapter.setItem('session',next));fail=false;
 assert.equal(await reopen().getItem('session'),old,'failed blob publication must preserve previous key/blob');
 keyFail=true;await assert.rejects(adapter.setItem('session',next));keyFail=false;assert.equal(await reopen().getItem('session'),old);
 await Promise.all([adapter.setItem('session',old),adapter.setItem('session',next)]);assert.equal(await reopen().getItem('session'),next);
 afterCommit=true;await assert.rejects(adapter.setItem('session',old));afterCommit=false;assert.equal(await reopen().getItem('session'),old,'ambiguous commit retains its generation key');
 removeFailure=true;await assert.rejects(adapter.removeItem('session'));removeFailure=false;assert.equal(await reopen().getItem('session'),old,'failed remove preserves valid publication');
 await adapter.removeItem('session');assert.equal(await reopen().getItem('session'),null);
 // Previous installed format remains readable until successful generation publication.
 const aes=require('../node_modules/aes-js'),key=webcrypto.getRandomValues(new Uint8Array(32));keys.set('secure-legacy',aes.utils.hex.fromBytes(key));
 blobs.set('legacy',aes.utils.hex.fromBytes(new aes.ModeOfOperation.ctr(key,new aes.Counter(1)).encrypt(aes.utils.utf8.toBytes(old))));
 assert.equal(await reopen().getItem('legacy'),old);await adapter.setItem('legacy',next);assert.equal(await reopen().getItem('legacy'),next);
};
tests['AUD-004']=async()=>{
 const values=new Map();let failure=false;
 const prefs=load('mobile-app/src/utils/notificationPreferences.ts',{'@react-native-async-storage/async-storage':storageMock({getItem:async k=>values.get(k)||null,setItem:async(k,v)=>{await tick();if(failure)throw Error('disk');values.set(k,v)}})});
 await Promise.all([prefs.setNotificationPreference('new_notes',false),prefs.setNotificationPreference('offer',false)]);
 const result=await prefs.getNotificationPreferences();assert.equal(result.new_notes,false);assert.equal(result.offer,false);
 failure=true;await assert.rejects(prefs.setNotificationPreference('new_video',false));failure=false;
 await prefs.setNotificationPreference('app_update',false);assert.equal((await prefs.getNotificationPreferences()).new_video,true);
};
tests['AUD-001']=async()=>{
 for(const os of ['android','ios']){
 let trigger;
 const sdk={SchedulableTriggerInputTypes:{DAILY:'daily'},setNotificationHandler(){},getPermissionsAsync:async()=>({granted:true}),scheduleNotificationAsync:async r=>{trigger=r.trigger;return 'id'},cancelScheduledNotificationAsync:async()=>{}};
 const service=load('mobile-app/src/services/studyReminderService.ts',{'@react-native-async-storage/async-storage':storageMock({getItem:async()=>null,setItem:async()=>{}}),'react-native':{Platform:{OS:os}},'expo-constants':{default:{},ExecutionEnvironment:{StoreClient:'go'}},'expo-notifications':sdk,'./notificationRouting':{createNotificationPresentationGate:()=>()=>true},'../utils/logger':{logError(){}}});
 await service.enableStudyReminder(19,32);
 assert.equal(trigger.type,'daily',`${os} must select the SDK daily parser`);assert.equal(trigger.hour,19);assert.equal(trigger.minute,32);
 // Execute the installed SDK's actual trigger parser without loading native services.
 const fs=require('node:fs'),vm=require('node:vm'),ts=require('../node_modules/typescript');
 let source=fs.readFileSync(require.resolve('../node_modules/expo-notifications/src/scheduleNotificationAsync.ts'),'utf8');
 const mod={exports:{}};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:mod.exports,module:mod,require:id=>id==='expo-modules-core'?{Platform:{OS:os,select:map=>map[os]??map.default}}:id.includes('Notifications.types')?{SchedulableTriggerInputTypes:{...sdk.SchedulableTriggerInputTypes,DATE:'date',CALENDAR:'calendar',WEEKLY:'weekly',MONTHLY:'monthly',YEARLY:'yearly',TIME_INTERVAL:'timeInterval'}}:id==='./hasValidTriggerObject'?load('mobile-app/node_modules/expo-notifications/src/hasValidTriggerObject.ts',{}):{} });
 const parsed=mod.exports.parseTrigger(trigger);assert.equal(parsed.type,'daily');assert.equal(parsed.hour,19);assert.equal(parsed.minute,32);
 }
};
tests['AUD-002']=async()=>{
 const h=harness();let fail=true,readFailure=true;
 const screen=load('mobile-app/src/screens/reminder/StudyReminderScreen.tsx',{react:h.react,'react/jsx-runtime':jsx,'react-native':native,...themes,'@react-native-community/datetimepicker':{default:'Picker'},'../../services/studyReminderService':{isStudyReminderSupported:()=>true,getStudyReminderSettings:async()=>{if(readFailure)throw Error('read failed');return {enabled:false,hour:19,minute:0}},enableStudyReminder:async()=>{if(fail)throw Error('schedule rejected');return {success:true}},disableStudyReminder:async()=>{throw Error('cancel rejected')}}}).default;
 const render=()=>nodes(h.render(screen));render();await tick();
 const retry=render().find(n=>n.props?.accessibilityLabel==='Retry reminder settings');assert.ok(retry,'failed initial settings read must offer retry');readFailure=false;await retry.props.onPress();await tick();
 await Promise.resolve(render().find(n=>n.type==='Switch').props.onValueChange(true)).catch(()=>{});
 assert.ok(render().find(n=>n.type==='Switch'),'rejected schedule must release busy UI');assert.equal(render().find(n=>n.type==='Switch').props.value,false);
 fail=false;await render().find(n=>n.type==='Switch').props.onValueChange(true);assert.equal(render().find(n=>n.type==='Switch').props.value,true);
 await Promise.resolve(render().find(n=>n.type==='Switch').props.onValueChange(false)).catch(()=>{});assert.equal(render().find(n=>n.type==='Switch').props.value,true);
};
tests['AUD-005']=async()=>{
 for(const outcome of ['reject','null']){
 const h=harness();let retry=false;
 const Screen=load('mobile-app/src/screens/referral/ReferralTermsScreen.tsx',{react:h.react,'react/jsx-runtime':jsx,'react-native':native,...themes,'@react-navigation/native':{useNavigation:()=>nav},'../../services/referralsService':{fetchReferralSettings:async()=>{if(retry)return {friendDiscountPercent:10,walletProductTypes:[]};if(outcome==='reject')throw Error('offline');return null},formatRupees:x=>String(x),walletProductsText:()=>''}}).default;
 const nav={goBack(){}};const render=()=>nodes(h.render(Screen));render();await tick();assert.ok(!render().some(n=>n.type==='Spinner'),outcome+' must finish loading');
 const button=render().find(n=>n.props?.accessibilityLabel==='Retry referral terms');assert.ok(button,'error must offer retry');retry=true;await button.props.onPress();await tick();assert.ok(render().some(n=>n.props?.children==='Referral terms'));
 }
};
tests['AUD-006']=async()=>{
 const h=harness(),prefs={NOTIFICATION_CATEGORIES:[{type:'offer',label:'Offers & Discounts'}],getNotificationPreferences:async()=>({offer:true})};
 const Screen=load('mobile-app/src/screens/notifications/NotificationPreferencesScreen.tsx',{react:h.react,'react/jsx-runtime':jsx,'react-native':native,...themes,'../../utils/notificationPreferences':prefs}).default;
 h.render(Screen);await tick();const sw=nodes(h.render(Screen)).find(n=>n.type==='Switch');assert.equal(sw.props.accessibilityLabel,'Offers & Discounts');
};
(async()=>{let failed=0;for(const [name,test]of Object.entries(tests)){if(process.argv[2]&&process.argv[2]!==name)continue;try{await test();console.log('PASS '+name)}catch(e){failed++;console.error('FAIL '+name,e.stack)}}process.exitCode=failed?1:0;})();
