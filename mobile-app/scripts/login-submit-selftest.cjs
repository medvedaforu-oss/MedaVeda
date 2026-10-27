const assert=require('node:assert/strict');
const {harness,load,jsx,nodes}=require('./ui-harness.cjs');
(async()=>{
 const h=harness();let login,finishLock,signIns=0,alerts=0,fail=true;
 const mocks={react:{...h.react,useEffect(){}},'react/jsx-runtime':jsx,'react-native':{View:'View',Text:'Text',TextInput:'Input',TouchableOpacity:'Button',StyleSheet:{create:x=>x},Alert:{alert:()=>alerts++},ActivityIndicator:'Spinner',ScrollView:'Scroll'},'@expo/vector-icons/Ionicons':{},'@react-navigation/native':{useNavigation:()=>({replace(){}})},'react-native-safe-area-context':{useSafeAreaInsets:()=>({top:0,bottom:0})},'react-hook-form':{Controller:'Controller',useForm:()=>({control:{},handleSubmit:fn=>{login=fn;return ()=>{};},watch:()=>'',formState:{errors:{}}})},'@hookform/resolvers/yup':{yupResolver(){}},'../../validation/loginSchema':{},'../../services/usersService':{fetchUserProfile:async()=>({})},'../../utils/logger':{logDebug(){}},'../../features/auth/identity':{parseAuthIdentifier:()=>({value:'fixture',kind:'email'})},'../../features/auth/authService':{signInWithIdentifier:async()=>{signIns++;return {data:{user:{id:'buyer'}}};}},'../../features/auth/loginLockout':{getLockStatus:()=>new Promise((resolve,reject)=>{finishLock=()=>fail?reject(Error('keystore unavailable')):resolve({locked:false});}),clearLoginAttempts:async()=>{},formatRemainingTime:()=>''},'../../services/courseState':{resolvePostLoginRoute:async()=>'Home'},'../../components/BrandLogo':{__esModule:true,default:'Logo'}};
 for(const [file,key]of [['colors','COLORS'],['radius','RADIUS'],['shadows','SHADOW'],['spacing','SPACING']])mocks['../../theme/'+file]={[key]:{}};
 const Screen=load('mobile-app/src/screens/auth/LoginScreen.tsx',mocks).default;
 h.render(Screen);const data={identifier:'fixture@example.invalid',password:'fixture'};
 let first=login(data);await login(data);finishLock();await first;assert.equal(signIns,0);assert.equal(alerts,1);
 fail=false;first=login(data);await login(data);finishLock();await first;assert.equal(signIns,1);
 assert.ok(!nodes(h.render(Screen)).some(n=>n.type==='Spinner'));
 console.log('PASS secure lockout read failure handled; retry works; login double taps coalesced');
})().catch(e=>{console.error(e);process.exitCode=1;});
