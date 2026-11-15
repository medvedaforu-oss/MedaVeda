const assert=require('node:assert/strict');
const {harness,load,jsx,nodes,tick}=require('./ui-harness.cjs');
(async()=>{
 for(const expiry of [null,0,30]){
  const h=harness();
  const settings={friendDiscountPercent:10,friendDiscountMax:null,referrerCreditAmount:50,creditHoldDays:7,walletProductTypes:['notes'],walletMaxPercent:50,creditExpiryDays:expiry};
  const Screen=load('mobile-app/src/screens/referral/ReferralTermsScreen.tsx',{
   react:h.react,'react/jsx-runtime':jsx,
   'react-native':{ScrollView:'ScrollView',Text:'Text',ActivityIndicator:'ActivityIndicator',View:'View',TouchableOpacity:'TouchableOpacity',Linking:{},StyleSheet:{create:s=>s}},
   '@react-navigation/native':{useNavigation:()=>({goBack(){}})},
   '../../services/referralsService':{fetchReferralSettings:async()=>settings,formatRupees:n=>`₹${n}`,walletProductsText:()=> 'notes'},
   '../../theme/colors':{COLORS:{}},'../../theme/fonts':{FONT:{}},'../../theme/spacing':{SPACING:{}}
  }).default;
  h.render(Screen);await tick();await tick();
  const tree=h.render(Screen);
  const text=nodes(tree).filter(n=>n.type==='Text').map(n=>n.props.children).flat(Infinity).join(' ');
  assert.ok(text.includes('review or a dispute may delay availability'));
  assert.ok(text.includes('Existing credits keep their dates'));
  assert.equal(text.includes('New rewards expire 30 days after they actually become available.'),expiry===30);
  assert.ok(text.includes('refund after release may recover the reward from your available balance'),'provider recovery policy missing from terms');
  console.log(`PASS rendered wallet terms expiry=${expiry}`);
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
