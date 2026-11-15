const assert = require('node:assert/strict');
const { harness, load, jsx, nodes, tick } = require('./ui-harness.cjs');
let passed = 0;
const year = (id = 'year', order = 1) => ({ id, title: id, order });
const subject = (id = 'subject', order = 1) => ({ id, title: id, order });
const product = (price = 1, scope = 'subject') => ({ id: 'p' + price, price, scope, yearId: 'year', subjectId: 'subject' });
const block = (id = 'year', price = 1) => ({ year: year(id), yearProduct: product(price, 'year'), subjects: [subject()], subjectProducts: { subject: product(price) } });
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
function setup() {
  const h = harness(), requests = [], timers = new Set(), authListeners = new Set(), courseListeners = new Set();
  let user = { id: 'alice' }, course = { status: 'ready', courseId: 'course' }, writes = 0, profile = null, profileReads = 0;
  const react = { ...h.react, useState(initial) { const [v,set] = h.react.useState(initial); return [v, next => { writes++; set(next); }]; } };
  const auth = { getCurrentUser: () => user, subscribeAuthUser(fn) { authListeners.add(fn); return () => authListeners.delete(fn); } };
  const courseState = { getCourseYear: () => course, subscribeCourseYear(fn) { courseListeners.add(fn); return () => courseListeners.delete(fn); }, loadCourseYear: force => { assert.equal(force,true); profileReads++; return profile?.promise ?? Promise.resolve(course); } };
  const api = load('mobile-app/src/hooks/useStoreCatalog.ts', {
    react, '../services/authState': auth, '../services/courseState': courseState,
    '../services/storeCatalogService': { fetchStoreCatalog(courseId) { const d = deferred(); requests.push({ ...d, courseId }); return d.promise; } },
  }, { setTimeout(fn, ms) { assert.equal(ms, 15000); const t = { fn }; timers.add(t); return t; }, clearTimeout(t) { timers.delete(t); } });
  return { hook: api.default, profileReads: () => profileReads, react, requests, timers, render: fn => h.render(fn), read: () => h.render(api.default),
    course(next) { course = next; courseListeners.forEach(fn => fn()); },
    user(next) { user = next; authListeners.forEach(fn => fn()); },
    pendingProfile() { profile = deferred(); return profile; },
    timeout() { [...timers].forEach(t => t.fn()); }, writes: () => writes,
    unmount() { h.unmount(); assert.equal(timers.size,0); assert.equal(authListeners.size,0); assert.equal(courseListeners.size,0); },
  };
}
function service(overrides = {}) {
  const calls = [];
  return { calls, ...load('mobile-app/src/services/storeCatalogService.ts', {
    '../repositories/yearsRepository': { getActiveYears: async id => { calls.push(['years',id]); return [year()]; }, ...overrides.years },
    '../repositories/subjectsRepository': { getSubjectsByYear: async id => { calls.push(['subjects',id]); return [subject()]; }, ...overrides.subjects },
    './productsService': { fetchProductsByYear: async id => { calls.push(['yearProducts',id]); return [product(5,'year')]; },
      fetchProductsBySubject: async id => { calls.push(['subjectProducts',id]); return [product(2)]; }, ...overrides.products },
  }) };
}
function screen(s) {
  let ownershipRefreshes = 0, buyCalls = 0, owned = false;
  const navigations = [], focus = [];
  const mocks = { react: s.react, 'react/jsx-runtime': jsx,
    'react-native': { View:'View',Text:'Text',FlatList:'List',TouchableOpacity:'Button',ActivityIndicator:'Spinner',StyleSheet:{create:x=>x},Platform:{OS:'android'} },
    '@react-navigation/native': { useNavigation:()=>({navigate:(...args)=>navigations.push(args)}), useFocusEffect:fn=>{ focus.push(fn); } },
    '../../config/paymentProvider': { paymentProvider:'disabled' },
    '../../hooks/useStoreCatalog': { __esModule:true, default:s.hook },
    '../../hooks/usePurchases': { __esModule:true, default:()=>({isOwned:()=>owned,refresh:()=>ownershipRefreshes++,loading:false,error:null}) },
    '../../hooks/usePurchase': { __esModule:true,default:()=>({buy:()=>buyCalls++,purchasing:false}) },
  };
  for(const name of ['PurchaseOwnershipStatus','ProductPosterCard','SectionHeader','EmptyState','ErrorState','BottomNav']) mocks['../../components/'+name]={__esModule:true,default:name};
  for(const [file,key]of [['colors','COLORS'],['fonts','FONT'],['spacing','SPACING'],['radius','RADIUS']])mocks['../../theme/'+file]={[key]:{}};
  const Screen=load('mobile-app/src/screens/store/StoreScreen.tsx',mocks).default;
  return { read:()=>s.render(Screen), focus:()=>focus.at(-1)(), navigations,
    owned(v){owned=v;}, ownershipRefreshes:()=>ownershipRefreshes, buys:()=>buyCalls };
}
async function test(name, fn) { await fn(); passed++; console.log('PASS '+name); }
(async()=>{
  await test('successful live snapshot sorts years/subjects, selects products, preserves testing prices',async()=>{
    const a=service({ years:{getActiveYears:async()=>[year('later',2),year('first',1)]}, subjects:{getSubjectsByYear:async()=>[subject('b',2),subject('a',1)]} });
    const result=await a.fetchStoreCatalog('course');
    assert.equal(result[0].year.id,'first'); assert.equal(result[0].subjects[0].id,'a');
    assert.equal(result[0].yearProduct.price,5);assert.equal(result[0].subjectProducts.a.price,2);
    for(const price of [1,2,5]){const p=product(price);const r=await service({products:{fetchProductsBySubject:async()=>[p]}}).fetchStoreCatalog('course');assert.equal(r[0].subjectProducts.subject.price,price);}
  });
  await test('successful empty years executes no child reads; repeated calls issue fresh repository reads',async()=>{
    let reads=0; const a=service({years:{getActiveYears:async()=>{reads++;return [];}}});
    assert.equal((await a.fetchStoreCatalog('c')).length,0);await a.fetchStoreCatalog('c');assert.equal(reads,2);assert.equal(a.calls.length,0);
  });
  await test('empty subjects is successful, absent products remain null',async()=>{
    const a=service({subjects:{getSubjectsByYear:async()=>[]},products:{fetchProductsByYear:async()=>[]}});
    const r=await a.fetchStoreCatalog('c');assert.equal(r[0].subjects.length,0);assert.equal(r[0].yearProduct,null);
    assert.ok(!a.calls.some(c=>c[0]==='subjectProducts'));
  });
  for(const stage of ['years','subjects','yearProduct','subjectProduct']) await test(stage+' rejection rejects entire snapshot, including partial data',async()=>{
    const fail=async()=>{throw new Error('network');};
    const overrides=stage==='years'?{years:{getActiveYears:fail}}:stage==='subjects'?{subjects:{getSubjectsByYear:fail}}:{products:{[stage==='yearProduct'?'fetchProductsByYear':'fetchProductsBySubject']:fail}};
    await assert.rejects(service(overrides).fetchStoreCatalog('c'),/network/);
  });
  await test('hook success and successful empty replacement',async()=>{
    const s=setup();assert.equal(s.read().status,'loading');s.requests[0].resolve([block()]);await tick();assert.equal(s.read().status,'success');
    const p=s.read().refresh();s.requests[1].resolve([]);await p;assert.equal(s.read().status,'empty');assert.equal(s.read().blocks.length,0);s.unmount();
  });
  for(const [name,error,pattern]of [['network',new TypeError('Network request failed'),/connection/],['unauthorized',{status:401},/Sign in/],['JWT expired',{code:'PGRST301'},/Sign in/],['forbidden',{status:403},/Sign in/],['server',{status:503},/temporarily unavailable/],['PostgREST unavailable',{code:'PGRST002'},/temporarily unavailable/],['Postgres server error',{code:'XX000'},/temporarily unavailable/],['API timeout',new Error('request timed out'),/timed out/]])await test(name+' is error, never empty; Retry issues fresh request and recovers',async()=>{
    const s=setup();s.read();s.requests[0].reject(error);await tick();assert.equal(s.read().status,'error');assert.match(s.read().error,pattern);assert.equal(s.read().loading,false);
    const p=s.read().refresh();assert.equal(s.read().status,'retrying');assert.equal(s.requests.length,2);s.requests[1].resolve([block()]);await p;assert.equal(s.read().status,'success');s.unmount();
  });
  await test('deadline releases hung read; duplicate Retry/refresh taps cannot start concurrent requests; late timeout ignored',async()=>{
    const s=setup();s.read();await s.read().refresh();assert.equal(s.requests.length,1);
    s.timeout();await tick();assert.equal(s.read().status,'error');assert.match(s.read().error,/timed out/);
    const p=s.read().refresh();await s.read().refresh();await s.read().refresh();assert.equal(s.requests.length,2);
    s.requests[1].resolve([block('new')]);await p;s.requests[0].resolve([block('old')]);await tick();assert.equal(s.read().blocks[0].year.id,'new');s.unmount();
  });
  await test('A slow / B fast, rapid A-B-C-A switches reject obsolete success and failure',async()=>{
    const s=setup();s.read();s.course({status:'ready',courseId:'b'});assert.equal(s.read().blocks.length,0);
    s.requests[1].resolve([block('b')]);await tick();s.requests[0].resolve([block('a')]);await tick();assert.equal(s.read().blocks[0].year.id,'b');
    s.course({status:'ready',courseId:'c'});assert.equal(s.read().blocks.length,0);s.course({status:'ready',courseId:'course'});
    s.requests[3].resolve([block('new-a')]);await tick();s.requests[2].reject(new Error('late c'));await tick();assert.equal(s.read().blocks[0].year.id,'new-a');assert.equal(s.read().error,null);s.unmount();
  });
  await test('A fast cannot finish B loading; course failures never retain previous-course snapshot',async()=>{
    const s=setup();s.read();s.course({status:'ready',courseId:'b'});s.requests[0].resolve([block('a')]);await tick();assert.equal(s.read().loading,true);
    s.requests[1].resolve([block('b')]);await tick();s.course({status:'ready',courseId:'c'});s.requests[2].reject(new Error('offline'));await tick();assert.equal(s.read().status,'error');assert.equal(s.read().blocks.length,0);s.unmount();
  });
  await test('same-course refresh retains complete snapshot while retrying and on failure, then replaces it',async()=>{
    const s=setup();s.read();s.requests[0].resolve([block('confirmed')]);await tick();const p=s.read().refresh();assert.equal(s.read().blocks[0].year.id,'confirmed');assert.equal(s.read().status,'retrying');
    s.requests[1].reject(new Error('products failed'));await p;assert.equal(s.read().status,'error');assert.equal(s.read().blocks[0].year.id,'confirmed');
    const retry=s.read().refresh();s.requests[2].resolve([block('fresh')]);await retry;assert.equal(s.read().blocks[0].year.id,'fresh');s.unmount();
  });
  await test('account switch and same-ID logout/login clear snapshots and pending requests',async()=>{
    const s=setup();s.read();s.requests[0].resolve([block('alice')]);await tick();const p=s.read().refresh();s.user({id:'bob'});assert.equal(s.read().blocks.length,0);
    s.requests[1].resolve([block('late-alice')]);await p;s.requests[2].resolve([]);await tick();assert.equal(s.read().status,'empty');
    const old=s.read().refresh();s.user(null);await tick();assert.equal(s.read().blocks.length,0);assert.match(s.read().error,/Sign in/);s.user({id:'bob'});
    s.requests[4].resolve([]);s.requests[3].resolve([block('old-bob')]);await old;await tick();assert.equal(s.read().blocks.length,0);s.unmount();
  });
  await test('unmount ignores late success/rejection, cancels deadlines and subscriptions',async()=>{
    for(const fail of [false,true]){const s=setup();s.read();s.unmount();const before=s.writes();if(fail)s.requests[0].reject(new Error('late'));else s.requests[0].resolve([block()]);await tick();assert.equal(s.writes(),before);await s.read().refresh();assert.equal(s.writes(),before);}
  });
  await test('context load failure, context timeout, missing course and context recovery never spin forever or fetch unscoped years',async()=>{
    for(const mode of ['failure','timeout','missing']){const s=setup();s.course({status:mode==='missing'?'ready':'error'});const profile=s.pendingProfile();s.read();
      if(mode==='timeout')s.timeout();else if(mode==='failure')profile.resolve({status:'error'});
      await tick();assert.equal(s.read().status,'error');assert.equal(s.requests.length,0);
      s.course({status:'ready',courseId:'recovered'});s.requests[0].resolve([]);await tick();assert.equal(s.read().status,'empty');profile.resolve({status:'ready',courseId:'old'});await tick();assert.equal(s.read().blocks.length,0);s.unmount();}
  });
  await test('actual hook and Store screen: network failure -> visible Retry -> fresh request -> genuine empty',async()=>{
    const s=setup(), ui=screen(s);ui.read();s.requests[0].reject(new Error('offline'));await tick();
    let tree=nodes(ui.read());assert.ok(!tree.some(n=>n.type==='List'));tree.find(n=>n.type==='ErrorState').props.onRetry();
    tree=nodes(ui.read());assert.ok(tree.some(n=>n.type==='Spinner'));assert.equal(s.requests.length,2);
    s.requests[1].resolve([]);await tick();tree=nodes(ui.read());assert.ok(!tree.some(n=>n.type==='ErrorState'));
    assert.match(tree.find(n=>n.type==='List').props.ListEmptyComponent.props.title,/No Academic Years Found/);s.unmount();
  });
  await test('late profile completion after deadline cannot start catalog reads; Retry starts a fresh context read',async()=>{
    const s=setup();s.course({status:'loading'});const profile=s.pendingProfile();s.read();s.timeout();await tick();
    profile.resolve({status:'ready',courseId:'late'});await tick();assert.equal(s.requests.length,0);assert.equal(s.read().status,'error');const fresh=s.pendingProfile();const retry=s.read().refresh();assert.equal(s.profileReads(),2);fresh.resolve({status:'error'});await retry;assert.equal(s.read().status,'error');s.unmount();
  });
  // Actual screen rendering with controlled hook states exercises branch selection,
  // refresh wiring, retained-data copy, product props and existing navigation.
  await test('actual Store UI distinguishes loading/empty/error/retrying/stale; Retry and pull refresh wired',async()=>{
    const h=harness();let current,refreshes=0,ownershipRefreshes=0,buys=0,owned=false,focus;
    const navigations=[];
    const mocks={react:h.react,'react/jsx-runtime':jsx,
      'react-native':{View:'View',Text:'Text',FlatList:'List',TouchableOpacity:'Button',ActivityIndicator:'Spinner',StyleSheet:{create:x=>x},Platform:{OS:'android'}},
      '@react-navigation/native':{useNavigation:()=>({navigate:(...v)=>navigations.push(v)}),useFocusEffect:fn=>{focus=fn;}},
      '../../config/paymentProvider':{paymentProvider:'disabled'},
      '../../hooks/useStoreCatalog':{__esModule:true,default:()=>({...current,refresh:()=>refreshes++})},
      '../../hooks/usePurchases':{__esModule:true,default:()=>({isOwned:()=>owned,refresh:()=>ownershipRefreshes++,loading:false,error:null})},
      '../../hooks/usePurchase':{__esModule:true,default:()=>({buy:()=>buys++,purchasing:false})},
    };
    for(const name of ['PurchaseOwnershipStatus','ProductPosterCard','SectionHeader','EmptyState','ErrorState','BottomNav'])mocks['../../components/'+name]={__esModule:true,default:name};
    for(const [f,k]of [['colors','COLORS'],['fonts','FONT'],['spacing','SPACING'],['radius','RADIUS']])mocks['../../theme/'+f]={[k]:{}};
    const Screen=load('mobile-app/src/screens/store/StoreScreen.tsx',mocks).default;
    for(const status of ['loading','retrying','error','empty','success']){
      current={status,blocks:status==='success'?[block()]:[],loading:['loading','retrying'].includes(status),error:status==='error'?'Check connection':null};
      const tree=nodes(h.render(Screen)),list=tree.find(n=>n.type==='List');
      if(status==='error'){assert.ok(!list);const e=tree.find(n=>n.type==='ErrorState');e.props.onRetry();assert.equal(refreshes,1);}
      if(['loading','retrying'].includes(status))assert.ok(tree.some(n=>n.type==='Spinner'));
      if(status==='empty'){assert.equal(list.props.data.length,0);assert.match(list.props.ListEmptyComponent.props.title,/No Academic Years Found/);list.props.onRefresh();assert.equal(refreshes,2);}
    }
    current={status:'error',blocks:[block()],loading:false,error:'Offline'};
    let tree=nodes(h.render(Screen));assert.match(tree.find(n=>n.type==='ErrorState').props.message,/may be out of date/);assert.equal(tree.find(n=>n.type==='List').props.data.length,1);
    current={status:'retrying',blocks:[block()],loading:true,error:null};tree=nodes(h.render(Screen));assert.equal(tree.find(n=>n.type==='List').props.refreshing,true);assert.match(tree.find(n=>n.type==='List').props.ListHeaderComponent.props.children,/may be out of date/);
    focus();assert.equal(ownershipRefreshes,1);assert.ok(tree.some(n=>n.type==='PurchaseOwnershipStatus'));
    for(const price of [1,2,5]){const b=block('year',price),list=tree.find(n=>n.type==='List');let row=nodes(list.props.renderItem({item:b,index:0}));const pill=row.find(n=>n.type==='Button');assert.equal(pill.props.disabled,true);pill.props.onPress();assert.equal(buys,0);
      const posters=row.find(n=>typeof n.type==='function');const subjectList=nodes(h.render(()=>posters.type(posters.props))).find(n=>n.type==='List');const card=subjectList.props.renderItem({item:b.subjects[0],index:0});assert.equal(card.props.price,price);assert.equal(card.props.owned,false);card.props.onPress();assert.equal(navigations.at(-1)[0],'Chapters');assert.equal(navigations.at(-1)[1].subjectId,'subject');assert.equal(navigations.at(-1)[1].yearId,'year');card.props.onBuyPress();assert.equal(buys,0);
      owned=true;row=nodes(list.props.renderItem({item:b,index:0}));assert.ok(row.some(n=>n.type==='Text'&&n.props.children==='✓ Full Year Notes Owned'));const ownedPosters=row.find(n=>typeof n.type==='function');const ownedList=nodes(h.render(()=>ownedPosters.type(ownedPosters.props))).find(n=>n.type==='List');assert.equal(ownedList.props.renderItem({item:b.subjects[0],index:0}).props.owned,true);owned=false;
    }
    h.unmount();
  });
  console.log(`PASS MV009 ${passed} deterministic groups (local synthetic data only)`);
})().catch(e=>{console.error(e);process.exitCode=1;});
