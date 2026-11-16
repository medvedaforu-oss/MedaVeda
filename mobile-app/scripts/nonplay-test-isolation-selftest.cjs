// Actual mobile services/repositories, fake Auth/HTTP/storage. Never a payment.
const assert=require('node:assert/strict');
const {load,tick,harness,jsx}=require('./ui-harness.cjs');
const crypto=require('node:crypto').webcrypto;
const base='https://xbvenkfmesugrbjuufyw.supabase.co';
const pid='npt_product_d9520000-0000-4000-8000-000000000010';
const oid='d9520000-0000-4000-8000-000000000020';
const nid='npt_note_d9520000-0000-4000-8000-000000000030';
const chapter='npt_chapter_d9520000-0000-4000-8000-000000000040';
const flags={isNonplayTestBuild:true,paymentProvider:'razorpay'};
const stored=new Map(),calls=[];let uid='synthetic-user',liveReads=0;
const valid={keyId:'rzp_test_fixture',isLiveMode:false,razorpayOrderId:'order_fixture',internalOrderId:oid,amountPaise:4900,productTitle:'[TEST] Notes',verifyUrl:`${base}/functions/v1/verify-payment-nonplay-test`};
let transport=async()=>Response.json(valid);
const db={auth:{getSession:async()=>({data:{session:uid ? {user:{id:uid},access_token:'fixture-token'} : null}})}};
const casing=load('mobile-app/src/utils/caseConvert.ts',{});
function service() {return load('mobile-app/src/services/nonplayTestService.ts',{
 '@react-native-async-storage/async-storage':{__esModule:true,default:{getItem:async k=>stored.get(k),setItem:async(k,v)=>stored.set(k,v),removeItem:async k=>stored.delete(k)}},
 'expo-application':{applicationId:'in.medveda.razorpaytest',nativeApplicationVersion:'1.2.2'},
 '../config/supabase':{supabase:db},'../config/paymentProvider':flags,'../utils/caseConvert':casing,
},{crypto,process:{env:{EXPO_PUBLIC_SUPABASE_URL:base}},fetch:async(url,init)=>{
 assert.ok(['/create-order-nonplay-test','/verify-payment-nonplay-test','/nonplay-test-catalog','/get-note-url-nonplay-test'].some(s=>url===base+'/functions/v1'+s),url);
 assert.equal(init.headers['x-medveda-build-profile'],'razorpay-internal-test');
 assert.equal(init.headers['x-medveda-application-id'],'in.medveda.razorpaytest');
 assert.equal(init.headers['x-medveda-test-environment'],'production-isolated-razorpay-test-v1');
 assert.equal(init.headers.Authorization,'Bearer fixture-token');
 calls.push({url,init});return transport(url,init);
}});}
const plain=v=>JSON.parse(JSON.stringify(v));
(async()=>{
 let api=service(),finish;
 transport=async()=>new Promise(resolve=>{finish=()=>resolve(Response.json(valid));});
 const first=api.createTestOrder(pid),second=api.createTestOrder(pid);await tick();assert.equal(calls.length,1);finish();await Promise.all([first,second]);
 const key=calls[0].init.headers['idempotency-key'];assert.match(key,/^[a-f0-9-]{36}$/);
 transport=async()=>{throw Error('lost response');};await assert.rejects(api.createTestOrder(pid),/lost response/);
 api=service();transport=async()=>Response.json(valid);await api.createTestOrder(pid);assert.equal(calls.at(-1).init.headers['idempotency-key'],key,'restart/ambiguous retry changed key');
 let before=calls.length;
 await assert.rejects(api.createTestOrder('seed_product'));assert.equal(calls.length,before);
 for(const patch of [{keyId:'rzp_live_fixture'},{isLiveMode:true},{verifyUrl:`${base}/functions/v1/verify-payment`},{amountPaise:1},{internalOrderId:'bad'},{productTitle:'Real paid Notes'}]){
  transport=async()=>Response.json({...valid,...patch});await assert.rejects(api.createTestOrder(pid),/Invalid test checkout/);
 }
 transport=async()=>Response.json({error:'expired',code:'test_checkout_expired'},{status:409});await assert.rejects(api.createTestOrder(pid),/expired/);
 assert.equal(stored.size,0);transport=async()=>Response.json(valid);await api.createTestOrder(pid);assert.notEqual(calls.at(-1).init.headers['idempotency-key'],key);
 before=calls.length;await assert.rejects(api.verifyTestPayment(`${base}/functions/v1/verify-payment`,{}),/Invalid payment/);assert.equal(calls.length,before);
 transport=async()=>Response.json({success:false,pending:true});assert.equal((await api.verifyTestPayment(valid.verifyUrl,{internalOrderId:oid,recover:true})).pending,true);
 transport=async()=>{uid='other-user';return Response.json(valid);};await assert.rejects(api.createTestOrder(pid),/account changed/);uid='synthetic-user';
 console.log('PASS test service: dedicated routes/Auth, concurrent taps, durable owner-bound idempotency, expiry, malformed/live response rejection, pending and account-switch protection');

 const payment=load('mobile-app/src/services/paymentService.ts',{
  '../config/supabase':{supabase:db},'react-native':{Platform:{OS:'android'}},'expo-application':{},
  '../config/paymentProvider':flags,'./authState':{getCurrentUser:()=>uid ? {id:uid} : null},'./nonplayTestService':api,
 },{process:{env:{EXPO_PUBLIC_SUPABASE_URL:base}}});
 await assert.rejects(payment.purchaseProduct(pid,true));await assert.rejects(payment.purchaseProduct(pid,false,'play-choice'));
 transport=async()=>Response.json(valid);await payment.purchaseProduct(pid);
 transport=async()=>Response.json({success:false,pending:true});await payment.verifyPayment(valid.verifyUrl,{internalOrderId:oid});await payment.recoverPayment(valid.verifyUrl,oid);
 before=calls.length;
 const changedOwner=await payment.recoverPayment(valid.verifyUrl,oid,'original-buyer');
 assert.equal(changedOwner.authRequired,true,'isolated recovery must retain the original buyer');
 assert.equal(calls.length,before,'account change must stop recovery before HTTP');
 transport=async()=>{uid='other-user';return Response.json({success:true});};
 const switchedDuringRecovery=await payment.recoverPayment(valid.verifyUrl,oid,'synthetic-user');
 assert.equal(switchedDuringRecovery.success,false);
 assert.equal(switchedDuringRecovery.authRequired,true);
 uid='synthetic-user';
 console.log('PASS payment facade delegates test creation/verification/recovery and refuses wallet or Play choices');

 const catalog={products:[{id:pid,scope:'chapter',chapterId:chapter,courseId:'bams'}],chapters:[{id:chapter,subjectId:'seed_s'}],notes:[{id:nid,chapterId:chapter}],purchases:[{id:oid,status:'success',scope:'chapter',chapterId:chapter}]};
 const testApi={...api,testCatalog:async()=>catalog,EMPTY_TEST_CATALOG:{products:[],chapters:[],notes:[],purchases:[]}};
 const query={select(){return this;},eq(){return this;},then(fn){fn({data:[{id:'live-purchase',status:'success',scope:'chapter',chapter_id:'real_chapter'}],error:null});}};
 const mocks={'../config/paymentProvider':flags,'../utils/caseConvert':casing,'../services/nonplayTestService':testApi,
  '../config/supabase':{supabase:{from:t=>{liveReads++;assert.equal(t,'purchases');return query;}}}};
 const products=load('mobile-app/src/repositories/productsRepository.ts',mocks);
 assert.equal((await products.getAllActiveProducts())[0].id,pid);assert.equal((await products.getProductsByChapter(chapter))[0].id,pid);assert.equal((await products.getProductsBySubject('seed_s')).length,0);assert.equal(liveReads,0);
 const purchases=load('mobile-app/src/repositories/purchasesRepository.ts',mocks);const history=await purchases.getPurchasesByUser(uid);
 assert.equal(history.length,2);assert.ok(history.some(p=>p.id==='live-purchase'));assert.ok(history.some(p=>p.id===oid));
 const ordinaryPurchases=load('mobile-app/src/repositories/purchasesRepository.ts',{...mocks,'../config/paymentProvider':{isNonplayTestBuild:false}});
 assert.equal((await ordinaryPurchases.getPurchasesByUser(uid)).length,1);
 const scopes=load('mobile-app/src/services/purchasesService.ts',{'./authState':{},'../repositories/purchasesRepository':{}});
 assert.equal(scopes.isChapterUnlocked(catalog.purchases,{id:'real_chapter',subjectId:'seed_s',yearId:'seed_y'}),false);
 assert.equal(scopes.isChapterUnlocked(catalog.purchases,{id:chapter,subjectId:'seed_s',yearId:'seed_y'}),true);
 console.log('PASS repository isolation: only synthetic products can be bought; test history stays in test APK; prior production purchases remain readable; synthetic scopes cannot unlock real chapters');

 let normalNoteReads=0,testNoteReads=0;
 const secureMocks={'../config/paymentProvider':flags,'../config/supabase':{supabase:{functions:{invoke:async(name)=>{normalNoteReads++;assert.equal(name,'get-note-url');return {data:{url:'https://existing-purchased-note.invalid'},error:null};}}}},
  './nonplayTestService':{testNoteUrl:async()=>{testNoteReads++;return 'https://synthetic.invalid';}}};
 const secure=load('mobile-app/src/services/secureNotesService.ts',secureMocks);
 await secure.getSecureNoteUrl(nid);assert.equal(normalNoteReads,0);assert.equal(testNoteReads,1);
 await secure.getSecureNoteUrl('real-note');assert.equal(normalNoteReads,1);
 const ordinary=load('mobile-app/src/services/secureNotesService.ts',{...secureMocks,'../config/paymentProvider':{isNonplayTestBuild:false}});
 await assert.rejects(ordinary.getSecureNoteUrl(nid));assert.equal(testNoteReads,1);
 assert.deepEqual(plain(catalog.products[0]).chapterId,chapter);
 console.log('PASS Notes service: synthetic IDs require the test route/build; existing purchased Notes retain the normal protected route; no fallback');
 for(const buildTest of [true,false]) for(const granted of [true,false]) {
  const h=harness();let liveProofReads=0,testProofReads=0;
  const proof={title:'[TEST] Verified Notes',amount:49,orderId:oid};
  const proofDb={auth:{getUser:async()=>({data:{user:{id:uid}}})},from:table=>{
   liveProofReads++;
   const q={select(){return this;},eq(){return this;},maybeSingle:async()=>({data:table==='orders'?{status:granted?'paid':'created',amount:49}:{product_title:'Live Notes',amount:49},error:null})};return q;
  }};
  const screenMocks={react:h.react,'react/jsx-runtime':jsx,
   'react-native':{View:'View',Text:'Text',TouchableOpacity:'Button',ActivityIndicator:'Spinner',StyleSheet:{create:x=>x}},
   '@react-navigation/native':{useRoute:()=>({params:{orderId:oid,title:'forged route title',amount:1}}),useNavigation:()=>({})},
   '../../config/supabase':{supabase:proofDb},'../../config/paymentProvider':{isNonplayTestBuild:buildTest},
   '../../services/authState':{getCurrentUser:()=>({id:uid}),subscribeAuthUser:()=>()=>{}},
   '../../services/nonplayTestService':{confirmedTestPurchase:async()=>{testProofReads++;return granted?proof:null;}}};
  for(const [file,key] of [['colors','COLORS'],['fonts','FONT'],['spacing','SPACING'],['radius','RADIUS'],['shadows','SHADOW']])screenMocks['../../theme/'+file]={[key]:{}};
  const Screen=load('mobile-app/src/screens/payment/PaymentSuccessScreen.tsx',screenMocks).default;
  h.render(Screen);await tick();const view=JSON.stringify(h.render(Screen));
  assert.equal(view.includes('Payment Successful!'),granted);
  assert.equal(testProofReads,buildTest?1:0);assert.equal(liveProofReads>0,!buildTest);
  assert.equal(view.includes('forged route title'),false);h.unmount();
 }
 console.log('PASS success screen uses isolated server proof in the test APK, retains live proof elsewhere, and never trusts route success fields');

})().catch(e=>{console.error(e);process.exitCode=1;});
