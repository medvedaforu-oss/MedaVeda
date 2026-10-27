const assert = require('node:assert/strict');
const { harness, load, jsx, nodes, tick } = require('./ui-harness.cjs');
async function fixture(options = {}) {
  const h = harness(); const timers = new Map(); let sequence = 0, event, calls = 0, orders = 0, user = 'buyer';
  const nav = [];
  const Screen = load('mobile-app/src/screens/payment/PlayBillingScreen.tsx', {
    react: h.react, 'react/jsx-runtime': jsx,
    'react-native': { ActivityIndicator: 'Spinner', ScrollView: 'Scroll', View: 'View', Text: 'Text', TouchableOpacity: 'Button', Platform: {OS:'android'}, StyleSheet: {create:x=>x} },
    '@react-navigation/native': { useNavigation: () => ({navigate: (...args)=>nav.push(args),dispatch: value=>nav.push(value)}),useRoute:()=>({params:{productId:'product',productTitle:'Notes'}}),CommonActions:{reset:x=>x} },
    '../../services/playBillingService': {
      subscribePlayBilling: fn=>{event=fn; return ()=>{event=null;};},
      createPlayOrder:async()=>{orders++;return {internalOrderId:'order',playSku:'sku',purchaseOptionId:'option',amountInr:49};},
      fetchMatchingPlayProduct:async()=>({offerToken:'offer',formattedPrice:'₹49'}),
      startPlayPurchase:async()=>{calls++;},
    },
    '../../services/referralsService': {fetchOrderQuote:options.quote || (async()=>({ok:true,listPrice:49}))},
    '../../config/supabase': {supabase:{auth:{getSession:async()=>({data:{session:{user:{id:user}}}})}}},
    '../../config/paymentProvider': {paymentProvider:'play'},
    '../../theme/colors':{COLORS:{}},'../../theme/fonts':{FONT:{}},'../../theme/spacing':{SPACING:{}},
  }, {setTimeout:(fn,ms)=>{assert.equal(ms,30000);timers.set(++sequence,fn);return sequence;},clearTimeout:id=>timers.delete(id)}).default;
  const render=()=>h.render(Screen);
  render(); render(); await tick();
  const text=()=>JSON.stringify(render());
  const button=()=>nodes(render()).find(n=>n.type==='Button');
  return {h,render,text,button,nav,timers,emit:e=>event(e),get calls(){return calls;},get orders(){return orders;},setUser:id=>{user=id;}};
}
(async()=>{
  let release;
  let f=await fixture({quote:()=>new Promise(r=>{release=r;})});
  for(const fn of [...f.timers.values()]) fn();
  assert.match(f.text(),/took too long/); assert.ok(!f.text().includes('Spinner'));
  release({ok:true,listPrice:49});await tick();assert.equal(f.orders,0,'late quote must not create an order');f.h.unmount();
  f=await fixture(); const pay=f.button();pay.props.onPress();pay.props.onPress();await tick();f.render();
  assert.equal(f.calls,1,'same-frame double tap starts only one checkout');
  for(const fn of [...f.timers.values()]) fn();
  assert.match(f.text(),/Do not pay again/); assert.match(f.text(),/Check Google Play purchases/);
  f.button().props.onPress();assert.equal(f.nav.at(-1)[0],'MyPurchases');
  f.emit({type:'success',attempt:{internalOrderId:'order'},result:{success:true}});
  assert.equal(f.nav.at(-1).routes[1].name,'PaymentSuccess','late verified success remains usable');f.h.unmount();
  for(const type of ['pending','cancel','error']) {
    f=await fixture();f.button().props.onPress();await tick();
    f.emit({type,attempt:{internalOrderId:'order'},message:'Item already owned'});
    if(type==='pending')assert.equal(f.nav.at(-1).routes[1].params.pending,true);
    if(type==='cancel')assert.match(f.text(),/Payment cancelled/);
    if(type==='error')assert.match(f.text(),/Check Google Play purchases/);
    f.h.unmount();
  }
  f=await fixture();f.setUser('other');f.button().props.onPress();await tick();
  assert.equal(f.calls,0);assert.match(f.text(),/Account changed/);f.h.unmount();
  f=await fixture({quote:async()=>{throw Error('offline');}});assert.match(f.text(),/offline/);assert.match(f.text(),/Try again/);f.h.unmount();
  console.log('PASS checkout stalls, late result, double tap, pending/cancel/error/already-owned recovery, offline and account switch');
})().catch(e=>{console.error(e);process.exitCode=1;});
