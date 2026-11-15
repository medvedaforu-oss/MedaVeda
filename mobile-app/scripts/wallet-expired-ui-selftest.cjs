const assert=require('node:assert/strict');
const {harness,load,jsx,nodes,tick}=require('./ui-harness.cjs');
(async()=>{
 const h=harness();const navigation={navigate(){}};
 const Screen=load('mobile-app/src/screens/referral/ReferralScreen.tsx',{
  react:h.react,'react/jsx-runtime':jsx,
  'react-native':{View:'View',Text:'Text',ScrollView:'ScrollView',Share:{},Alert:{},ActivityIndicator:'ActivityIndicator',TouchableOpacity:'TouchableOpacity',StyleSheet:{create:s=>s}},
  '@react-navigation/native':{useFocusEffect:cb=>h.react.useEffect(cb,[]),useNavigation:()=>navigation},'expo-clipboard':{},
  '../../components/CustomButton':{default:'CustomButton'},'../../components/EmptyState':{default:'EmptyState'},'../../components/ErrorState':{default:'ErrorState'},
  '../../services/authState':{getCurrentUser:()=>({id:'synthetic'})},'../../services/usersService':{fetchUserProfile:async()=>({})},
  '../../services/referralsService':{fetchReferralSettings:async()=>({enabled:false}),fetchMyWallet:async()=>({available:0,pending:0,totalEarned:0,expired:50}),fetchMyReferralList:async()=>[],formatRupees:n=>`₹${n??0}`,walletProductsText:()=> 'notes'},
  '../../theme/colors':{COLORS:{}},'../../theme/fonts':{FONT:{}},'../../theme/spacing':{SPACING:{}},'../../theme/radius':{RADIUS:{}},'../../utils/logger':{logError(){}}
 }).default;
 h.render(Screen);await tick();await tick();
 const text=nodes(h.render(Screen)).filter(n=>n.type==='Text').map(n=>n.props.children).flat(Infinity).join(' ');
 assert.ok(text.includes('Expired balance:  ₹50'),'expired-only wallet must remain visible when program is disabled');
 console.log('PASS rendered expired-only wallet remains visible when referral program is disabled');
})().catch(e=>{console.error(e);process.exitCode=1;});
