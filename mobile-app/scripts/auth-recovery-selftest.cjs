const assert=require('node:assert/strict');
const {harness,load,jsx,nodes,tick}=require('./ui-harness.cjs');
(async()=>{
 // Startup rejects or returns an error: recovery is visible and retry routes only after session readiness.
 for(const mode of ['reject','error']){
  const h=harness();let fail=true,calls=0;const routes=[];const nav={replace:x=>routes.push(x)};
  const Screen=load('mobile-app/src/screens/auth/SplashScreen.tsx',{
   react:h.react,'react/jsx-runtime':jsx,'react-native':{View:'View',Text:'Text',StyleSheet:{create:x=>x},ActivityIndicator:'Spinner',Linking:{getInitialURL:async()=>null}},
   '../../config/supabase':{supabase:{auth:{getSession:async()=>{calls++;if(fail){if(mode==='reject')throw Error('offline');return {data:{session:null},error:Error('offline')};}return {data:{session:{user:{id:'student'}}}};}}}},
   '../../services/courseState':{resolvePostLoginRoute:async()=>'SelectCourseYear'},
   '../../features/question-papers/questionPaperLinks':require('../src/features/question-papers/questionPaperLinks.js'),
   '../../components/BrandLogo':{__esModule:true,default:'Logo'},'../../components/ErrorState':{__esModule:true,default:'Error'},
   '../../theme/colors':{COLORS:{}},'../../theme/spacing':{SPACING:{}},
  },{setTimeout:fn=>{fn();return 1;}}).default;
  const render=()=>nodes(h.render(()=>Screen({navigation:nav})));
  render();await tick();let tree=render();assert.equal(routes.length,0);assert.ok(tree.some(n=>n.type==='Error'));
  fail=false;tree.find(n=>n.type==='Error').props.onRetry();render();await tick();assert.deepEqual(routes,['SelectCourseYear']);assert.equal(calls,2);h.unmount();
 }
 // Cold launches wait for auth readiness and preserve recovery/onboarding destinations.
 for(const [session,destination,url] of [[null,'Login',null],[{user:{id:'student'}},'Home',null],[{user:{id:'student'}},'SelectCourseYear',null],[null,'ResetPassword','medveda://reset-password#type=recovery']]){
  const h=harness();let ready,profileReads=0;const routes=[];const nav={replace:r=>routes.push(r)};
  const Screen=load('mobile-app/src/screens/auth/SplashScreen.tsx',{
   react:h.react,'react/jsx-runtime':jsx,'react-native':{View:'View',Text:'Text',StyleSheet:{create:x=>x},ActivityIndicator:'Spinner',Linking:{getInitialURL:async()=>url}},
   '../../config/supabase':{supabase:{auth:{getSession:()=>new Promise(resolve=>{ready=resolve;})}}},
   '../../services/courseState':{resolvePostLoginRoute:async()=>{profileReads++;return destination;}},
   '../../features/question-papers/questionPaperLinks':require('../src/features/question-papers/questionPaperLinks.js'),
   '../../components/BrandLogo':{__esModule:true,default:'Logo'},'../../components/ErrorState':{__esModule:true,default:'Error'},
   '../../theme/colors':{COLORS:{}},'../../theme/spacing':{SPACING:{}},
  },{setTimeout:fn=>{fn();return 1;}}).default;
  h.render(()=>Screen({navigation:nav}));await tick();assert.deepEqual(routes,[]);assert.equal(profileReads,0);
  ready({data:{session},error:null});await tick();assert.deepEqual(routes,[destination]);
  assert.equal(profileReads,destination==='Home'||destination==='SelectCourseYear'?1:0);h.unmount();
 }
 // A transport abort, rather than a Promise.race, cancels the request; non-auth traffic retains its caller's signal.
 let timeout,aborted=false,clears=0,observed;
 const {authFetch}=load('mobile-app/src/features/auth/authFetch.ts',{}, {
  URL,AbortController,Response,fetch:(_,init)=>{observed=init;return new Promise((resolve,reject)=>{init.signal?.addEventListener('abort',()=>{aborted=true;reject(Error('abort'));});});},
  setTimeout:fn=>{timeout=fn;return 1;},clearTimeout:()=>clears++,
 });
 const request=authFetch('https://fixture.invalid/auth/v1/token',{method:'POST'});timeout();await assert.rejects(request);assert.ok(aborted);assert.equal(clears,1);
 const upstream=new AbortController();const pending=authFetch('https://fixture.invalid/functions/v1/login-with-mobile',{signal:upstream.signal});upstream.abort();await assert.rejects(pending);
 const pass=new AbortController();void authFetch('https://fixture.invalid/rest/v1/notes',{signal:pass.signal}).catch(()=>{});assert.equal(observed.signal,pass.signal);pass.abort();await tick();
 // A slow body after successful headers is also cancelled before the session can be parsed.
 let bodyTimer;
 const slowBody=load('mobile-app/src/features/auth/authFetch.ts',{}, {
  URL,AbortController,Response,
  fetch:async(_,init)=>({status:200,statusText:'OK',headers:new Headers(),text:()=>new Promise((resolve,reject)=>init.signal.addEventListener('abort',()=>reject(Error('body aborted'))))}),
  setTimeout:fn=>{bodyTimer=fn;return 1;},clearTimeout(){},
 }).authFetch;
 const body=slowBody('https://fixture.invalid/auth/v1/token');await tick();bodyTimer();await assert.rejects(body);
 const success=load('mobile-app/src/features/auth/authFetch.ts',{}, {URL,AbortController,Response,
  fetch:async()=>Response.json({fixture:true}),setTimeout:()=>1,clearTimeout(){},
 }).authFetch;
 assert.deepEqual(await (await success('https://fixture.invalid/auth/v1/token')).json(),{fixture:true});
 // Exercise the real Supabase response parser through the production transport wrapper.
 const {createClient}=require('../node_modules/@supabase/supabase-js');
 let rejected=false;
 const transport=load('mobile-app/src/features/auth/authFetch.ts',{}, {URL,AbortController,Response,
  fetch:async(input,init)=>{
   assert.match(String(input),/auth\/v1\/token/);assert.equal(JSON.parse(init.body).email,'fixture@example.invalid');
   return rejected?Response.json({code:'invalid_credentials',msg:'Invalid credentials'},{status:400,headers:{'X-Supabase-Api-Version':'2024-01-01'}}):Response.json({
    access_token:'synthetic-access-token',refresh_token:'synthetic-refresh-token',token_type:'bearer',expires_in:3600,
    user:{id:'fixture-student',aud:'authenticated',email:'fixture@example.invalid'},
   });
  },setTimeout:()=>1,clearTimeout(){},
 }).authFetch;
 const client=createClient('https://auth.test','fixture-publishable-key',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:transport}});
 const signedIn=await client.auth.signInWithPassword({email:'fixture@example.invalid',password:'fixture'});
 assert.equal(signedIn.error,null);assert.equal(signedIn.data.user.id,'fixture-student');
 rejected=true;
 const denied=await client.auth.signInWithPassword({email:'fixture@example.invalid',password:'fixture'});
 assert.equal(denied.error.code,'invalid_credentials');
 console.log('PASS startup rejection/error → visible retry → onboarding; auth transport timeout/caller cancellation; content transport unchanged');
})().catch(e=>{console.error(e);process.exitCode=1;});
