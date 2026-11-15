const {assert,load,hooks,nodes,run}=require('./audit-harness.cjs');
run(()=>{const h=hooks();let owner=null,notify;const none=()=>{};
 const mocks={'react':h.react,'../config/paymentProvider':{paymentProvider:'disabled'},'../config/sentry':{},'@react-navigation/native':{NavigationContainer:'NavigationContainer',DefaultTheme:{colors:{}},useNavigationContainerRef:()=>({getCurrentRoute:()=>({name:'ResetPassword'})})},'@react-navigation/native-stack':{createNativeStackNavigator:()=>({Navigator:'Stack',Group:'Group',Screen:'Screen'})},'../hooks/useNotificationRouting':{default:none,__esModule:true},'../services/authState':{getCurrentUser:()=>owner,subscribeAuthUser:f=>(notify=f,none)},'../utils/logger':{logError:none},'../theme/colors':{COLORS:{}},'../services/studyReminderService':{setupNotificationChannel:async()=>{},restoreStudyReminderOnLaunch:async()=>{}},'../hooks/usePreventScreenshot':{default:none,__esModule:true},'../components/ErrorBoundary':{default:'Boundary',__esModule:true},'../features/auth/deepLinkStore':{getInitialDeepLinkUrl:async()=>null,subscribeDeepLinks:none,getRecoveryScheme:()=> 'medveda'}};
 for(const name of ['Splash','Login','Register','ForgotPassword','ResetPassword'])mocks['../screens/auth/'+name+'Screen']={default:name,__esModule:true};
 mocks['../screens/home/HomeScreen']={default:'Home',__esModule:true};mocks['../screens/onboarding/SelectCourseYearScreen']={default:'Onboarding',__esModule:true};
 const App=load('src/navigation/AppNavigator.tsx',mocks).default;
 const groups=()=>nodes(h.render(App)).filter(n=>n.type==='Group');
 const groupFor=name=>groups().find(g=>nodes(g).some(n=>n.type==='Screen'&&n.props.name===name));
 const first=groupFor('ResetPassword').props.navigationKey;
 for(const id of ['A','B',null]){owner=id?{id}:null;notify();assert.equal(groupFor('ResetPassword').props.navigationKey,first,'recovery route lifetime across owner '+id);if(id)assert.notEqual(groupFor('Home').props.navigationKey,first,'protected routes stay owner keyed')}
 h.unmount();console.log('Route declaration invariance verified; mounted native navigation DEVICE TEST PENDING');});
