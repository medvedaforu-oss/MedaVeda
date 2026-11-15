const assert = require('node:assert/strict');
const { load, tick } = require('./ui-harness.cjs');
const deferred = () => { let resolve; const promise = new Promise(r => resolve = r); return { promise, resolve }; };
function fixture() {
 let user = 'A', token = 'ExponentPushToken[synthetic_123456]', permission, refresh, resume;
 const writes = [], deletes = [], order = [];
 const notifications = {
  AndroidImportance: { DEFAULT: 3 },
  setNotificationChannelAsync: async () => { order.push('channel'); },
  getPermissionsAsync: async () => { order.push('permission'); return permission ? permission.promise : {status:'granted'}; },
  requestPermissionsAsync: async () => ({status:'granted'}),
  getExpoPushTokenAsync: async () => ({data:token}),
  addPushTokenListener: cb => { refresh = cb; return {remove(){}}; },
 };
 const session = () => ({data:{session:user ? {user:{id:user},access_token:'auth-'+user} : null}});
 const query = (operation, payload) => {
  const filters = {}; let authorization;
  return {eq(k,v){filters[k]=v;return this;},abortSignal(){return this;},setHeader(k,v){assert.equal(k,'Authorization');authorization=v;return this;},
   then(resolve,reject){return Promise.resolve().then(()=>{(operation==='write'?writes:deletes).push({payload,filters,authorization});return {error:null};}).then(resolve,reject);}};
 };
 const api = load('mobile-app/src/services/pushNotifications.ts', {
  'react-native': {Platform:{OS:'android'},AppState:{addEventListener:(_,cb)=>{resume=cb;return {remove(){}};}}},
  'expo-constants': {__esModule:true,default:{executionEnvironment:'standalone',expoConfig:{extra:{eas:{projectId:'fixture-project'}}}},ExecutionEnvironment:{StoreClient:'store'}},
  'expo-notifications':notifications,
  '../config/supabase':{supabase:{auth:{getSession:async()=>session()},rpc:(_,payload)=>query('write',payload),from:()=>({delete:()=>query('delete')})}},
  '../utils/logger':{logDebug(){},logError:console.error},
 });
 return {api,writes,deletes,order,setUser(v){user=v;api.setPushNotificationUser?.(v?{id:v}:null);},delayPermission(){permission=deferred();return permission;},refresh(){refresh({type:'fcm',data:'native-refresh'});},resume(s){resume(s);},setToken(v){token=v;}};
}
(async()=>{
 let f=fixture(); f.setUser('A');
 const gate=f.delayPermission(), pending=f.api.registerForPushNotifications({id:'A'});
 await tick(); f.setUser('B');gate.resolve({status:'granted'});assert.equal(await pending,null);assert.equal(f.writes.length,0,'A must not register under B');
 f=fixture();f.setUser('A');const gate2=f.delayPermission(),p=f.api.registerForPushNotifications({id:'A'});
 await tick();const logout=f.api.unregisterCurrentDeviceToken();f.setUser('A');f.setUser(null);gate2.resolve({status:'granted'});await Promise.all([p,logout]);assert.equal(f.writes.length,0,'logout cancels registration');
 f=fixture();f.setUser('A');await f.api.registerForPushNotifications({id:'A'});
 assert.equal(f.writes[0].authorization,'Bearer auth-A');assert.ok(f.order.indexOf('channel')<f.order.indexOf('permission'),'Android channel precedes permission request');
 f.setToken('ExponentPushToken[refreshed_123456]');f.refresh();await tick();await tick();assert.equal(f.writes.at(-1).payload.p_token,'ExponentPushToken[refreshed_123456]');
 f.setUser('B');await f.api.registerForPushNotifications({id:'B'});assert.equal(f.writes.at(-1).authorization,'Bearer auth-B');
 f.resume('background');await tick();const count=f.writes.length;f.resume('active');await tick();await tick();assert.ok(f.writes.length>count);
 await f.api.unregisterCurrentDeviceToken();assert.equal(f.deletes.at(-1).filters.user_id,'B');assert.equal(f.deletes.at(-1).authorization,'Bearer auth-B');
 f.refresh();await tick();assert.equal(f.writes.at(-1).authorization,'Bearer auth-B');
 f=fixture();f.setUser('A');const refreshGate=f.delayPermission();const old=f.api.registerForPushNotifications({id:'A'});
 await tick();f.setToken('ExponentPushToken[race_refresh_123456]');f.refresh();refreshGate.resolve({status:'granted'});await old;await tick();await tick();
 assert.equal(f.writes.length,1,'native refresh supersedes stale registration rather than losing refresh');assert.equal(f.writes[0].payload.p_token,'ExponentPushToken[race_refresh_123456]');
 f=fixture();f.setUser('A');const switchGate=f.delayPermission();const stale=f.api.registerForPushNotifications({id:'A'});await tick();f.setUser('B');f.setUser('A');switchGate.resolve({status:'granted'});await stale;assert.equal(f.writes.length,0,'A→B→A cannot revive stale work');
 console.log('PASS push owner pinning, A→B, logout cancellation, channel ordering, native token refresh, foreground retry and owner-filtered cleanup');
})().catch(e=>{console.error(e);process.exitCode=1;});
