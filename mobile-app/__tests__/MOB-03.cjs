const {assert,load,run}=require('./audit-harness.cjs');
// Restoration belongs only to the independently tested standalone Play profile.
const origin='https://xbvenkfmesugrbjuufyw.supabase.co';
const play={medvedaPaymentProvider:'play',medvedaDistribution:'google-play-testing',medvedaBuildTarget:'play-testing',medvedaBuildProfile:'play-billing-testing'};
function check(extra,restore,sales,{os='android',id='in.medveda.app',url=origin}={}) {
 const c=load('src/config/paymentProvider.ts',{'expo-constants':{__esModule:true,default:{expoConfig:{extra}}},'expo-application':{applicationId:id},'react-native':{Platform:{OS:os}}},{process:{env:{EXPO_PUBLIC_SUPABASE_URL:url}}});
 assert.equal(c.playRestorationEnabled,restore,'restoration must respect distribution and identity');
 assert.equal(c.paymentProvider,sales,'checkout permission must stay explicit');
}
run(()=>{
 check({medvedaPaymentProvider:'disabled'},false,'disabled');
 check({medvedaPaymentProvider:'play',medvedaIndiaUcbEnrolled:true,medvedaUcbTestAccepted:true},false,'disabled');
 check(play,true,'play');
 for(const field of ['medvedaPaymentProvider','medvedaDistribution','medvedaBuildTarget','medvedaBuildProfile']) {const incomplete={...play};delete incomplete[field];check(incomplete,false,'disabled');}
 check({...play,medvedaDistribution:'standard'},false,'disabled');
 check({...play,medvedaBuildTarget:'production'},false,'disabled');
 check({...play,medvedaBuildProfile:'production'},false,'disabled');
 check(play,false,'disabled',{os:'ios'});
 check(play,false,'disabled',{id:'in.medveda.razorpaytest'});
 check(play,false,'disabled',{url:'https://foreign.invalid'});
 check(play,false,'disabled',{url:''});
 check({medvedaPaymentProvider:'razorpay',medvedaDistribution:'standard',medvedaBuildTarget:'production'},false,'razorpay');
});
