const assert=require('node:assert/strict');
const {harness,load,jsx,nodes,tick}=require('./ui-harness.cjs');
async function scenario(verdict,recovery,expected,overlap=false){
 const h=harness();let navigations=[],recoveries=0,marks=0,app,releaseRecovery;
 const mocks={react:h.react,'react/jsx-runtime':jsx,
  'react-native':{View:'View',Text:'Text',ActivityIndicator:'Spinner',StyleSheet:{create:x=>x},Platform:{OS:'android'},BackHandler:{addEventListener:()=>({remove(){}})},Linking:{},Alert:{},AppState:{addEventListener:(_,fn)=>{app=fn;return{remove(){}};}}},
  'react-native-webview':{WebView:'WebView'},'@react-navigation/native':{useRoute:()=>({params:{keyId:'fixture',razorpayOrderId:'rzp_order',amountPaise:4900,productTitle:'Notes',internalOrderId:'order',verifyUrl:'https://fixture.invalid'}}),useNavigation:()=>({dispatch:x=>navigations.push(x),goBack:()=>navigations.push({back:true})}),useFocusEffect(){},CommonActions:{reset:x=>x}},
  './checkoutHtmlTemplate':{buildCheckoutHtml:()=>'<html/>'},'./checkoutNavigation':{CHECKOUT_ORIGIN_WHITELIST:[],isAllowedCheckoutWebUrl:()=>true},'../../config/paymentProvider':{paymentProvider:'razorpay'},
  '../../services/paymentService':{verifyPayment:async()=>{
   if(overlap===true||overlap==='recovery-late'){app('active');await tick();}
   if(verdict instanceof Error)throw verdict;return verdict;
  },recoverPaymentWithRetry:async()=>{
   recoveries++;
   if(overlap==='recovery-late')return new Promise(resolve=>releaseRecovery=resolve);
   return recovery;
  }},'../../services/ordersService':{markOrderStatus:async()=>{marks++;}},
 };
 for(const [file,key]of [['colors','COLORS'],['fonts','FONT'],['spacing','SPACING']])mocks['../../theme/'+file]={[key]:{}};
 const Screen=load('mobile-app/src/screens/payment/PaymentCheckoutScreen.tsx',mocks).default;
 const wrapper=Screen();const tree=h.render(wrapper.type);const web=nodes(tree).find(n=>n.type==='WebView');
 const resumeFirst=typeof overlap==='string'&&overlap.startsWith('resume-first:');
 if(resumeFirst){app('active');await tick();}
 await web.props.onMessage({nativeEvent:{data:JSON.stringify({type:resumeFirst?overlap.split(':')[1]:'success',razorpay_order_id:'rzp_order',razorpay_payment_id:'rzp_pay',razorpay_signature:'fixture'})}});
 if(releaseRecovery){releaseRecovery(recovery);await tick();}
 assert.equal(navigations.length,1);const route=navigations[0].routes[1];
 assert.equal(route.name,expected);if(expected==='PaymentFailed'&&verdict?.pending!==false){assert.equal(route.params.pending,true);assert.equal(marks,0);}
 return {route,recoveries,app};
}
(async()=>{
 for(const verdict of [{success:false,pending:true},{success:false},new Error('network')]){
  const r=await scenario(verdict,{success:false},'PaymentFailed');assert.equal(r.recoveries,1);
 }
 console.log('PASS structured pending, legacy unconfirmed and network failures recover then show pending without failed writes');
 const recovered=await scenario({success:false,pending:true},{success:true,amount:49},'PaymentSuccess');assert.equal(recovered.recoveries,1);
 const rejected=await scenario({success:false,pending:false},{success:false},'PaymentFailed');assert.equal(rejected.recoveries,0);assert.equal(rejected.route.params.pending,undefined);
 const success=await scenario({success:true,amount:49},{success:false},'PaymentSuccess');assert.equal(success.recoveries,0);
 console.log('PASS only server-confirmed verification/recovery navigates to success; explicit rejection remains terminal');
 for(const verdict of [{success:false,pending:true},{success:false,pending:false},new Error('network'),{success:true,amount:49}]) {
  const resumed=await scenario(verdict,{success:true,amount:49},'PaymentSuccess',true);
  assert.equal(resumed.recoveries,1);
 }
 for(const recovery of [{success:true,amount:49},{success:false,pending:true}]) {
  await scenario({success:true,amount:49},recovery,'PaymentSuccess','recovery-late');
 }
 for(const event of ['success','failed','cancelled']) {
  await scenario({success:true,amount:49},{success:true,amount:49},'PaymentSuccess','resume-first:'+event);
 }
 console.log('PASS UPI resume confirmation cannot be replaced or duplicated by a delayed callback verdict or network error');
})().catch(e=>{console.error(e);process.exitCode=1;});
