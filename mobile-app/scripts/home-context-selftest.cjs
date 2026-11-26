const assert = require('node:assert/strict');
const fs = require('node:fs');
const {harness, load, jsx, nodes, tick} = require('./ui-harness.cjs');
const h = harness(); let user = 'A', epoch = 0, course = 'A';
const courseListeners = new Set(), authListeners = new Set();
const auth = {getCurrentUser:()=>user ? {id:user}:null, getAuthEpoch:()=>epoch,
  getCurrentUserDisplayName:()=>user, subscribeAuthUser:fn=>{authListeners.add(fn);return()=>authListeners.delete(fn);}};
const courseState = {getCourseYear:()=>({status:'ready',courseId:course,yearId:'year'}),
  subscribeCourseYear:fn=>{courseListeners.add(fn);return()=>courseListeners.delete(fn);}, needsCourseYearSelection:()=>false};
const requests = []; const years = id=>new Promise((resolve,reject)=>requests.push({course:id,resolve,reject}));
const stablePurchases = {isOwned:()=>false,refresh:async()=>{},loading:false};
const mocks = {react:{...h.react,__esModule:true,default:{}},'react/jsx-runtime':jsx,
  'react-native':{...Object.fromEntries(['View','Text','ScrollView','RefreshControl','TouchableOpacity','FlatList','ActivityIndicator'].map(x=>[x,x])),StyleSheet:{create:x=>x},Platform:{OS:'android'},Alert:{alert(){}}},
  '@react-navigation/native':{useNavigation:()=>({}),useFocusEffect:fn=>h.react.useEffect(fn,[fn])},
  '../../services/yearsService':{fetchYears:years},'../../services/productsService':{fetchProductsByYear:async()=>[]},
  '../../services/purchasesService':{fetchMyPurchases:async()=>[]},
  '../../services/notificationsService':{fetchNotifications:async()=>[],getUnreadNotificationCount:async()=>0},
  '../../services/chaptersService':{fetchLatestChapters:async()=>[],fetchRecommendedChapters:async()=>[]},
  '../../utils/recentActivity':{getLastViewedChapter:async()=>null,getRecentChapters:async()=>[]},
  '../../hooks/useQuizStats':{__esModule:true,default:()=>({totalAttempts:0,averagePercentage:0})},
  '../../hooks/usePurchases':{__esModule:true,default:()=>stablePurchases},
  '../../hooks/usePurchase':{__esModule:true,default:()=>({})},
  '../../hooks/useCourseYear':{__esModule:true,default:()=>({...courseState.getCourseYear(),ready:true})},
  '../../hooks/usePurchaseResource':{__esModule:true,default:()=>({value:[],refresh:stablePurchases.refresh})},
  '../../services/courseState':courseState,'../../services/authState':auth,
  '../../services/analyticsService':{logAppOpen(){}},'../../services/referralsService':{applyPendingReferralCode:async()=>null},
  '../../utils/logger':{logError(){}},
};
for (const name of ['PurchaseOwnershipStatus','YearCard','HomeHeader','StudentProfileCard','ContinueLearningCard','DailyQuoteCard','SectionHeader','NotificationRow','MiniChapterCard','BottomNav','StaggerItem','ProductCard','ProductPosterCard','FeatureCard']) mocks[`../../components/${name}`]={__esModule:true,default:name};
mocks['../../components/Skeleton']={SkeletonBlock:'SkeletonBlock',SkeletonCardRow:'SkeletonCardRow',SkeletonStrip:'SkeletonStrip'};
for (const [file,name] of [['colors','COLORS'],['fonts','FONT'],['spacing','SPACING'],['radius','RADIUS'],['shadows','SHADOW']]) mocks[`../../theme/${file}`]={[name]:{}};
if (fs.existsSync(__dirname+'/../src/hooks/useDashboardResource.ts')) mocks['../../hooks/useDashboardResource']={__esModule:true,...load('mobile-app/src/hooks/useDashboardResource.ts',{
  react:h.react,'../services/authState':auth,'../services/courseState':courseState,'../utils/logger':{logError(){}}
})};
const Home=load('mobile-app/src/screens/home/HomeScreen.tsx',mocks).default;
const render=()=>h.render(Home);
const titles=()=>nodes(render()).filter(n=>n.type==='YearCard').map(n=>n.props.title);
function change(nextCourse,nextUser=user){course=nextCourse;if(user!==nextUser){user=nextUser;epoch++;authListeners.forEach(fn=>fn());}courseListeners.forEach(fn=>fn());}
function finish(start,title){requests.slice(start).forEach(r=>r.resolve([{id:title,title}]));}
(async()=>{
 render();const b=requests.length;change('B');render();finish(b,'B');await tick();assert.deepEqual(titles(),['B']);
 finish(0,'A');await tick();assert.deepEqual(titles(),['B'],'late course A must not replace B');
 const firstA=requests.length;change('A');render();change('B');render();const secondA=requests.length;change('A');render();
 finish(secondA,'A-current');await tick();requests.slice(firstA,secondA).forEach(r=>r.resolve([{id:'stale',title:'stale'}]));await tick();
 assert.deepEqual(titles(),['A-current'],'A-to-B-to-A abandons the first A generation');
 const pending=requests.length;change('C');render();change('C',null);render();finish(pending,'signed-out');await tick();assert.deepEqual(titles(),[],'logout hides and rejects pending personal context');
 change('D','B');render();const refreshNode=nodes(render()).find(n=>n.type==='ScrollView').props.refreshControl;
 refreshNode.props.onRefresh();const latest=requests.length;change('E');render();finish(latest,'E');await tick();
 requests.slice(pending,latest).forEach(r=>r.reject(Error('offline')));await tick();assert.deepEqual(titles(),['E'],'stale refresh failures cannot restore old content');
 const g=requests.length;change('G');render();const next=requests.length;change('H');render();
 requests.slice(g,next).forEach(r=>r.resolve([{id:'G',title:'G'}]));await tick();
 const children=nodes(render()).find(n=>n.type==='ScrollView').props.children.flat(Infinity);
 const academic=children.findIndex(n=>n?.props?.title==='Academic Years');
 assert.equal(children[academic+1].type,'SkeletonCardRow','stale completion cannot stop current-context loading');
 finish(next,'H');await tick();assert.deepEqual(titles(),['H']);
 const beforeUnmount=requests.length;change('F');render();h.unmount();finish(beforeUnmount,'unmounted');await tick();
 assert.equal(authListeners.size,0);assert.equal(courseListeners.size,0);
 console.log('PASS actual Home course/account generations, A-B-A, logout, stale refresh failures and unmount');
})().catch(e=>{console.error(e);process.exitCode=1;});
