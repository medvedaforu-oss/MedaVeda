const assert=require('node:assert/strict');
const fs=require('node:fs');
const {load,jsx}=require('./ui-harness.cjs');
(async()=>{
 for(const configured of ['play','razorpay','disabled',undefined]) {
  const provider=load('mobile-app/src/config/paymentProvider.ts',{
   'expo-constants':{__esModule:true,default:{expoConfig:{extra:{medvedaPaymentProvider:configured,
    medvedaDistribution:'non-play-internal-test'}}}},
   'react-native':{Platform:{OS:'android'}},'expo-application':{applicationId:'in.medveda.app'},
  },{__DEV__:false,process:{env:{EXPO_PUBLIC_SUPABASE_URL:'https://xbvenkfmesugrbjuufyw.supabase.co'}}}).paymentProvider;
  assert.equal(provider,'disabled');
  let network=0,sessions=0;const navigation=[];
  const service=load('mobile-app/src/services/paymentService.ts',{
   '../config/supabase':{supabase:{auth:{getSession:async()=>{sessions++;return {data:{session:{access_token:'fixture'}}};}}}},
   'react-native':{Platform:{OS:'android'}},'expo-application':{nativeApplicationVersion:'1.2.1'},'../config/paymentProvider':{paymentProvider:provider},'./authState':{getCurrentUser:()=>null},
  },{__DEV__:false,process:{env:{}},fetch:async()=>{network++;throw Error('unexpected Razorpay order');}});
  await assert.rejects(service.purchaseProduct('notes'),/Razorpay checkout is unavailable/);assert.equal(network,0);assert.equal(sessions,0);
  const buy=load('mobile-app/src/hooks/usePurchase.ts',{
   '@react-navigation/native':{useNavigation:()=>({navigate:screen=>navigation.push(screen)})},'react-native':{Platform:{OS:'android'},Alert:{alert(){}}},'../config/paymentProvider':{paymentProvider:provider},
  },{__DEV__:false}).default().buy;
  buy({id:'notes',title:'Notes'});assert.deepEqual(navigation,[]);
  const screen=load('mobile-app/src/screens/payment/PaymentCheckoutScreen.tsx',{
   react:{},'react/jsx-runtime':jsx,'react-native':{StyleSheet:{create:x=>x},View:'View',Text:'Text'},
   'react-native-webview':{},'@react-navigation/native':{},'../../theme/colors':{COLORS:{}},'../../theme/fonts':{FONT:{}},'../../theme/spacing':{SPACING:{}},
   './checkoutHtmlTemplate':{},'../../services/authState':{getCurrentUser:()=>({id:'buyer'})},'../../services/paymentService':{},'../../services/ordersService':{},'./checkoutNavigation':{},'../../config/paymentProvider':{paymentProvider:provider},
  },{__DEV__:false}).default();assert.equal(screen.type,'View');assert.match(JSON.stringify(screen),/New purchases are unavailable/);
 }
 const source=fs.readFileSync('mobile-app/src/navigation/AppNavigator.tsx','utf8');
 assert.match(source,/paymentProvider !== "disabled"/);
 console.log('PASS release Android actual provider config → navigation/service/checkout: no Razorpay order or checkout, including incomplete Razorpay config');
})().catch(e=>{console.error(e);process.exitCode=1;});
