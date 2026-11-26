const assert=require('node:assert/strict');const {load,harness,jsx,nodes}=require('./ui-harness.cjs');
(async()=>{for(const fails of [false,true]){
 const h=harness(),alerts=[],nav=[];let created=0;
 const pending=load('mobile-app/src/utils/pendingReferral.ts',{'@react-native-async-storage/async-storage':{__esModule:true,default:{setItem:async()=>{if(fails)throw Error('No storage')}}},'./logger':{logDebug(){}}});
 const components=Object.fromEntries(['ActivityIndicator','ScrollView','Text','TextInput','TouchableOpacity','View'].map(k=>[k,k]));
 const rn={...components,StyleSheet:{create:x=>x},Alert:{alert:(...args)=>alerts.push(args)}};
 const mocks={react:h.react,'react/jsx-runtime':jsx,'react-native':rn,'@react-navigation/native':{useNavigation:()=>({replace:x=>nav.push(x)})},'react-native-safe-area-context':{useSafeAreaInsets:()=>({top:0,bottom:0})},'react-hook-form':{Controller:'Controller',useForm:()=>({control:{},watch:()=>'',formState:{errors:{}},handleSubmit:fn=>()=>fn({fullName:'Student',email:'a@example.invalid',mobileNumber:'9999999999',password:'Synthetic123!',referralCode:'ABC234'})})},'@hookform/resolvers/yup':{yupResolver:()=>({})},'../../validation/registerSchema':{registerSchema:{}},'../../features/auth/identity':{parseAuthIdentifier:v=>({kind:v.includes('@')?'email':'phone',value:v})},'../../features/auth/authService':{registerWithEmailAndMobile:async()=>{created++;return {error:null}}},'../../utils/passwordStrength':{getPasswordStrength:()=>({level:'weak',label:'Weak'})},'../../utils/pendingReferral':pending,'../../theme/colors':{COLORS:{}},'../../theme/radius':{RADIUS:{}},'../../theme/spacing':{SPACING:{}},'../../components/BrandLogo':{__esModule:true,default:'BrandLogo'}};
 const Screen=load('mobile-app/src/screens/auth/RegisterScreen.tsx',mocks).default;
 const tree=nodes(h.render(Screen));const button=tree.find(n=>n.type==='TouchableOpacity'&&n.props.disabled!==undefined&&typeof n.props.onPress==='function');assert(button);await button.props.onPress();
 assert.equal(created,1);assert.equal(alerts[0][0],'Verification email sent');assert.equal(alerts[0][1].includes('could not be saved'),fails);
 alerts[0][2][0].onPress();assert.deepEqual(nav,['Login']);h.unmount();console.log('PASS registration remains successful; warning '+(fails?'shown on storage failure':'absent on success'));
}})().catch(e=>{console.error(e);process.exitCode=1});
