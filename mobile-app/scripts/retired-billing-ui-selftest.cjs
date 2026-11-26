const assert = require('node:assert/strict');
const { harness, load, jsx, nodes, tick } = require('./ui-harness.cjs');
function themes() {
 const result = {};
 for (const [file,key] of [['colors','COLORS'],['fonts','FONT'],['spacing','SPACING'],['radius','RADIUS'],['shadows','SHADOW']]) result['../../theme/'+file] = {[key]:{}};
 return result;
}
async function summary() {
 const h=harness(); let creates=0,checkout;
 const navigation={isFocused:()=>true,addListener:()=>()=>{},replace:(name,params)=>checkout={name,params},goBack(){},navigate(){}};
 // Intentionally provide no native Billing, Supabase client or billing-state module.
 const Screen=load('mobile-app/src/screens/payment/OrderSummaryScreen.tsx',{
  react:h.react,'react/jsx-runtime':jsx,
  'react-native':{View:'View',Text:'Text',ScrollView:'Scroll',Switch:'Switch',ActivityIndicator:'Spinner',Platform:{OS:'android'},StyleSheet:{create:x=>x},Alert:{alert(){}}},
  '@react-navigation/native':{useNavigation:()=>navigation,useRoute:()=>({params:{productId:'legacy-other-notes',productTitle:'Notes'}})},
  '../../components/CustomButton':{__esModule:true,default:'Pay'},'../../components/ErrorState':{__esModule:true,default:'Error'},
  '../../services/referralsService':{fetchOrderQuote:async()=>({ok:true,amount:2,listPrice:2}),fetchReferralSettings:async()=>({enabled:false}),formatRupees:String,walletProductsText:()=>''},
  '../../services/paymentService':{purchaseProduct:async(...args)=>{creates++;assert.deepEqual(JSON.parse(JSON.stringify(args)),['legacy-other-notes',false]);return {amountPaise:200,internalOrderId:'rp-order'};}},
  '../../services/authState':{getAuthEpoch:()=>0,getCurrentUser:()=>({id:'buyer'}),subscribeAuthUser:()=>()=>{}},
  '../../config/paymentProvider':{paymentProvider:'razorpay'},'../../utils/logger':{logError(){}},...themes(),
 }).default;
 h.render(Screen);await tick();const pay=nodes(h.render(Screen)).find(n=>n.type==='Pay');
 await Promise.all([pay.props.onPress(),pay.props.onPress()]);
 assert.equal(creates,1);assert.equal(checkout.name,'PaymentCheckout');assert.equal(checkout.params.internalOrderId,'rp-order');h.unmount();
 console.log('PASS Notes summary opens Razorpay once without native Billing dependencies or type-based catalog filtering');
}
function historicalPlay() {
 for (const pending of [false,true]) {
  const h=harness();let focus,reads=0,timers=0,appListeners=0,destination;
  const Screen=load('mobile-app/src/screens/payment/PaymentFailedScreen.tsx',{
   react:h.react,'react/jsx-runtime':jsx,
   'react-native':{View:'View',Text:'Text',TouchableOpacity:'Button',StyleSheet:{create:x=>x},AppState:{addEventListener:()=>{appListeners++;return {remove(){}};}}},
   '@react-navigation/native':{useRoute:()=>({params:{provider:'play',pending,internalOrderId:'historical-order',verifyUrl:'https://must-not-call.invalid'}}),useNavigation:()=>({dispatch:x=>{destination=x.routes.at(-1).name;}}),useFocusEffect:fn=>focus=fn,CommonActions:{reset:x=>x}},
   '../../services/authState':{getCurrentUser:()=>({id:'buyer'})},'../../services/paymentService':{recoverPayment:()=>{reads++;throw Error('must not recover a Play order through Razorpay');}},...themes(),
  },{setInterval(){timers++;return 1},clearInterval(){}}).default;
  const tree=h.render(Screen);const cleanup=focus();
  const text=JSON.stringify(tree);assert.match(text,/historical-order/);assert.match(text,/Do not pay again/);assert.doesNotMatch(text,/Try Again/);
  const buttons=nodes(tree).filter(n=>n.type==='Button');buttons[0].props.onPress();assert.equal(destination,'MyPurchases');buttons[1].props.onPress();assert.equal(destination,'Contact');
  assert.equal(reads,0);assert.equal(timers,0);assert.equal(appListeners,0);cleanup?.();h.unmount();
 }
 console.log('PASS earlier Play pending/failed routes show IDs/history/support without native init, Razorpay recovery, polling or pay-again');
}
(async()=>{await summary();historicalPlay();})().catch(error=>{console.error(error);process.exitCode=1;});
