const assert=require('node:assert/strict');
const {harness,load,jsx,nodes,tick}=require('../ui-harness.cjs');
function setup() {
 const h=harness(),s={epoch:0,user:'owner',calls:0,orderCalls:0};
 const navigation={isFocused:()=>true,navigate:name=>s.destination=name};
 const Screen=load('mobile-app/src/screens/payment/PlayOrderSummaryScreen.tsx',{
 react:h.react,'react/jsx-runtime':jsx,
 'react-native':{View:'View',Text:'Text',ActivityIndicator:'Spinner',StyleSheet:{create:x=>x}},
 '@react-navigation/native':{useNavigation:()=>navigation,useRoute:()=>({params:{productId:'notes',productTitle:'Notes'}})},
 '../../components/CustomButton':{__esModule:true,default:'Button'},'../../theme/colors':{COLORS:{}},
 '../../services/authState':{getAuthEpoch:()=>s.epoch,getCurrentUser:()=>({id:s.user}),subscribeAuthUser:fn=>(s.auth=fn,()=>{})},
 '../../services/playBillingService':{
 createPlayOrder:async()=>{s.orderCalls++;return {internalOrderId:'order',playSku:'price_5',amountInr:5,purchaseOptionId:'buy'}},
 fetchMatchingPlayProduct:async(sku,price)=>{assert.equal(sku,'price_5');assert.equal(price,5);return {offerToken:'google-offer',formattedPrice:'₹5.00'}},
 startPlayPurchase:async(a,token,isCurrent)=>{s.calls++;assert.equal(a.userId,'owner');assert.equal(token,'google-offer');assert.equal(isCurrent(),true);await s.request?.()},
 subscribePlayBilling:fn=>(s.event=fn,()=>{})
 }},{}).default;
 s.render=()=>h.render(Screen);s.close=()=>h.unmount();s.pay=()=>nodes(s.render()).find(n=>n.type==='Button'&&n.props.title.startsWith('Pay '));s.render();return s;
}
(async()=>{
 let s=setup();await tick();const pay=s.pay();assert.equal(pay.props.title,'Pay ₹5.00');await Promise.all([pay.props.onPress(),pay.props.onPress()]);assert.equal(s.calls,1);assert.equal(s.orderCalls,1);
 assert.ok(JSON.stringify(s.render()).includes('Awaiting Google Play'));assert.ok(!JSON.stringify(s.render()).includes('Purchase verified'));
 s.event({type:'pending',attempt:{productId:'notes',userId:'owner'}});assert.ok(JSON.stringify(s.render()).includes('pending confirmation'));assert.equal(s.pay().props.disabled,true);s.close();
 s=setup();await tick();await s.pay().props.onPress();s.event({type:'success',attempt:{productId:'notes',userId:'foreign'}});assert.ok(!JSON.stringify(s.render()).includes('Purchase verified'));
 s.event({type:'success',attempt:{productId:'notes',userId:'owner'}});assert.ok(JSON.stringify(s.render()).includes('Purchase verified'));assert.equal(s.destination,undefined);s.close();
 s=setup();await tick();s.epoch++;s.user='other';s.auth();assert.ok(JSON.stringify(s.render()).includes('account changed'));assert.ok(!JSON.stringify(s.render()).includes('Pay ₹5.00'));assert.equal(s.calls,0);s.close();
 console.log('PASS Play summary uses Google price, prevents duplicate dispatch, waits for verification, blocks pending re-pay and ignores foreign-account success');
})().catch(e=>{console.error(e);process.exitCode=1});
