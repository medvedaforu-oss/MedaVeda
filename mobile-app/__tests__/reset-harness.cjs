const {load,hooks,rn}=require('./audit-harness.cjs');
module.exports=function setup(phase='ready'){
 const h=hooks();const controllers=[];let url='medveda://reset-password#first',listener;const reset=()=>{};
 const store={getLastDeepLinkUrl:()=>url,clearLastDeepLinkUrl:()=>{url=null},getRecoveryLinkRevision:()=>url,subscribeRecoveryLinks:fn=>(listener=fn,()=>{}),subscribeRecoveryLinkRevision:fn=>(listener=fn,()=>{})};
 const auth={parseRecoveryTokensFromUrl:u=>u,createPasswordRecovery:()=>{const c={starts:[],snapshot:()=>({phase,factors:[{id:'f',label:'factor'}]}),start:async t=>{c.starts.push(t);return c.snapshot()},dispose:()=>{},cancel:()=>{}};controllers.push(c);return c}};
 const mocks={'react':h.react,'@react-navigation/native':{useNavigation:()=>({navigate(){},reset(){}})},'react-hook-form':{Controller:'Controller',useForm:()=>({control:{},handleSubmit:f=>f,reset,formState:{errors:{}}})},'@hookform/resolvers/yup':{yupResolver:()=>{}},'../../validation/resetPasswordSchema':{},'../../features/auth/authService':auth,'../../features/auth/deepLinkStore':store,'../../theme/colors':{COLORS:{}},'../../theme/radius':{RADIUS:{}},'../../theme/spacing':{SPACING:{}}};
 const Screen=load('src/screens/auth/ResetPasswordScreen.tsx',mocks);return {h,Screen:Screen.default,controllers,link(u){url=u;listener?.()},render(){return h.render(Screen.default)}};
};
