// Real read-only receipt lookup, mocked HTTP. Never calls a provider.
import { findRazorpayOrderByReceipt } from '../functions/_shared/razorpay.ts';
const savedFetch=globalThis.fetch;
const names=['APP_ENV','RAZORPAY_KEY_ID','RAZORPAY_KEY_SECRET'];
const saved=Object.fromEntries(names.map(key=>[key,Deno.env.get(key)]));
Deno.env.set('APP_ENV','staging');Deno.env.set('RAZORPAY_KEY_ID','rzp_test_fixture');Deno.env.set('RAZORPAY_KEY_SECRET','fixture');
let items: unknown=[];let calls=0;
globalThis.fetch=async(input,init)=>{
 const url=new URL(String(input));calls++;
 if(init?.method && init.method!=='GET')throw Error('reconciliation attempted a write');
 if(url.pathname!=='/v1/orders'||url.searchParams.get('receipt')!=='receipt-fixture'||url.searchParams.get('count')!=='100')throw Error('wrong receipt query');
 return Response.json({items});
};
const exact={id:'order_fixture',receipt:'receipt-fixture',amount:4900,currency:'INR',status:'created'};
try {
 if(await findRazorpayOrderByReceipt('receipt-fixture')!==null)throw Error('empty lookup accepted');
 items=[{...exact,receipt:'prefix-receipt-fixture'},exact];
 if((await findRazorpayOrderByReceipt('receipt-fixture'))?.id!=='order_fixture')throw Error('exact receipt not matched');
 for(const invalid of [[exact,{...exact,id:'order_other'}],Array.from({length:100},()=>exact),null]){
  items=invalid;let denied=false;try{await findRazorpayOrderByReceipt('receipt-fixture')}catch{denied=true}
  if(!denied)throw Error('ambiguous or malformed receipt lookup accepted');
 }
 if(calls!==5)throw Error('unexpected duplicate requests');
 globalThis.fetch=async()=>new Response('synthetic-sensitive-provider-body',{status:500});
 let redacted=false;
 try {await findRazorpayOrderByReceipt('receipt-fixture')}catch(error){redacted=error instanceof Error && !error.message.includes('synthetic-sensitive-provider-body') && error.message.includes('500')}
 if(!redacted)throw Error('provider error body leaked');
 console.log('PASS receipt reconciliation uses GET only, exact receipt match, and rejects duplicates/truncated/malformed provider results');
} finally {
 globalThis.fetch=savedFetch;
 for(const [key,value]of Object.entries(saved))if(value===undefined)Deno.env.delete(key);else Deno.env.set(key,value);
}
