const assert=require('node:assert/strict');const {harness,load,jsx,nodes,tick}=require('./ui-harness.cjs');
(async()=>{
 for(const terminal of [false,true]) {
 const provider='razorpay';
 const h=harness();let focus,interval,app,finish,reads=0,navigations=0;
 const mocks={react:{...h.react,useEffect:fn=>{fn();}},'react/jsx-runtime':jsx,'react-native':{View:'View',Text:'Text',TouchableOpacity:'Button',StyleSheet:{create:x=>x},AppState:{addEventListener:(_,fn)=>{app=fn;return {remove(){}};}}},'@react-navigation/native':{useRoute:()=>({params:{pending:true,provider,internalOrderId:'order',verifyUrl:'https://fixture.invalid'}}),useNavigation:()=>({dispatch:()=>navigations++}),useFocusEffect:fn=>{focus=fn;},CommonActions:{reset:x=>x}},'../../services/playBillingService':{},'../../services/authState':{getCurrentUser:()=>({id:'buyer'})},'../../services/paymentService':{recoverPayment:()=>{reads++;return new Promise(r=>finish=r);}}};
 for(const [file,key]of [['colors','COLORS'],['fonts','FONT'],['spacing','SPACING'],['radius','RADIUS'],['shadows','SHADOW']])mocks['../../theme/'+file]={[key]:{}};
 const Screen=load('mobile-app/src/screens/payment/PaymentFailedScreen.tsx',mocks,{setInterval:fn=>{interval=fn;return 1;},clearInterval(){}}).default;
 h.render(Screen);let blur=focus();interval();app('active');assert.equal(reads,1);
 blur();finish({success:true});await tick();assert.equal(navigations,0);
 blur=focus();finish({success:false,pending:!terminal,message:'This payment was refunded.'});await tick();
 if(terminal){
  const before=reads;interval();app('active');await tick();assert.equal(reads,before);
  const tree=h.render(Screen);assert.match(JSON.stringify(tree),/Payment update/);assert.equal(navigations,0);blur();
 }else{
  blur();blur=focus();finish({success:true,amount:'49'});await tick();assert.equal(navigations,1);blur();
 }
 }
 console.log('PASS Razorpay polls coalesce, ignore blurred results, confirm focused success and stop on terminal refund verdict');
})().catch(e=>{console.error(e);process.exitCode=1;});
