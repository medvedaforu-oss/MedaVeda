const assert=require('node:assert/strict');const {harness,load,tick}=require('./ui-harness.cjs');
const quizRequests=[];const clears=[],removes=[],navigations=[];const h=harness();let user='A',epoch=0;const listeners=new Set();let delayWrite;
const auth={getCurrentUser:()=>user?{id:user}:null,getAuthEpoch:()=>epoch,subscribeAuthUser:fn=>{listeners.add(fn);return()=>listeners.delete(fn);}};
const ownerStorage=load('mobile-app/src/utils/ownerStorage.ts',{'@react-native-async-storage/async-storage':{},'../services/authState':auth});
const stable={ownedScopes:[],downloads:[],refresh:async()=>{}};
const hook=load('mobile-app/src/hooks/useGlobalSearch.ts',{
 react:h.react,'react-native':{Platform:{OS:'android'},Alert:{}},'@react-navigation/native':{useNavigation:()=>({navigate:(...args)=>navigations.push(args)}),useFocusEffect:fn=>h.react.useEffect(fn,[fn])},
 './useDebounce':{__esModule:true,default:x=>x},'./useCourseYear':{__esModule:true,default:()=>({ready:true,courseId:'same'})},
 './useNetworkStatus':{__esModule:true,default:()=>true},'./usePurchases':{__esModule:true,default:()=>stable},'./useDownloads':{__esModule:true,default:()=>stable},'./usePurchase':{__esModule:true,default:()=>({})},
 '../services/searchService':{getCachedSearchIndex:async()=>null,getSearchIndex:async()=>null,applyOwnership:()=>[],searchResults:()=>[],getDiscoverySections:async()=>[]},
 '../services/quizService':{fetchQuizTestById:()=>new Promise((resolve,reject)=>quizRequests.push({resolve,reject}))},'../services/authState':auth,'../utils/ownerStorage':ownerStorage,
 '../utils/recentSearches':{getRecentSearches:async()=>[{query:`${user} private`,searchedAt:1}],recordSearch:async()=>{},removeRecentSearch:async()=>{removes.push(user);if(delayWrite)await delayWrite;},clearRecentSearches:async()=>{clears.push(user);}},
 '../types/search':{DEFAULT_FILTERS:{}},'../utils/logger':{logError(){}}
}).default;
const render=()=>h.render(hook);function change(id){user=id;epoch++;listeners.forEach(fn=>fn());}
(async()=>{
 render();await tick();assert.equal(render().recentSearches[0].query,'A private');
 const staleActions=render();const opening=staleActions.openResult({type:'quiz',id:'quiz-result',data:{id:'quiz'}});assert.equal(render().openingId,'quiz-result');change('B');assert.equal(render().recentSearches.length,0,'same-course owner change masks old history immediately');
 await tick();assert.equal(render().recentSearches[0].query,'B private');
 quizRequests[0].resolve({id:'quiz'});await opening;assert.deepEqual(navigations,[],'old quiz completion must not navigate');assert.equal(render().openingId,null,'new owner must not inherit old quiz busy state');await staleActions.clearRecentSearches();assert.deepEqual(clears,[],'old A callback must not clear current B storage');
 await staleActions.removeRecentSearch('A private');assert.deepEqual(removes,[],'old A callback must not mutate current B history');
 await staleActions.openResult({type:'notification'});assert.deepEqual(navigations,[],'old result cannot navigate into B session');
 let release;delayWrite=new Promise(r=>{release=r;});
 // remove completion is also a history reload; it must stay bound to its initiating session.
 const mutation=render().removeRecentSearch('B private');change('A');render();release();await mutation;await tick();
 assert.equal(render().recentSearches[0].query,'A private');h.unmount();assert.equal(listeners.size,0);
 console.log('PASS search masks prior owner history on same-course account switches and ignores obsolete mutations');
})().catch(e=>{console.error(e);process.exitCode=1;});
