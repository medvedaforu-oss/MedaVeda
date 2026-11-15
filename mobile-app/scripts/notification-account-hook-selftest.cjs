const assert=require('node:assert/strict');
const {load,harness,tick}=require('./ui-harness.cjs');
(async()=>{
 const h=harness();let auth,respond;const calls=[];
 const routing=load('mobile-app/src/services/notificationRouting.ts',{});
 const hook=load('mobile-app/src/hooks/useNotificationRouting.ts',{
 react:h.react,'../config/supabase':{supabase:{auth:{getSession:async()=>({data:{session:{user:{id:'A'}}}}),onAuthStateChange:fn=>{auth=fn;return {data:{subscription:{unsubscribe(){}}}};}}}},
 '../services/notificationRouting':routing,'../services/pushNotifications':{setupNotificationResponseListener:fn=>{respond=fn;return()=>{};}},
 }).default;
 const nav={navigate:(screen)=>calls.push(screen)};
 const render=()=>h.render(()=>hook(nav,true,'Home'));
 const response=(id,screen)=>({notification:{request:{identifier:id,content:{data:{screen}}}}});
 render();await tick();render();respond(response('a','Store'));assert.equal(calls.at(-1),'Store');
 auth('SIGNED_IN',{user:{id:'B'}});respond(response('transition','Search'));assert.equal(calls.length,1);
 render();assert.equal(calls.at(-1),'Search');respond(response('b','Notifications'));assert.equal(calls.at(-1),'Notifications');
 auth('SIGNED_OUT',null);render();respond(response('logged-out','Home'));assert.equal(calls.at(-1),'Notifications');h.unmount();
 console.log('PASS notification hook invalidates navigation synchronously across account changes and re-enables routing for the next signed-in account');
})().catch(e=>{console.error(e);process.exitCode=1});
