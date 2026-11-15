const assert = require('node:assert/strict');
const { load, jsx, nodes } = require('./ui-harness.cjs');
// No native renderer, HTTP, Supabase client or production fixtures.
const colors = load('mobile-app/src/theme/colors.ts', {}).COLORS;
const theme = {};
for (const [file, key] of [['colors','COLORS'],['fonts','FONT'],['spacing','SPACING'],['radius','RADIUS'],['shadows','SHADOW']]) {
  theme['../theme/'+file] = file === 'fonts'
    ? load('mobile-app/src/theme/typography.ts', {})
    : load('mobile-app/src/theme/'+file+'.ts', {});
}
const base = { react: {}, 'react/jsx-runtime': jsx,
  'react-native': { View:'View', Text:'Text', TouchableOpacity:'Button', ActivityIndicator:'Spinner', FlatList:'List', Platform:{OS:'android'}, StyleSheet:{create:x=>x} }, ...theme };
function luminance(hex) {
  const rgb = hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255)
    .map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);
  return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722;
}
function contrast(a,b) { const x=luminance(a),y=luminance(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); }
const style = n => Object.assign({}, ...[n.props.style].flat(Infinity).filter(Boolean));
const text = tree => nodes(tree).filter(n=>n.type==='Text').map(n=>[n.props.children].flat(Infinity).join('')).join(' ');
const buttons = tree => nodes(tree).filter(n=>n.type==='Button');
function semantics(b,disabled=false,busy=false) {
  assert.equal(b.props.accessibilityRole,'button'); assert.ok(b.props.accessibilityLabel?.length>3);
  assert.equal(b.props.accessibilityState.disabled,disabled);
  if (busy) assert.equal(b.props.accessibilityState.busy,true);
}
function target(b) { assert.ok(style(b).minHeight>=48);assert.ok(style(b).minWidth>=48);assert.equal(style(b).height,undefined); }
function readable(fg,bg) { const ratio=contrast(fg,bg);assert.ok(ratio>=4.5,`${fg} on ${bg}: ${ratio}`);return ratio; }
const products=['chapter','subject','year','bundle'].map((scope,i)=>({id:scope,title:`${scope} Notes`,scope,price:[1,2,5,5][i]}));
function panel({provider='razorpay',status='success',loading=false,purchasing=false,options=products}={}) {
  let buys=0,retries=0;
  const Panel=load('mobile-app/src/components/UnlockOptionsPanel.tsx', {...base,
    '../config/paymentProvider':{paymentProvider:provider},
    '../hooks/useBuyOptions':{__esModule:true,default:()=>({options,status,loading,error:'Connection failed',refresh:()=>retries++})},
    '../hooks/usePurchase':{__esModule:true,default:()=>({buy:()=>buys++,purchasing})},
  }).default;
  return {tree:Panel({chapterId:'c',subjectId:'s',yearId:'y',subjectTitle:'Subject',yearTitle:'Year'}),buys:()=>buys,retries:()=>retries};
}
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name);}
test('original source pairing fails normal-text AA despite meeting large-text 3:1',()=>{
  assert.equal(colors.accent,'#E2703D');assert.equal(colors.white,'#FFFFFF');
  const ratio=contrast(colors.white,colors.accent);assert.ok(ratio>3.16&&ratio<3.18);assert.ok(ratio<4.5);
  console.log('Original contrast:',ratio.toFixed(6));
});
test('actual panel action colors meet normal-text AA with unchanged brand accent',()=>{
  const {tree}=panel();for(const b of buttons(tree)) {
    target(b);const label=nodes(b).find(n=>n.type==='Text');
    assert.equal(style(label).fontSize,16);assert.equal(style(b).backgroundColor,colors.accent);
    console.log('Corrected contrast:',readable(style(label).color,style(b).backgroundColor).toFixed(6));
  }
});
test('active options expose distinct named buttons and preserve all scopes/prices',()=>{
  const ui=panel();assert.equal(buttons(ui.tree).length,4);
  for(const b of buttons(ui.tree)){semantics(b);assert.equal(b.props.disabled,false);assert.match(b.props.accessibilityLabel,/Review purchase/);b.props.onPress();}
  assert.equal(ui.buys(),4);for(const label of ['This Chapter','Full Subject: Subject','Full Year: Year','Multi-Year Bundle','₹1','₹2','₹5'])assert.ok(text(ui.tree).includes(label));
});
test('disabled production offers accurately announce unavailable and cannot buy',()=>{
  const ui=panel({provider:'disabled'});assert.match(text(ui.tree),/Previously purchased Notes remain accessible through your account/);
  for(const b of buttons(ui.tree)){semantics(b,true);assert.equal(b.props.disabled,true);assert.match(b.props.accessibilityLabel,/New purchases unavailable/);assert.doesNotMatch(b.props.accessibilityLabel,/Review purchase/);b.props.onPress();}
  assert.equal(ui.buys(),0);
});
for(const [status,loading,purchasing] of [['error',false,false],['retrying',true,false],['success',false,true]])test(`${status}/${purchasing?'purchasing':'catalog'} disables actions, retains readable labels and MV010 retry`,()=>{
  const ui=panel({status,loading,purchasing});
  for(const b of buttons(ui.tree)) {target(b);if(b.props.accessibilityLabel==='Retry loading purchase options'){
    semantics(b,loading,loading);b.props.onPress();readable(colors.white,style(b).backgroundColor);
  }else{semantics(b,true,loading||purchasing);assert.equal(b.props.disabled,true);b.props.onPress();}}
  assert.equal(ui.buys(),0);
  if(status==='error')assert.equal(ui.retries(),1);
  if(status!=='success')assert.match(text(ui.tree),/may be out of date/);
});
test('loading spinner is an accessible busy group; successful empty has no offer',()=>{
  const ui=panel({status:'loading',loading:true,options:[]});
  assert.ok(nodes(ui.tree).some(n=>n.props.accessible&&n.props.accessibilityState.busy&&n.props.accessibilityLabel==='Loading purchase options'));
  const empty=panel({status:'empty',options:[]});assert.match(text(empty.tree),/No purchase options/);assert.equal(buttons(empty.tree).length,0);
});
function poster(provider='disabled',extra={}) {
  let opens=0,buys=0;
  const Card=load('mobile-app/src/components/ProductPosterCard.tsx',{...base,'../config/paymentProvider':{paymentProvider:provider}}).default;
  return {tree:Card({title:'Anatomy',caption:'Full Subject Notes',price:2,onPress:()=>opens++,onBuyPress:()=>buys++,...extra}),opens:()=>opens,buys:()=>buys};
}
test('Store poster browse and purchase actions are independently focusable siblings',()=>{
  const ui=poster('razorpay'),[open,buy]=buttons(ui.tree);semantics(open);semantics(buy);target(buy);
  assert.equal(buttons(open).length,1);assert.ok([ui.tree.props.children].flat().includes(open));assert.ok([ui.tree.props.children].flat().includes(buy));
  assert.match(buy.props.accessibilityLabel,/Anatomy, ₹2/);open.props.onPress();buy.props.onPress();assert.equal(ui.opens(),1);assert.equal(ui.buys(),1);
  readable(style(nodes(buy).find(n=>n.type==='Text')).color,style(buy).backgroundColor);
});
test('Store unavailable and busy controls stay opaque/readable, disabled and callback guarded',()=>{
  for(const [provider,buying]of [['disabled',false],['razorpay',true]]) {
    const ui=poster(provider,{buying}),b=buttons(ui.tree)[1];semantics(b,true,buying);assert.equal(b.props.disabled,true);assert.equal(style(b).opacity,undefined);
    b.props.onPress();assert.equal(ui.buys(),0);readable(style(nodes(b).find(n=>n.type==='Text')).color,style(b).backgroundColor);
    assert.match(b.props.accessibilityLabel,provider==='disabled'?/Purchases unavailable/:/Purchase in progress/);
  }
});
test('ownership preserved on both product cards with readable status badge and browse label',()=>{
  const ui=poster('disabled',{owned:true});assert.equal(buttons(ui.tree).length,1);assert.match(buttons(ui.tree)[0].props.accessibilityLabel,/Owned/);assert.match(text(ui.tree),/✓ Owned/);
  const owned=nodes(ui.tree).find(n=>n.type==='Text'&&text(n)==='✓ Owned');readable(style(owned).color,colors.success);
  const Card=load('mobile-app/src/components/ProductCard.tsx',base).default;
  for(const owned of [false,true]){const tree=Card({title:'Notes',scope:'bundle',price:5,owned,onPress(){}});semantics(tree);target(tree);assert.match(tree.props.accessibilityLabel,owned?/Owned/:/₹5/);readable(style(nodes(tree).find(n=>style(n).fontSize===14&&style(n).color===colors.background)).color,owned?colors.success:colors.accent);}
});
test('shared payment-summary button preserves semantics and readable solid disabled background',()=>{
  const Button=load('mobile-app/src/components/CustomButton.tsx',base).default;
  for(const disabled of [false,true]){const tree=Button({title:'Continue',onPress(){},disabled});semantics(tree,disabled);target(tree);assert.equal(style(tree).opacity,undefined);readable(style(nodes(tree).find(n=>n.type==='Text')).color,style(tree).backgroundColor);}
});
test('MV009 shared retry semantics, busy callback guard, readable errors and 48-unit target',()=>{
  const ErrorState=load('mobile-app/src/components/ErrorState.tsx',base).default;let retries=0;
  for(const busy of [false,true]){const tree=ErrorState({message:'Connection failed',onRetry:()=>retries++,busy});const b=buttons(tree)[0];semantics(b,busy,busy);target(b);b.props.onPress();assert.ok(nodes(tree).some(n=>n.props.accessibilityLiveRegion==='polite'));readable(colors.white,style(b).backgroundColor);}
  assert.equal(retries,1);readable(colors.text,colors.background);readable(colors.subtitle,colors.card);
});
test('scaling stays enabled, panel cards wrap, purchase labels have no line/height caps',()=>{
  const ui=panel();for(const n of nodes(ui.tree)){assert.notEqual(n.props.allowFontScaling,false);assert.equal(n.props.maxFontSizeMultiplier,undefined);if(n.type==='Text')assert.equal(n.props.numberOfLines,undefined);}
  assert.ok(nodes(ui.tree).some(n=>style(n).flexWrap==='wrap'));
  for(const n of nodes(poster().tree).filter(n=>n.type==='Text')) {assert.equal(n.props.numberOfLines,undefined);assert.equal(style(n).height,undefined);assert.equal(style(n).lineHeight,undefined);}
});
function store(provider,owned=false,purchasing=false,loading=false) {
  const mocks={...base,react:{useCallback:f=>f},'@react-navigation/native':{useNavigation:()=>({navigate(){}}),useFocusEffect(){}},
    '../../config/paymentProvider':{paymentProvider:provider},
    '../../hooks/useStoreCatalog':{__esModule:true,default:()=>({blocks:[{}],loading,status:loading?'retrying':'success',error:'Offline',refresh(){}})},
    '../../hooks/usePurchases':{__esModule:true,default:()=>({isOwned:()=>owned,refresh(){},loading:false,error:null})},
    '../../hooks/usePurchase':{__esModule:true,default:()=>({buy(){},purchasing})}};
  for(const [k,v]of Object.entries(theme))mocks[k.replace('../','../../')]=v;
  for(const name of ['PurchaseOwnershipStatus','ProductPosterCard','SectionHeader','EmptyState','ErrorState','BottomNav'])mocks['../../components/'+name]={__esModule:true,default:name};
  const tree=load('mobile-app/src/screens/store/StoreScreen.tsx',mocks).default();
  const list=nodes(tree).find(n=>n.type==='List');
  const row=list.props.renderItem({item:{year:{id:'y',title:'Year 1'},yearProduct:products[2],subjects:[]},index:0});
  return {tree,row};
}
test('Store year action active/unavailable/owned/busy semantics and unchanged ₹5',()=>{
  for(const [provider,owned,purchasing]of [['razorpay',false,false],['disabled',false,false],['disabled',true,false],['razorpay',false,true]]){
    const {row}=store(provider,owned,purchasing),b=buttons(row)[0];semantics(b,owned||purchasing||provider==='disabled',purchasing);target(b);
    const label=nodes(b).find(n=>n.type==='Text');readable(style(label).color,style(b).backgroundColor);
    assert.match(b.props.accessibilityLabel,owned?/Owned/:provider==='disabled'?/unavailable/:/₹5/);
  }
  const {tree}=store('disabled',false,false,true);assert.equal(nodes(tree).find(n=>n.type==='ErrorState').props.busy,true);
});
console.log(`PASS MV011 ${passed} deterministic groups; native layout/TalkBack NOT VERIFIED`);
