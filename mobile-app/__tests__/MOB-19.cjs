const {assert,load,hooks,run}=require('./audit-harness.cjs');
run(()=>{const h=hooks();let listener;
 const hook=load('src/hooks/useNetworkStatus.ts',{'react':h.react,'@react-native-community/netinfo':{__esModule:true,default:{addEventListener:f=>(listener=f,()=>{})}}}).default;
 h.render(hook);
 for(const [connected,reachable,expected] of [[true,null,true],[true,true,true],[true,false,false],[false,null,false],[null,null,false]]){listener({isConnected:connected,isInternetReachable:reachable});assert.equal(h.render(hook),expected,`connected=${connected}, reachable=${reachable}`)}h.unmount();});
