// Native WebView callbacks and local HTML execution with a synthetic Razorpay.
const assert=require('node:assert/strict'), vm=require('node:vm');
const {harness,load,jsx,nodes,tick}=require('./ui-harness.cjs');
const crypto=require('node:crypto').webcrypto;
const template=load('mobile-app/src/screens/payment/checkoutHtmlTemplate.ts',{});
const navigation=load('mobile-app/src/screens/payment/checkoutNavigation.ts',{}, {URL});
function setup(overrides={}) {
 const h=harness(), routes=[];let verifies=0,complete;
 const params={keyId:'rzp_test_fixture',razorpayOrderId:'order_fixture',amountPaise:4900,
  internalOrderId:'internal_fixture',productTitle:'Notes',verifyUrl:'https://fixture.invalid/functions/v1/verify-payment',...overrides};
 const mocks={react:h.react,'react/jsx-runtime':jsx,
  'react-native':{View:'View',Text:'Text',ActivityIndicator:'Spinner',StyleSheet:{create:x=>x},Platform:{OS:'android'},
   AppState:{addEventListener:()=>({remove(){}})},BackHandler:{addEventListener:()=>({remove(){}})},Linking:{openURL:async()=>{},canOpenURL:async()=>true},Alert:{alert(){}}},
  'react-native-webview':{WebView:'WebView'},
  '@react-navigation/native':{useRoute:()=>({params}),useNavigation:()=>({dispatch:x=>routes.push(x),goBack:()=>routes.push('back')}),useFocusEffect(){},CommonActions:{reset:x=>x}},
  './checkoutHtmlTemplate':template,'./checkoutNavigation':navigation,
  '../../services/authState':{getCurrentUser:()=>({id:'buyer'})},'../../services/paymentService':{verifyPayment:async()=>{verifies++;return new Promise(resolve=>complete=resolve)},recoverPaymentWithRetry:async()=>({success:false,pending:true})},
  '../../services/ordersService':{markOrderStatus:async()=>{}},'../../config/paymentProvider':{paymentProvider:'razorpay'},
 };
 for(const [name,key]of [['colors','COLORS'],['fonts','FONT'],['spacing','SPACING']])mocks['../../theme/'+name]={[key]:{}};
 const Outer=load('mobile-app/src/screens/payment/PaymentCheckoutScreen.tsx',mocks,{crypto,URL,process:{env:{EXPO_PUBLIC_SUPABASE_URL:'https://fixture.invalid'}}}).default;
 const Screen=Outer().type;
 const tree=h.render(Screen),web=nodes(tree).find(n=>n.type==='WebView');
 const messages=[];let options,callbacks;
 if(web){
  const inline=[...web.props.source.html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)][1][1];
  vm.runInNewContext(inline,{window:{ReactNativeWebView:{postMessage:raw=>messages.push(JSON.parse(raw))}},
   document:{getElementById:()=>({})},Razorpay:function(o){options=o;this.on=(_name,fn)=>callbacks=fn;this.open=()=>{}}});
 }
 return {h,Screen,tree,web,routes,params,messages,options,callbacks,get verifies(){return verifies},finish:result=>complete(result)};
}
const response={razorpay_order_id:'order_fixture',razorpay_payment_id:'pay_fixture',razorpay_signature:'a'.repeat(64)};
(async()=>{
 const s=setup();assert.ok(s.web);assert.equal(s.options.order_id,'order_fixture');assert.equal(s.options.amount,4900);
 s.options.handler(response);const good=s.messages[0];assert.equal(good.callbackNonce.length,32);
 assert.equal(nodes(s.h.render(s.Screen)).find(n=>n.type==='WebView').props.source,s.web.props.source,'state rerenders must not restart checkout');
 for(const [url,data]of [
  ['https://evil.invalid',JSON.stringify(good)],['about:blank','null'],['about:blank','[]'],['about:blank','broken'],
  ['about:blank',JSON.stringify({...good,callbackNonce:'wrong'})],['about:blank',JSON.stringify({...good,razorpay_order_id:'order_other'})],
  ['about:blank',JSON.stringify({...good,razorpay_signature:'forged'})],
 ]) await s.web.props.onMessage({nativeEvent:{url,data}});
 assert.equal(s.verifies,0);assert.equal(s.routes.length,0);
 const pending=s.web.props.onMessage({nativeEvent:{url:'about:blank',data:JSON.stringify(good)}});
 await tick();assert.equal(s.verifies,1);
 await s.web.props.onMessage({nativeEvent:{url:'about:blank',data:JSON.stringify(good)}});assert.equal(s.verifies,1);
 s.finish({success:true,amount:49});await pending;assert.equal(s.routes.length,1);
 assert.equal(s.routes[0].routes[1].name,'PaymentSuccess');
 console.log('PASS checkout initializes with valid server order; stable HTML; rejects wrong origin/nonce/order/signature and duplicate callbacks');
 const late=setup();late.options.handler(response);
 const processing=late.web.props.onMessage({nativeEvent:{url:'about:blank',data:JSON.stringify(late.messages[0])}});
 await tick();late.h.unmount();late.finish({success:true,amount:49});await processing;assert.equal(late.routes.length,0);
 console.log('PASS late verification cannot navigate after checkout unmounts');
 const crashed=setup();crashed.web.props.onRenderProcessGone();await tick();assert.equal(crashed.routes[0].routes[1].params.pending,true);
 console.log('PASS renderer failure moves an unconfirmed charge to existing pending recovery');
 for(const overrides of [{razorpayOrderId:''},{amountPaise:-1},{verifyUrl:'https://evil.invalid'},{keyId:'invalid'}])assert.equal(setup(overrides).web,undefined);
 const safe=setup();assert.equal(safe.web.props.onShouldStartLoadWithRequest({url:'https://evil.invalid'}),false);
 assert.equal(safe.web.props.onShouldStartLoadWithRequest({url:'javascript:alert(1)'}),false);
 assert.equal(safe.web.props.onShouldStartLoadWithRequest({url:'https://checkout.razorpay.com/'}),true);
 console.log('PASS invalid route orders cannot open checkout; unsafe redirects are blocked');
 for(const type of ['cancelled','failed']){
  const t=setup();if(type==='cancelled')t.options.modal.ondismiss();else t.callbacks({error:{description:'fixture decline'}});
  await t.web.props.onMessage({nativeEvent:{url:'about:blank',data:JSON.stringify(t.messages[0])}});
  assert.equal(t.verifies,0);assert.equal(t.routes.length,1);
 }
 console.log('PASS cancelled and failed checkout callbacks grant no access');
})().catch(error=>{console.error(error);process.exitCode=1});
