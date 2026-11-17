const assert = require('node:assert/strict');
const { load, harness, jsx, nodes, tick } = require('./ui-harness.cjs');
const sha = require('../node_modules/js-sha256');
const plain = x => JSON.parse(JSON.stringify(x));
const uid='buyer', oid='11111111-1111-4111-8111-111111111111';
async function billing(enabled) {
 let updated, chosen, errored, config, nativeRequests=0, verify=0, switchOnSave=false;
 const stored=new Map(), events=[];let serverOrders=[];
 const iap={
  initConnection:async c=>{config=c;return true;},
  purchaseUpdatedListener:fn=>{updated=fn;return {remove(){}};},
  purchaseErrorListener:fn=>{errored=fn;return {remove(){}};},
  userChoiceBillingListenerAndroid:fn=>{chosen=fn;return {remove(){}};},
  requestPurchase:async()=>{nativeRequests++;},getAvailablePurchases:async()=>[],
 };
 let user=uid;
 const service=load('mobile-app/src/services/playBillingService.ts',{
  '@react-native-async-storage/async-storage':{__esModule:true,default:{getItem:async k=>stored.get(k),setItem:async(k,v)=>{stored.set(k,v);if(switchOnSave)user='stranger';},removeItem:async k=>stored.delete(k)}},
  'react-native':{Platform:{OS:'android'}},'js-sha256':sha,
  'expo-application':{applicationId:'in.medveda.app',nativeApplicationVersion:'1.2.2'},
  '../config/paymentProvider':{userChoiceBillingEnabled:enabled}, './authState':{getCurrentUser:()=>({id:user}),getAuthEpoch:()=>0},
  '../config/supabase':{supabase:{auth:{getSession:async()=>({data:{session:{user:{id:user},access_token:'fixture'}}})}}},
  '../repositories/ordersRepository':{getOrdersByUser:async()=>serverOrders},'./playOfferSelection':{},'expo-iap':iap,
 },{process:{env:{EXPO_PUBLIC_SUPABASE_URL:'https://fixture.invalid'}},fetch:async(_url,options)=>{
  assert.equal(options.headers['x-medveda-application-id'],'in.medveda.app');
  assert.equal(options.headers['x-medveda-app-version'],'1.2.2');
  verify++;return Response.json({success:true});}});
 service.subscribePlayBilling(e=>events.push(e));
 const attempt={userId:uid,internalOrderId:oid,playSku:'price_500',productId:'notes-A',productTitle:'Notes A',choiceContext:{buyerState:'KERALA',useWallet:true}};
 if (!enabled) {
  await assert.rejects(service.createPlayOrder('notes-A'), /Standalone Google Play purchases/);
  await assert.rejects(service.fetchMatchingPlayProduct('price_500', 5), /Standalone Google Play purchases/);
  await assert.rejects(service.startPlayPurchase(attempt,'offer'), /Standalone Google Play purchases/);
  assert.equal(nativeRequests,0); assert.equal(verify,0); assert.equal(config,undefined);
  stored.set(`medveda:play-attempt:${uid}`,JSON.stringify(attempt));
  iap.getAvailablePurchases=async()=>[{platform:'android',productId:'price_500',purchaseToken:'historical_fixture',purchaseState:'purchased',
   obfuscatedAccountIdAndroid:sha.sha256(uid),obfuscatedProfileIdAndroid:sha.sha256(oid)}];
  const restored=await service.restorePlayPurchases();
  assert.equal(restored.confirmed,1);assert.equal(verify,1);assert.equal(nativeRequests,0);
  assert.deepEqual(plain(config),{});assert.equal(events.at(-1).type,'success');
  serverOrders=[{id:oid,provider:'play',playSku:'price_500',productId:'notes-A'}];
  assert.equal(stored.size,0);
  assert.equal((await service.restorePlayPurchases()).confirmed,1,'reinstall-style restoration must identify the server order from receipt hashes');
  assert.equal(nativeRequests,0);
  console.log('PASS standalone Play order/catalog/purchase blocked before native/HTTP work; historical receipt restoration and verification remain available');
  return;
 }
 const firstLaunch=service.startPlayPurchase(attempt,'offer');
 await assert.rejects(service.startPlayPurchase(attempt,'offer'),/Another Play purchase/);
 await firstLaunch;
 await assert.rejects(service.startPlayPurchase(attempt,'offer'),/Another Play purchase/);
 assert.equal(nativeRequests,1);
 assert.deepEqual(plain(config),enabled?{enableBillingProgramAndroid:'user-choice-billing'}:{});
 chosen(null);chosen({products:null,externalTransactionToken:'fixture_bad_shape'});await tick();assert.equal(events.length,0);
 chosen({products:['wrong_sku'],externalTransactionToken:'fixture_external_token'});await tick();assert.equal(events.length,0);
 user='stranger';chosen({products:['price_500'],externalTransactionToken:'fixture_old_account'});await tick();
 assert.equal(events.length,0);assert.equal(JSON.parse(stored.get(`medveda:play-attempt:${uid}`)).externalTransactionToken,undefined);
 user=uid;
 chosen({products:['price_500'],externalTransactionToken:'fixture_external_token'});await tick();
 assert.equal(events.length,enabled?1:0);assert.equal(verify,0,'alternative callback grants nothing');
 if(enabled){
  assert.equal(events[0].type,'alternative');
  assert.equal((await service.resumeAlternativeChoice('notes-A')).externalTransactionToken,'fixture_external_token');
  assert.equal(await service.resumeAlternativeChoice('notes-B'),null);
  chosen({products:['price_500'],externalTransactionToken:'fixture_external_token'});await tick();assert.equal(events.length,1,'callback dedup');
  user='stranger';await assert.rejects(service.attachExternalToken(attempt,'fixture_external_token'),/account changed/);user=uid;
  await service.finishAlternativeChoice(attempt);
  const interrupted={...attempt,internalOrderId:'44444444-4444-4444-8444-444444444444'};
  await service.startPlayPurchase(interrupted,'offer');const before=events.length;
  switchOnSave=true;chosen({products:['price_500'],externalTransactionToken:'fixture_during_storage'});await tick();await tick();
  assert.equal(events.length,before,'account switch during persistence cannot emit alternative checkout');assert.equal(verify,0);
  switchOnSave=false;user=uid;
  const restored=await service.resumeAlternativeChoice('notes-A');assert.equal(restored.externalTransactionToken,'fixture_during_storage');
  await service.finishAlternativeChoice(restored);
 } else { errored({code:'user-cancelled'}); await tick(); }
 // Pending and unverified receipts cannot produce success.
 const next={...attempt,internalOrderId:'22222222-2222-4222-8222-222222222222'};
 await service.startPlayPurchase(next,'offer');
 updated({platform:'android',productId:'price_500',purchaseToken:'fixture_purchase_token',purchaseState:'pending',
  obfuscatedAccountIdAndroid:sha.sha256(uid),obfuscatedProfileIdAndroid:sha.sha256(next.internalOrderId)});
 await tick();assert.equal(events.at(-1).type,'pending');assert.equal(verify,0);
 updated({platform:'android',productId:'price_500',purchaseToken:'fixture_purchase_token',purchaseState:'purchased',
  obfuscatedAccountIdAndroid:sha.sha256(uid),obfuscatedProfileIdAndroid:sha.sha256(next.internalOrderId)});
 await tick();await tick();assert.equal(events.at(-1).type,'success');assert.equal(verify,1);
 await service.startPlayPurchase({...next,internalOrderId:'33333333-3333-4333-8333-333333333333'},'offer');
 errored({code:'user-cancelled'});await tick();assert.equal(events.at(-1).type,'cancel');
 const requestsBeforeSwitch=nativeRequests;
 switchOnSave=true;
 await assert.rejects(service.startPlayPurchase({...next,internalOrderId:'55555555-5555-4555-8555-555555555555'},'offer'),/account changed/);
 assert.equal(nativeRequests,requestsBeforeSwitch,'switch during durable attempt save must not launch native purchase');
 switchOnSave=false;user=uid;
 console.log(`PASS native ${enabled?'UCB':'Play-only'} initialization, product-bound choice, durable retry, malformed callback/account switch before and during storage, callback dedup, pending/verified/cancelled receipts`);
}
async function summary(changed=false) {
 const h=harness();let listener, route, creates=0, playCreates=0, alerts=0;
 let finishCreate;
 const native={View:'View',Text:'Text',ScrollView:'Scroll',Modal:'Modal',Pressable:'Press',Switch:'Switch',ActivityIndicator:'Spinner',
  StyleSheet:{create:x=>x},Platform:{OS:'android'},Alert:{alert:()=>alerts++}};
 const attempt={userId:uid,internalOrderId:oid,playSku:'price_500',productId:'notes-A',productTitle:'Notes A',externalTransactionToken:'fixture_external_token'};
 const navigation={isFocused:()=>true,addListener:()=>()=>{},replace:(name,params)=>{route={name,params}}};
 const mocks={react:h.react,'react/jsx-runtime':jsx,'react-native':native,
  '@react-navigation/native':{useRoute:()=>({params:{productId:'notes-A',productTitle:'Notes A'}}),useNavigation:()=>navigation},
  '../../components/CustomButton':{__esModule:true,default:'Pay'},'../../components/ErrorState':{__esModule:true,default:'Error'},
  '../../services/authState':{getCurrentUser:()=>({id:uid}),getAuthEpoch:()=>0,subscribeAuthUser:()=>()=>{}},'../../config/paymentProvider':{paymentProvider:'play',userChoiceBillingEnabled:true},
  '../../services/indiaBillingStates':{INDIA_ADMINISTRATIVE_AREAS:['KERALA']},
  '../../config/supabase':{supabase:{auth:{getSession:async()=>({data:{session:{user:{id:uid}}}})}}},
  '../../services/referralsService':{fetchOrderQuote:async()=>({ok:true,amount:450,listPrice:500,walletAmount:0,referralDiscount:50}),fetchReferralSettings:async()=>({enabled:false}),formatRupees:String,walletProductsText:()=>''},
  '../../services/playBillingService':{resumeAlternativeChoice:async()=>null,subscribePlayBilling:fn=>{listener=fn;return()=>{};},
   createPlayOrder:async()=>{playCreates++;return{internalOrderId:oid,playSku:'price_500',amountInr:500};},
   fetchMatchingPlayProduct:async()=>({offerToken:'offer'}),startPlayPurchase:async()=>{},attachExternalToken:async()=>{},
   saveAlternativeContext:async()=>{},finishAlternativeChoice:async()=>{}},
  '../../services/paymentService':{purchaseProduct:async(product,wallet,choice,state)=>{creates++;assert.equal(product,'notes-A');assert.equal(choice,oid);assert.equal(state,'KERALA');return new Promise(r=>finishCreate=r);}},
  '../../utils/logger':{logError(){}},
 };
 for(const [file,key]of [['colors','COLORS'],['fonts','FONT'],['spacing','SPACING'],['radius','RADIUS']])mocks['../../theme/'+file]={[key]:{}};
 const Screen=load('mobile-app/src/screens/payment/OrderSummaryScreen.tsx',mocks).default;
 h.render(Screen);await tick();let tree=h.render(Screen);
 // Set state before opening Google's choice, so the callback can open checkout immediately.
 nodes(tree).find(n=>n.type==='Press' && n.props.children?.props?.children==='KERALA').props.onPress();
 tree=h.render(Screen);const pay=nodes(tree).find(n=>n.type==='Pay');await Promise.all([pay.props.onPress(),pay.props.onPress()]);
 assert.equal(playCreates,1);assert.equal(creates,0,'Razorpay must wait for Google callback');
 listener({type:'alternative',attempt});listener({type:'alternative',attempt});await tick();
 assert.equal(creates,1);
 finishCreate({amountPaise:changed?40000:45000,internalOrderId:'razorpay-internal',breakdown:{listPrice:500,referralDiscount:100,walletAmount:0,amount:400}});
 await tick();await tick();
 if(changed){assert.equal(route,undefined);assert.equal(alerts,1);}
 else assert.equal(route.name,'PaymentCheckout');
 h.unmount();
 console.log(`PASS Buy → summary → Google choice → Razorpay: one create for duplicate taps/callbacks; ${changed?'changed price requires confirmation':'valid server order opens existing checkout'}`);
}
function gates() {
 const configure=require('../app.config.js'), app=require('../app.json').expo, profiles=require('../eas.json').build;
 const before=process.env;
 function config(values){process.env={...values};try{return configure({config:app});}finally{process.env=before;}}
 for(const name of ['production','internal-testing']) {
  const c=config({...profiles[name].env,EAS_BUILD_PROFILE:name,EAS_BUILD_PLATFORM:'android'});
  assert.equal(c.extra.medvedaPaymentProvider,'razorpay');assert.equal(c.extra.medvedaIndiaUcbEnrolled,false);
 }
 // Retired Play cannot be configured. Explicit disabled builds remain available,
 // while the existing production Razorpay configuration must be accepted.
 for (const name of ['production','internal-testing','shrink-test']) {
  const values={...profiles[name].env,EAS_BUILD_PROFILE:name,EAS_BUILD_PLATFORM:'android'};
  assert.throws(()=>config({...values,MEDVEDA_PAYMENT_PROVIDER:'play'}), /Play Billing is retired/);
  assert.equal(config({...values,MEDVEDA_PAYMENT_PROVIDER:'razorpay'}).extra.medvedaPaymentProvider,'razorpay');
  assert.equal(config({...values,MEDVEDA_PAYMENT_PROVIDER:'disabled'}).extra.medvedaPaymentProvider,'disabled');
 }
 console.log('PASS production defaults to Razorpay; retired Play rejected; explicit disabled builds accepted; legacy receipt/choice coverage retained');
}
(async()=>{gates();await billing(false);await billing(true);await summary();await summary(true);await recovery();})().catch(e=>{console.error(e);process.exitCode=1;});

async function recovery() {
 const timers=new Map(), stored=new Map(), events=[];let fulfillment=false, requests=0;
 const attempt={userId:uid,internalOrderId:oid,productId:'notes',productTitle:'Notes',playSku:'fixture_sku'};
 const iap={initConnection:async()=>true,purchaseUpdatedListener:()=>({remove(){}}),
  purchaseErrorListener:()=>({remove(){}}),userChoiceBillingListenerAndroid:()=>({remove(){}}),
  requestPurchase:()=>{requests++;return new Promise(()=>{})}};
 const service=load('mobile-app/src/services/playBillingService.ts',{
  '@react-native-async-storage/async-storage':{__esModule:true,default:{getItem:async k=>stored.get(k),setItem:async(k,v)=>stored.set(k,v),removeItem:async k=>stored.delete(k)}},
  'react-native':{Platform:{OS:'android'}},'js-sha256':sha,'../config/paymentProvider':{userChoiceBillingEnabled:true},
  'expo-application':{applicationId:'in.medveda.app',nativeApplicationVersion:'1.2.2'},
  '../config/supabase':{supabase:{auth:{getSession:async()=>({data:{session:{user:{id:uid},access_token:'fixture'}}})},
   rpc:async(name,args)=>{assert.equal(name,'get_my_play_fulfillment');assert.equal(args.p_order_id,oid);return {data:{success:fulfillment,pending:!fulfillment},error:null}}}},
  '../repositories/ordersRepository':{getOrdersByUser:async()=>[{id:oid,productId:'notes',provider:'play',status:'paid',amount:49}]},
  './authState':{getCurrentUser:()=>({id:uid}),getAuthEpoch:()=>0},'./playOfferSelection':{},'expo-iap':iap,
 },{process:{env:{EXPO_PUBLIC_SUPABASE_URL:'https://fixture.invalid'}},setTimeout:fn=>{const id=Symbol();timers.set(id,fn);return id},clearTimeout:id=>timers.delete(id)});
 service.subscribePlayBilling(e=>events.push(e));
 const launch=service.startPlayPurchase(attempt,'fixture_offer');await tick();assert.equal(requests,1);assert.equal(timers.size,1);
 [...timers.values()][0]();await launch;assert.equal(events.at(-1).type,'pending');
 assert.ok(stored.size>0,'ambiguous native purchase must remain recoverable');
 await assert.rejects(service.startPlayPurchase(attempt,'fixture_offer'),/Another Play purchase/);
 assert.equal((await service.recheckPlayOrder(oid)).success,false,'paid marker must not imply entitlement');
 fulfillment=true;assert.equal((await service.recheckPlayOrder(oid)).success,true);
 console.log('PASS native request timeout retains pending attempt; no duplicate charge; paid restart recovery requires committed server fulfillment');
}
