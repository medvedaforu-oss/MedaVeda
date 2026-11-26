const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const source=fs.readFileSync(require('node:path').resolve(__dirname,'../../../supabase/functions/create-standalone-play-order/index.ts'),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const owner='11111111-1111-4111-8111-111111111111';
async function run({env={},user=owner,body={productId:'notes'},sales=true,product={active:true,scope:'chapter',product_type:'notes'},rpcResult={ok:true,order_id:owner,play_sku:'price_5',purchase_option_id:'buy'}}={}) {
 let handler,calls=0;
 const mocks={
 '../_shared/newOrderGate.ts':{newOrdersEnabled:async()=>sales},
 '../_shared/cors.ts':{handleOptions:()=>null,jsonResponse:(b,status=200)=>Response.json(b,{status})},
 '../_shared/rateLimit.ts':{withinLimit:async()=>true},
 '../_shared/supabaseAdmin.ts':{getUserFromAuthHeader:async()=>user?{id:user}:null,supabaseAdmin:{
  rpc:async(name,args)=>{calls++;assert.equal(name,'create_play_order');assert.equal(args.p_user_id,user);return {data:rpcResult,error:null}},
  from:()=>({select(){return this},eq(){return this},maybeSingle:async()=>({data:product,error:null}),single:async()=>({data:{amount:5,play_sku:'price_5',play_purchase_option_id:'buy'},error:null})})
 }}}
 vm.runInNewContext(code,{exports:{},require:k=>{assert.ok(k in mocks,k);return mocks[k]},Deno:{serve:fn=>handler=fn,env:{get:k=>env[k]}},console});
 const response=await handler(new Request('https://test.invalid',{method:'POST',headers:{'x-medveda-payment-provider':'play'},body:JSON.stringify(body)}));
 return {response,calls};
}
(async()=>{
 const env={PLAY_STANDALONE_TEST_ENABLED:'true',PLAY_STANDALONE_TEST_USER_IDS:owner};
 for(const opts of [{},{env:{...env,PLAY_STANDALONE_TEST_ENABLED:'false'}},{env:{...env,PLAY_STANDALONE_TEST_USER_IDS:''}},{env,user:'22222222-2222-4222-8222-222222222222'},{env,body:{productId:'notes',provider:'play'},user:'foreign'}]){const r=await run(opts);assert.equal(r.response.status,403);assert.equal(r.calls,0)}
 assert.equal((await run({env,user:null})).response.status,401);
 assert.equal((await run({env,sales:false})).response.status,403);
 assert.equal((await run({env,product:{active:true,scope:'chapter',product_type:'video'}})).response.status,400);
 const r=await run({env});assert.equal(r.response.status,200);assert.deepEqual(await r.response.json(),{internalOrderId:owner,playSku:'price_5',purchaseOptionId:'buy',amountInr:5});
 console.log('PASS standalone default-off/allowlist/auth/sales/Notes gates, no provider-header authorization, server order contract');
})().catch(e=>{console.error(e);process.exitCode=1});
