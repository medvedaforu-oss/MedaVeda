// Exercise actual service serialization/error handling through Supabase transport.
const assert=require('node:assert/strict');
const {createClient}=require('@supabase/supabase-js');
const {load}=require('../../mobile-app/scripts/ui-harness.cjs');
let row={id:'product',title:'Initial',active:true,price:49,scope:'chapter',chapter_id:'chapter',revision:1};
const requests=[];
const client=createClient('https://example.invalid','local-test-key',{
  auth:{persistSession:false,autoRefreshToken:false},
  global:{fetch:async(url,options)=>{
    const body=JSON.parse(options.body||'{}');requests.push({url:String(url),body});
    if(String(url).includes('/rpc/products_update')){
      if(body.p_revision!==row.revision)return new Response(JSON.stringify({code:'40001',message:'Conflict: product changed or deleted. Reload before retrying.'}),{status:400,headers:{'content-type':'application/json'}});
      row={...row,...body.p_changes,revision:row.revision+1};
    }else row={...row,...body};
    return new Response(JSON.stringify(row),{status:200,headers:{'content-type':'application/json'}});
  }},
});
const api=load('admin-panel/src/services/productService.ts',{'../config/supabase':{supabase:client},
  '../utils/caseConvert':load('admin-panel/src/utils/caseConvert.ts',{}),
  '../utils/filters':load('admin-panel/src/utils/filters.ts',{})});
(async()=>{
  const stale={title:'Old admin title',active:true,price:49,scope:'chapter',chapterId:'chapter'};
  await api.updateProduct('product',{...stale,active:false},1);
  await assert.rejects(()=>api.updateProduct('product',stale,1),/changed|conflict/i);
  assert.equal(row.active,false,'stale form republished a product');
  await api.updateProduct('product',{...stale,active:false,price:137.25},2);
  await assert.rejects(()=>api.updateProduct('product',{...stale,scope:'year',yearId:'old-year'},2),/changed|conflict/i);
  assert.equal(row.price,137.25,'stale scope edit restored older price');
  const count=requests.length;
  await assert.rejects(()=>api.updateProduct('product',stale,undefined),/reload|revision/i);
  assert.equal(requests.length,count,'missing revision sent an unconditional write');
  await api.updateProduct('product',{...stale,revision:900,id:'hijack',createdAt:'fake',chapterTitle:'UI only'},3);
  const changes=requests.at(-1).body.p_changes;
  assert.ok(!('revision' in changes)&&!('id' in changes)&&!('created_at' in changes)&&!('chapter_title' in changes));
  assert.equal(row.revision,4);
  console.log('PASS product concurrency: publication and price/scope conflicts, missing revision, immutable input stripping');
})().catch(error=>{console.error(error);process.exitCode=1;});
