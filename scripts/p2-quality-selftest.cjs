const assert = require('node:assert/strict');
const {harness,load,jsx,nodes,tick}=require('../mobile-app/scripts/ui-harness.cjs');
const cases=[];
function test(name,fn){cases.push([name,fn]);}
function mobileMocks(h){
 const mocks={react:h.react,'react/jsx-runtime':jsx,'react-native':{View:'View',Text:'Text',TextInput:'TextInput',ScrollView:'ScrollView',TouchableOpacity:'Button',KeyboardAvoidingView:'Keyboard',Platform:{OS:'android'},StyleSheet:{create:x=>x},Alert:{alert(){}},Linking:{}}};
 for(const [file,key] of [['colors','COLORS'],['fonts','FONT'],['spacing','SPACING'],['radius','RADIUS'],['shadows','SHADOW']])mocks['../../theme/'+file]={[key]:{}};
 return mocks;
}
test('Settings catches unavailable contact and both rate-app transports',async()=>{
 const h=harness(),m=mobileMocks(h);let alerts=0;
 m['react-native'].Alert.alert=()=>alerts++;
 m['react-native'].Linking={canOpenURL:async()=>{throw Error('unavailable')},openURL:async()=>{throw Error('unavailable')}};
 Object.assign(m,{'@react-navigation/native':{useNavigation:()=>({})},'../../components/SettingsItem':{default:'Item',__esModule:true},'../../components/ConfirmationDialog':{default:'Dialog',__esModule:true},'../../services/usersService':{deleteAccount(){}},'../../services/authState':{performSignOut(){}},'../../utils/logger':{logError(){}}});
 const Screen=load('mobile-app/src/screens/settings/SettingsScreen.tsx',m).default;
 const tree=h.render(Screen);
 for(const title of ['Contact Us','Rate App']) await nodes(tree).find(n=>n.props.title===title).props.onPress();
 assert.equal(alerts,2);
});
test('Contact retains draft on mail handoff, blocks duplicate submits and names social actions',async()=>{
 const h=harness(),m=mobileMocks(h);let resets=0,opens=0,resolve;
 const gate=new Promise(r=>resolve=r);
 m['react-native'].Linking={canOpenURL:async()=>true,openURL:async()=>{opens++;await gate}};
 Object.assign(m,{'react-hook-form':{Controller:'Controller',useForm:()=>({control:{},handleSubmit:fn=>()=>fn({name:'Student',email:'test@example.invalid',message:'Help'}),reset:()=>resets++,formState:{errors:{}}})},'@hookform/resolvers/yup':{yupResolver(){}},'@expo/vector-icons/FontAwesome':{default:'Icon',__esModule:true},'../../components/CustomInput':{default:'Input',__esModule:true},'../../components/CustomButton':{default:'Submit',__esModule:true},'../../components/WebLink':{default:'Link',__esModule:true},'../../constants/legal':{LEGAL:{email:'support@example.invalid'},WEB:{}},'../../validation/contactSchema':{},'../../utils/logger':{logError(){}}});
 const Screen=load('mobile-app/src/screens/contact/ContactScreen.tsx',m).default;
 const tree=h.render(Screen),submit=nodes(tree).find(n=>n.type==='Submit');
 const first=submit.props.onPress(),second=submit.props.onPress();await tick();assert.equal(opens,1);resolve();await Promise.all([first,second]);assert.equal(resets,0,'opening mail is not delivery');
 assert.match(submit.props.title,/email/i);
 const Social=nodes(tree).find(n=>typeof n.type==='function');
 const social=Social.type(Social.props);assert.equal(social.props.accessibilityRole,'button');assert.ok(social.props.accessibilityLabel);assert.ok(social.props.style.minHeight>=48);
});
test('Admin Input associates label, input and announced error',()=>{
 const Input=load('admin-panel/src/components/Input.tsx',{'react':{useId:()=>':id:'},'react/jsx-runtime':jsx}).default;
 const tree=Input({label:'Title',error:'Required'}),input=nodes(tree).find(n=>n.type==='input'),label=nodes(tree).find(n=>n.type==='label');
 assert.ok(input.props.id);assert.equal(label.props.htmlFor,input.props.id);assert.equal(input.props['aria-invalid'],true);
 assert.equal(nodes(tree).find(n=>n.type==='p').props.id,input.props['aria-describedby']);
});
test('Referrals returns every page with stable ordering and propagates later errors',async()=>{
 const filters=load('admin-panel/src/utils/filters.ts',{});const rows=Array.from({length:1001},(_,i)=>({id:String(i),status:'joined',referrer:{name:'A'},referred:{name:'B'}}));let fail=false,calls=0;const orders=[];
 const db={from:()=>{let start=0,end=999;return {select(){return this},eq(){return this},order(k){orders.push(k);return this},range(a,b){start=a;end=b;calls++;return this},then(resolve){resolve({data:rows.slice(start,end+1),error:fail&&start>0?Error('later page'):null})}}}};
 const api=load('admin-panel/src/services/referralService.ts',{'../config/supabase':{supabase:db},'../utils/caseConvert':{toCamelCase:x=>x},'../utils/filters':filters});
 assert.equal((await api.getReferrals('joined')).length,1001);assert.equal(calls,3);assert.ok(orders.includes('id'));fail=true;await assert.rejects(api.getReferrals(),/later page/);
});
test('Product form rejects invalid MRP and duplicate in-flight saves; retains exact valid prices',async()=>{
 for(const mrp of [NaN,Infinity,-1,2.001]){
  const h=harness();let saves=0;
  const m={react:h.react,'react/jsx-runtime':jsx};for(const key of ['Modal','Input','Button','CoursePicker'])m['./'+key]={__esModule:true,default:key};
  const Form=load('admin-panel/src/components/ProductFormModal.tsx',m).default;
  const props={open:true,courses:[{id:'c'}],years:[{id:'y',courseId:'c'}],subjects:[],chapters:[],initialData:{title:'Notes',scope:'year',productType:'notes',courseId:'c',yearId:'y',price:1,originalPrice:mrp,active:true},onClose(){},onSubmit:async()=>saves++};
  h.render(()=>Form(props));const tree=h.render(()=>Form(props));await nodes(tree).find(n=>n.type==='Button'&&n.props.children==='Save').props.onClick();assert.equal(saves,0,`invalid MRP ${mrp}`);
 }
 for(const price of [1,2,5]){
  const h=harness();let saves=0,resolve;const gate=new Promise(r=>resolve=r);const m={react:h.react,'react/jsx-runtime':jsx};for(const key of ['Modal','Input','Button','CoursePicker'])m['./'+key]={__esModule:true,default:key};
  const Form=load('admin-panel/src/components/ProductFormModal.tsx',m).default;const props={open:true,courses:[],years:[{id:'y',courseId:'c'}],subjects:[],chapters:[],initialData:{title:'Notes',scope:'year',productType:'notes',courseId:'c',yearId:'y',price,active:true},onClose(){},onSubmit:async data=>{assert.equal(data.price,price);saves++;await gate}};
  h.render(()=>Form(props));const tree=h.render(()=>Form(props)),save=nodes(tree).find(n=>n.type==='Button'&&n.props.children==='Save');const a=save.props.onClick(),b=save.props.onClick();assert.equal(saves,1);resolve();await Promise.all([a,b]);
 }
});

test('Analytics uses authorized server snapshot, passes course only and propagates errors',async()=>{
 let failure=false;
 const db={rpc:async(name,args)=>{
  assert.equal(name,'get_admin_analytics');assert.equal(args.p_course_id,'bams');
  assert.equal(Object.keys(args).join(','),'p_course_id');
  return failure?{data:null,error:Error('denied')}:{data:{totalRevenue:.3,totalOrders:2,paidOrders:2,pendingOrders:0,failedOrders:0,refundedOrders:0,totalUsers:1,totalProducts:1,topProducts:[{productId:'p',productTitle:'Notes',orders:2,revenue:.3}]},error:null};
 }};
 const api=load('admin-panel/src/services/analyticsService.ts',{'../config/supabase':{supabase:db}});
 const data=await api.getAnalytics({courseId:'bams',yearId:'ignored'});
 assert.equal(data.totalRevenue,.3);assert.equal(data.topProducts[0].revenue,.3);
 failure=true;await assert.rejects(api.getAnalytics({courseId:'bams'}),/denied/);
});
test('Notification Center can distinguish network failure from genuinely empty data',async()=>{
 const api=load('mobile-app/src/services/notificationsService.ts',{'@react-native-async-storage/async-storage':{getItem:async()=>null},'../config/supabase':{supabase:{from:()=>({select(){return this},eq(){return this},order:async()=>({error:Error('offline')})})}},'./authState':{getCurrentUser:()=>({id:'a'})},'../utils/notificationPreferences':{getNotificationPreferences:async()=>({})},'../utils/logger':{logDebug(){}}});
 await assert.rejects(api.fetchNotificationsWithReadState({strict:true}),/offline/);
 assert.equal((await api.fetchNotifications()).length,0,'Home remains non-blocking');
});
test('Web PDF hides signed content on owner switch and retries through server authorization',async()=>{
 const h=harness();let auth,owner='a',requests=0;
 const m=mobileMocks(h);Object.assign(m,{'@react-navigation/native':{useRoute:()=>({params:{pdfUrl:'https://example.invalid/old',noteId:'n'}}),useNavigation:()=>({goBack(){}})},'../../components/ErrorState':{__esModule:true,default:'Error'},'../../services/authState':{getCurrentUser:()=>({id:owner})},'../../services/secureNotesService':{getSecureNoteUrl:async()=>{requests++;return 'https://example.invalid/fresh'}},'../../config/supabase':{supabase:{auth:{onAuthStateChange:fn=>{auth=fn;return {data:{subscription:{unsubscribe(){}}}}}}}}});
 h.react.createElement=(type,props)=>({type,props});
 const Screen=load('mobile-app/src/screens/pdf/PdfViewerScreen.web.tsx',m).default;
 let tree=h.render(Screen);assert.equal(nodes(tree).find(n=>n.type==='iframe').props.src,'https://example.invalid/old');
 nodes(tree).find(n=>n.type==='iframe').props.onError();tree=h.render(Screen);await nodes(tree).find(n=>n.type==='Error').props.onRetry();await tick();tree=h.render(Screen);assert.equal(requests,1);assert.equal(nodes(tree).find(n=>n.type==='iframe').props.src,'https://example.invalid/fresh');
 owner='b';auth('SIGNED_IN',{user:{id:'b'}});tree=h.render(Screen);assert.equal(nodes(tree).filter(n=>n.type==='iframe').length,0);h.unmount();
});
test('Admin modal traps keyboard focus, handles Escape, restores trigger and exposes dialog name',()=>{
 const h=harness();h.react.useId=()=>':dialog:';const events={};let focused='trigger';const trigger={focus:()=>focused='trigger'},first={focus:()=>focused='first',getAttribute(){return null}},last={focus:()=>focused='last',getAttribute(){return null}};
 const doc={activeElement:trigger,addEventListener:(name,fn)=>events[name]=fn,removeEventListener:name=>delete events[name]};const ref={current:{focus(){focused='card'},querySelectorAll:()=>[first,last],contains:el=>el===first||el===last}};
 const useRef=h.react.useRef;let refCalls=0;h.react.useRef=v=>refCalls++===0?ref:useRef(v);let closes=0;
 const Modal=load('admin-panel/src/components/Modal.tsx',{'react':h.react,'react/jsx-runtime':jsx,'../hooks/useDialogFocus':{__esModule:true,default:load('admin-panel/src/hooks/useDialogFocus.ts',{'react':h.react},{document:doc}).default}}).default;
 const tree=h.render(()=>Modal({open:true,title:'Edit',onClose:()=>closes++}));const dialog=nodes(tree).find(n=>n.props.role==='dialog');assert.ok(dialog.props['aria-labelledby']);assert.equal(focused,'first');
 doc.activeElement=last;let prevented=false;events.keydown({key:'Tab',shiftKey:false,preventDefault:()=>prevented=true});assert.equal(focused,'first');assert.ok(prevented);
 doc.activeElement=first;events.keydown({key:'Tab',shiftKey:true,preventDefault(){}});assert.equal(focused,'last');events.keydown({key:'Escape',preventDefault(){}});assert.equal(closes,1);h.unmount();assert.equal(focused,'trigger');assert.equal(Object.keys(events).length,0);
});

test('Mobile confirmation exposes named 48-unit actions and blocks actions while busy',()=>{
 const h=harness(),m=mobileMocks(h);for(const k of ['colors','fonts','spacing','radius','shadows'])m['../theme/'+k]=m['../../theme/'+k];m['react-native'].Modal='Modal';m['react-native'].Pressable='Pressable';
 const Dialog=load('mobile-app/src/components/ConfirmationDialog.tsx',m).default;let actions=0;
 const tree=Dialog({visible:true,title:'Delete account',busy:true,onCancel:()=>actions++,onConfirm:()=>actions++});
 const buttons=nodes(tree).filter(n=>n.type==='Button');assert.equal(buttons.length,2);for(const button of buttons){assert.equal(button.props.accessibilityRole,'button');assert.ok(button.props.accessibilityLabel);assert.equal(button.props.disabled,true);button.props.onPress();assert.ok(Object.assign({},...button.props.style).minHeight>=48)}assert.equal(actions,0);tree.props.onRequestClose();assert.equal(actions,0);
 assert.ok(nodes(tree).some(n=>n.props.accessibilityViewIsModal));
});
test('Course filter retains an accessible name even when the visible label is hidden',()=>{
 const Picker=load('admin-panel/src/components/CoursePicker.tsx',{'react':{useId:()=>':course:'},'react/jsx-runtime':jsx}).default;const tree=Picker({courses:[],value:'',label:'',onChange(){}});const select=nodes(tree).find(n=>n.type==='select');assert.equal(select.props['aria-label'],'Course');
});

test('Notification screen ignores blurred loads and handles archive failure without hiding a row',async()=>{
 const h=harness(),m=mobileMocks(h);let focus;const reads=[];
 Object.assign(m,{'@react-navigation/native':{useNavigation:()=>({}),useFocusEffect:fn=>focus=fn},'../../theme/typography':{FONT:{}},'../../components/NotificationRow':{default:'Row',__esModule:true},'../../components/EmptyState':{default:'Empty',__esModule:true},'../../components/ErrorState':{default:'Error',__esModule:true},'../../utils/logger':{logError(){}},'../../services/notificationsService':{fetchNotificationsWithReadState:()=>new Promise(resolve=>reads.push(resolve)),markAllNotificationsRead:async()=>{},archiveNotification:async()=>{throw Error('disk full')}}});m['react-native'].FlatList='List';m['react-native'].ActivityIndicator='Spinner';
 const Screen=load('mobile-app/src/screens/notifications/NotificationsScreen.tsx',m).default;
 h.render(Screen);const cleanup=focus();cleanup();reads[0]({notifications:[{id:'stale',read:true}]});await tick();let tree=h.render(Screen);assert.equal(nodes(tree).filter(n=>n.type==='List').length,0);
 focus();reads[1]({notifications:[{id:'current',read:true}]});await tick();tree=h.render(Screen);const list=nodes(tree).find(n=>n.type==='List');assert.equal(list.props.data[0].id,'current');const row=list.props.renderItem({item:list.props.data[0]});await row.props.onArchive();tree=h.render(Screen);assert.match(nodes(tree).find(n=>n.type==='Error').props.message,/archive/);h.unmount();
});
(async()=>{let failed=0;for(const [name,fn]of cases){try{await fn();console.log('PASS '+name)}catch(e){failed++;console.error('FAIL '+name+'\n'+e.stack)}}console.log(`${cases.length-failed} passed; ${failed} failed`);process.exitCode=failed?1:0})()
