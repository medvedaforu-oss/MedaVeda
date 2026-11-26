const assert=require('node:assert/strict');
const {harness,load,jsx,nodes,tick}=require('./ui-harness.cjs');
async function scenario(changed){
 const h=harness();let finish,creates=0,navigations=0,alerts=0;
 const navigation={isFocused:()=>true,addListener:()=>()=>{},replace:()=>navigations++,goBack(){}};
 const mocks={react:h.react,'react/jsx-runtime':jsx,
 'react-native':{View:'View',Text:'Text',ScrollView:'Scroll',Switch:'Switch',ActivityIndicator:'Spinner',StyleSheet:{create:x=>x},Platform:{OS:'android'},Alert:{alert:()=>alerts++}},
 '@react-navigation/native':{useRoute:()=>({params:{productId:'notes',productTitle:'Notes'}}),useNavigation:()=>navigation},
 '../../components/CustomButton':{__esModule:true,default:'PayButton'},'../../components/ErrorState':{__esModule:true,default:'Error'},
 '../../services/referralsService':{fetchOrderQuote:async()=>({ok:true,amount:49}),fetchReferralSettings:async()=>({enabled:false}),formatRupees:String,walletProductsText:()=>''},
 '../../services/authState':{getCurrentUser:()=>({id:'buyer'}),getAuthEpoch:()=>0,subscribeAuthUser:()=>()=>{}},'../../config/supabase':{},
 '../../services/paymentService':{purchaseProduct:()=>{creates++;return new Promise(r=>finish=r);}},'../../config/paymentProvider':{paymentProvider:'razorpay'},'../../utils/logger':{logError(){}}};
 for(const [file,key]of [['colors','COLORS'],['fonts','FONT'],['spacing','SPACING'],['radius','RADIUS']])mocks['../../theme/'+file]={[key]:{}};
 const Screen=load('mobile-app/src/screens/payment/OrderSummaryScreen.tsx',mocks).default;
 h.render(Screen);await tick();const tree=h.render(Screen);const button=nodes(tree).find(n=>n.type==='PayButton');
 const first=button.props.onPress();const duplicate=button.props.onPress();assert.equal(creates,1);
 finish({amountPaise:changed?5900:4900});await Promise.all([first,duplicate]);
 assert.equal(navigations,changed?0:1);assert.equal(alerts,changed?1:0);
}
async function failedRefresh(reject) {
 const h=harness();let reads=0,creates=0,complete;
 const navigation={isFocused:()=>true,addListener:()=>()=>{},replace(){},goBack(){}};
 const mocks={react:h.react,'react/jsx-runtime':jsx,
 'react-native':{View:'View',Text:'Text',ScrollView:'Scroll',Switch:'Switch',ActivityIndicator:'Spinner',StyleSheet:{create:x=>x},Platform:{OS:'android'},Alert:{alert(){}}},
 '@react-navigation/native':{useRoute:()=>({params:{productId:'notes',productTitle:'Notes'}}),useNavigation:()=>navigation},
 '../../components/CustomButton':{__esModule:true,default:'PayButton'},'../../components/ErrorState':{__esModule:true,default:'Error'},
 '../../services/referralsService':{
  fetchOrderQuote:()=>++reads===1?Promise.resolve({ok:true,amount:49,walletEligible:true,walletAvailable:10})
   :new Promise((resolve,rejectPromise)=>{complete=()=>reject?rejectPromise(new Error('offline')):resolve({ok:false});}),
  fetchReferralSettings:async()=>({enabled:true}),formatRupees:String,walletProductsText:()=>''},
 '../../services/authState':{getCurrentUser:()=>({id:'buyer'}),getAuthEpoch:()=>0,subscribeAuthUser:()=>()=>{}},'../../config/supabase':{},
 '../../services/paymentService':{purchaseProduct:async()=>{creates++;return {amountPaise:4900};}},
 '../../config/paymentProvider':{paymentProvider:'razorpay'},'../../utils/logger':{logError(){}}};
 for(const [file,key]of [['colors','COLORS'],['fonts','FONT'],['spacing','SPACING'],['radius','RADIUS']])mocks['../../theme/'+file]={[key]:{}};
 const Screen=load('mobile-app/src/screens/payment/OrderSummaryScreen.tsx',mocks).default;
 h.render(Screen);await tick();const tree=h.render(Screen);
 nodes(tree).find(n=>n.type==='Switch').props.onValueChange(true);
 // An event queued before React rerenders must not pay using the old quote.
 await nodes(tree).find(n=>n.type==='PayButton').props.onPress();
 assert.equal(creates,0,'wallet refresh invalidates the previous quote immediately');
 complete();await tick();const failed=h.render(Screen);
 assert.ok(nodes(failed).some(n=>n.type==='Error'),'failed refresh offers a retry');
 assert.ok(!nodes(failed).some(n=>n.type==='PayButton'),'failed quote cannot remain payable');
}
(async()=>{
 await scenario(false);await scenario(true);
 console.log('PASS same-render duplicate taps create once; changed server total requires price review before checkout');
 await failedRefresh(false);await failedRefresh(true);
 console.log('PASS pending, rejected and offline wallet quotes cannot charge using a stale total; retry remains available');
})().catch(e=>{console.error(e);process.exitCode=1;});
