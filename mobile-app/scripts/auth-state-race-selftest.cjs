const assert=require('node:assert/strict');
const {load,tick}=require('./ui-harness.cjs');
(async()=>{
 let auth,sessionResolve,signouts=0;const reads=[];
 const api=load('mobile-app/src/services/authState.ts',{
 '../config/supabase':{supabase:{auth:{getSession:()=>new Promise(r=>sessionResolve=r),onAuthStateChange:fn=>{auth=fn;},signOut:async()=>{signouts++;return {}; }},from:()=>({select(){return this;},eq(){return this;},maybeSingle:()=>new Promise(r=>reads.push(r))})}},
 '@react-native-async-storage/async-storage':{__esModule:true,default:{getItem:async()=>null,setItem:async()=>{},removeItem:async()=>{}}},
 './pushNotifications':{registerForPushNotifications(){},unregisterCurrentDeviceToken:async()=>{}},'../utils/logger':{logDebug(){}},'../utils/downloadManager':{clearAllDownloads:async()=>{}},
 });
 auth('SIGNED_IN',{user:{id:'old'}});auth('SIGNED_IN',{user:{id:'new'}});
 sessionResolve({data:{session:{user:{id:'bootstrap'}}}});reads[0]({data:{blocked:true}});reads[1]({data:{blocked:false}});await tick();
 assert.equal(api.getCurrentUser().id,'new');assert.equal(signouts,0);
 auth('TOKEN_REFRESHED',{user:{id:'new'}});reads[2]({data:{blocked:true}});await tick();assert.equal(signouts,1);
 console.log('PASS late initial session and blocked-account response cannot replace/sign out a newer account');
})().catch(e=>{console.error(e);process.exitCode=1;});
