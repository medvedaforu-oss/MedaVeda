const assert=require('node:assert/strict');
const {harness,load,jsx,nodes,tick}=require('./ui-harness.cjs');
(async()=>{
 const h=harness();let login,resolve,failedAttempts=0,signIns=0,activeUser='buyer';const alerts=[],routes=[];
 const navigation={replace:r=>routes.push(r),isFocused:()=>true};
 const mocks={react:h.react,'react/jsx-runtime':jsx,
 'react-native':{View:'View',Text:'Text',TextInput:'Input',TouchableOpacity:'Button',StyleSheet:{create:x=>x},Alert:{alert:(...args)=>alerts.push(args)},ActivityIndicator:'Spinner',ScrollView:'Scroll'},
 '@expo/vector-icons/Ionicons':{},'@react-navigation/native':{useNavigation:()=>navigation},'react-native-safe-area-context':{useSafeAreaInsets:()=>({top:0,bottom:0})},
 'react-hook-form':{Controller:'Controller',useForm:()=>({control:{},handleSubmit:fn=>{login=fn;return ()=>{};},watch:()=>'',formState:{errors:{}}})},
 '@hookform/resolvers/yup':{yupResolver(){}},'../../validation/loginSchema':{},'../../services/usersService':{fetchUserProfile:async()=>({})},'../../utils/logger':{logDebug(){}},
 '../../features/auth/identity':{parseAuthIdentifier:value=>value?{value,kind:'email'}:null},
 '../../features/auth/authService':{signInWithIdentifier:()=>{signIns++;return new Promise(r=>resolve=r);}},
 '../../features/auth/loginLockout':{getLockStatus:async()=>({locked:false}),clearLoginAttempts:async()=>{},recordFailedAttempt:async()=>{failedAttempts++;return {locked:false};},formatRemainingTime:()=>''},
 '../../services/authState':{getCurrentUser:()=>({id:activeUser})},'../../services/courseState':{resolvePostLoginRoute:async()=>'Home'},'../../components/BrandLogo':{__esModule:true,default:'Logo'}};
 for(const [file,key]of [['colors','COLORS'],['radius','RADIUS'],['shadows','SHADOW'],['spacing','SPACING']])mocks['../../theme/'+file]={[key]:{}};
 const Screen=load('mobile-app/src/screens/auth/LoginScreen.tsx',mocks).default;
 const render=()=>nodes(h.render(Screen));render();const data={identifier:'fixture@example.invalid',password:'fixture'};
 for(const error of [{name:'AuthRetryableFetchError',status:0},{status:503},{context:{status:429}}]){
  const pending=login(data);await tick();await login(data);assert.ok(render().some(n=>n.type==='Spinner'));
  resolve({data:{user:null},error});await pending;assert.equal(failedAttempts,0);assert.ok(!render().some(n=>n.type==='Spinner'));
 }
 const wrong=login(data);await tick();resolve({data:{user:null},error:{code:'invalid_credentials',status:400}});await wrong;assert.equal(failedAttempts,1);
 const success=login(data);await tick();resolve({data:{user:{id:'buyer'}},error:null});await success;assert.deepEqual(routes,['Home']);
 const changed=login(data);await tick();activeUser='other';resolve({data:{user:{id:'buyer'}},error:null});await changed;assert.deepEqual(routes,['Home']);activeUser='buyer';
 const stale=login(data);await tick();h.unmount();resolve({data:{user:{id:'buyer'}},error:null});await stale;assert.deepEqual(routes,['Home']);
 assert.equal(signIns,7);assert.equal(alerts.length,5);
 console.log('PASS slow login single flight, network/503/429 do not count as bad passwords, wrong credentials count, retry succeeds, late unmounted login cannot redirect');
})().catch(e=>{console.error(e);process.exitCode=1;});
