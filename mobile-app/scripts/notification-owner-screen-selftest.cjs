const assert=require('node:assert/strict');const {harness,load,jsx,nodes,tick}=require('./ui-harness.cjs');
const h=harness();let user='A',epoch=0;const listeners=new Set(),requests=[],marks=[];
const auth={getCurrentUser:()=>({id:user}),getAuthEpoch:()=>epoch,subscribeAuthUser:fn=>{listeners.add(fn);return()=>listeners.delete(fn);}};
const ownerStorage=load('mobile-app/src/utils/ownerStorage.ts',{'@react-native-async-storage/async-storage':{},'../services/authState':auth});
const mocks={react:h.react,'react/jsx-runtime':jsx,'react-native':{View:'View',Text:'Text',FlatList:'List',ActivityIndicator:'Spinner',TouchableOpacity:'Button',StyleSheet:{create:x=>x}},
 '@react-navigation/native':{useNavigation:()=>({}),useFocusEffect:fn=>h.react.useEffect(fn,[fn])},
 '../../components/NotificationRow':{__esModule:true,default:'Row'},'../../components/EmptyState':{__esModule:true,default:'Empty'},'../../components/ErrorState':{__esModule:true,default:'Error'},
 '../../services/authState':auth,'../../utils/ownerStorage':ownerStorage,'../../utils/logger':{logError(){}},
 '../../services/notificationsService':{fetchNotificationsWithReadState:()=>new Promise(resolve=>requests.push({owner:user,resolve})),markAllNotificationsRead:async ids=>{marks.push({owner:user,ids});},archiveNotification:async()=>{}}
};
for(const [file,name]of [['colors','COLORS'],['typography','FONT'],['spacing','SPACING']])mocks[`../../theme/${file}`]={[name]:{}};
const Screen=load('mobile-app/src/screens/notifications/NotificationsScreen.tsx',mocks).default;
const render=()=>h.render(Screen);function change(id){user=id;epoch++;listeners.forEach(fn=>fn());}
(async()=>{
 render();change('B');render();requests[0].resolve({notifications:[{id:'A private',read:false}]});await tick();
 assert.equal(marks.length,0,'an A response cannot mark B notifications read');
 assert(!nodes(render()).some(n=>n.type==='List'&&n.props.data.some(x=>x.id==='A private')));
 requests.at(-1).resolve({notifications:[{id:'B row',read:false}]});await tick();assert.equal(marks[0].owner,'B');
 assert.equal(nodes(render()).find(n=>n.type==='List').props.data[0].id,'B row');
 change('A');assert(!nodes(render()).some(n=>n.type==='List'&&n.props.data.some(x=>x.id==='B row')));
 h.unmount();assert.equal(listeners.size,0);console.log('PASS Notification Center owner switch masks rows and forbids stale read side effects');
})().catch(e=>{console.error(e);process.exitCode=1;});
