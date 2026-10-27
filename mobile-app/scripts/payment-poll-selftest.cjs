const assert=require('node:assert/strict');const {harness,load,jsx,nodes,tick}=require('./ui-harness.cjs');
(async()=>{
 for(const provider of ['play','razorpay']) {
 const h=harness();let focus,interval,app,finish,reads=0,navigations=0;
 const mocks={react:{...h.react,useEffect:fn=>{fn();}},'react/jsx-runtime':jsx,'react-native':{View:'View',Text:'Text',TouchableOpacity:'Button',StyleSheet:{create:x=>x},AppState:{addEventListener:(_,fn)=>{app=fn;return {remove(){}};}}},'@react-navigation/native':{useRoute:()=>({params:{pending:true,provider,internalOrderId:'order',verifyUrl:'https://fixture.invalid'}}),useNavigation:()=>({dispatch:()=>navigations++}),useFocusEffect:fn=>{focus=fn;},CommonActions:{reset:x=>x}},'../../services/paymentService':{recoverPayment:()=>{reads++;return new Promise(r=>finish=r);}},'../../services/playBillingService':{recheckPlayOrder:()=>{reads++;return new Promise(r=>finish=r);}}};
 for(const [file,key]of [['colors','COLORS'],['fonts','FONT'],['spacing','SPACING'],['radius','RADIUS'],['shadows','SHADOW']])mocks['../../theme/'+file]={[key]:{}};
 const Screen=load('mobile-app/src/screens/payment/PaymentFailedScreen.tsx',mocks,{setInterval:fn=>{interval=fn;return 1;},clearInterval(){}}).default;
 h.render(Screen);let blur=focus();interval();app('active');assert.equal(reads,1);
 blur();finish({success:true});await tick();assert.equal(navigations,0);
 blur=focus();finish({success:false,pending:false,message:'This payment was refunded.'});await tick();
 if(provider==='play')assert.match(JSON.stringify(h.render(Screen)),/refunded/);blur();
 }
 console.log('PASS payment polls do not overlap or navigate after blur; terminal refund message displayed');
})().catch(e=>{console.error(e);process.exitCode=1;});
