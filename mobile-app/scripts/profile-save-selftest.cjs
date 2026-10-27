const assert=require('node:assert/strict');const {harness,load,jsx,nodes,tick}=require('./ui-harness.cjs');
(async()=>{
 const h=harness();let finish,fail=true,updates=0,profiles=0,successes=0;
 const mocks={react:h.react,'react/jsx-runtime':jsx,'react-native':{View:'View',Text:'Text',TextInput:'Input',TouchableOpacity:'Button',ActivityIndicator:'Spinner',StyleSheet:{create:x=>x},Alert:{alert:title=>{if(title==='Success')successes++;}}},'@react-navigation/native':{useNavigation:()=>({goBack(){}})},'../../config/supabase':{supabase:{auth:{updateUser:()=>{updates++;return new Promise(r=>finish=()=>r({error:fail?Error('rejected'):null}));}}}},'../../services/authState':{getCurrentUser:()=>({id:'buyer',user_metadata:{name:'Student'}})},'../../services/usersService':{fetchUserProfile:async()=>({name:'Student'}),updateUserProfile:async()=>{profiles++;}},'../../utils/phone':{normalizePhoneNumber:x=>x},'../../utils/logger':{logError(){}}};
 for(const [file,key]of [['colors','COLORS'],['radius','RADIUS'],['shadows','SHADOW'],['spacing','SPACING']])mocks['../../theme/'+file]={[key]:{}};
 const Screen=load('mobile-app/src/screens/profile/EditProfileScreen.tsx',mocks).default;
 h.render(Screen);await tick();const button=nodes(h.render(Screen)).find(n=>n.type==='Button');
 let saving=button.props.onPress();await button.props.onPress();assert.equal(updates,1);finish();await saving;assert.equal(profiles,0);assert.equal(successes,0);
 fail=false;saving=button.props.onPress();finish();await saving;assert.equal(profiles,1);assert.equal(successes,1);
 console.log('PASS profile auth rejection prevents misleading success and profile writes; double tap and retry');
})().catch(e=>{console.error(e);process.exitCode=1;});
