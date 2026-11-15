const {assert,load,run}=require('./audit-harness.cjs');
run(()=>{for(const [os,id,provider,restore,sales] of [['android','in.medveda.app','disabled',true,'disabled'],['android','in.medveda.app','play',true,'play'],['ios','in.medveda.app','disabled',false,'disabled'],['android','in.medveda.razorpaytest','disabled',false,'disabled']]){
 const c=load('src/config/paymentProvider.ts',{'expo-constants':{__esModule:true,default:{expoConfig:{extra:{medvedaPaymentProvider:provider,medvedaIndiaUcbEnrolled:true,medvedaUcbTestAccepted:true}}}},'expo-application':{applicationId:id},'react-native':{Platform:{OS:os}}});
 assert.equal(c.playRestorationEnabled,restore,'historical restoration eligibility '+provider);assert.equal(c.paymentProvider,sales,'checkout permission must stay explicit');
}});
