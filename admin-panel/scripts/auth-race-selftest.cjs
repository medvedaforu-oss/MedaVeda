const assert=require('node:assert/strict');
const {harness,load,jsx,tick}=require('../../mobile-app/scripts/ui-harness.cjs');
(async()=>{
 const h=harness();let auth,sessionResolve,closed=0;const reads=[];
 const api=load('admin-panel/src/context/AuthContext.tsx',{
  react:{...h.react,createContext:()=>({Provider:'Provider'}),useContext(){}},'react/jsx-runtime':jsx,
  '../config/supabase':{supabase:{rpc:()=>new Promise(resolve=>reads.push(resolve)),auth:{getSession:()=>new Promise(r=>{sessionResolve=r;}),onAuthStateChange:fn=>{auth=fn;return {data:{subscription:{unsubscribe:()=>closed++}}};}}}},
 });
 const render=()=>h.render(()=>api.AuthProvider({children:null})).props.value;
 render();auth('SIGNED_IN',{user:{id:'admin'}});auth('SIGNED_OUT',null);reads[0]({data:true});await tick();
 assert.equal(render().isAdmin,false);assert.equal(render().user,null);
 sessionResolve({data:{session:{user:{id:'old'}}}});await tick();assert.equal(reads.length,1);
 auth('SIGNED_IN',{user:{id:'second'}});assert.equal(render().loading,true);assert.equal(render().isAdmin,false);
 reads[1]({data:true});await tick();assert.equal(render().isAdmin,true);
 auth('SIGNED_IN',{user:{id:'third'}});assert.equal(render().isAdmin,false);h.unmount();reads[2]({data:true});await tick();assert.equal(closed,1);
 console.log('PASS stale admin auth responses cannot restore access after logout/account change or unmount');
})().catch(e=>{console.error(e);process.exitCode=1;});
