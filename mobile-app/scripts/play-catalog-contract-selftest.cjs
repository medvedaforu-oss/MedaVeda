const assert=require('node:assert/strict');
const {load}=require('./ui-harness.cjs');
const sha=require('../node_modules/js-sha256');
const selector=load('mobile-app/src/services/playOfferSelection.ts',{});
const offer={priceCurrencyCode:'INR',priceAmountMicros:'5000000',offerToken:'standard-offer',formattedPrice:'₹5'};
const product={id:'notes-price-5',platform:'android',currency:'INR',oneTimePurchaseOfferDetailsAndroid:[offer]};
function setup({enabled=true,ready=true}={}){
 let rows=[product], requests=0;
 const iap={initConnection:async()=>ready,fetchProducts:async()=>rows,purchaseUpdatedListener:()=>({remove(){}}),purchaseErrorListener:()=>({remove(){}}),userChoiceBillingListenerAndroid:()=>({remove(){}}),requestPurchase:async()=>{requests++;}};
 const api=load('mobile-app/src/services/playBillingService.ts',{
 '@react-native-async-storage/async-storage':{__esModule:true,default:{}},'react-native':{Platform:{OS:'android'}},'js-sha256':sha,'expo-application':{},
 './authState':{getCurrentUser:()=>({id:'buyer'}),getAuthEpoch:()=>0}, '../config/paymentProvider':{userChoiceBillingEnabled:enabled},'../config/supabase':{supabase:{}},'../repositories/ordersRepository':{},'./playOfferSelection':selector,'expo-iap':iap,
 },{process:{env:{EXPO_PUBLIC_SUPABASE_URL:'https://synthetic.invalid'}}});return {api,rows(v){rows=v;},requests:()=>requests};
}
(async()=>{
 const f=setup();assert.equal((await f.api.fetchMatchingPlayProduct('notes-price-5',5)).offerToken,'standard-offer');
 for(const rows of [[],[{...product,id:'another-sku'}],[{...product,currency:'USD'}], [{...product,oneTimePurchaseOfferDetailsAndroid:[]}], [{...product,oneTimePurchaseOfferDetailsAndroid:[offer,offer]}], ...[{priceCurrencyCode:'USD'},{priceAmountMicros:'1000000'},{offerId:'discount'},{offerToken:''},{rentalDetailsAndroid:{}},{preorderDetailsAndroid:{}}].map(p=>[{...product,oneTimePurchaseOfferDetailsAndroid:[{...offer,...p}]}])]){
 f.rows(rows);await assert.rejects(f.api.fetchMatchingPlayProduct('notes-price-5',5));
 }
 for(const amount of [1,2,5])assert.equal(selector.selectStandardPlayOffer([{...offer,priceAmountMicros:String(amount*1000000)}],amount).offerToken,'standard-offer');
 await assert.rejects(setup({enabled:false}).api.fetchMatchingPlayProduct('notes-price-5',5),/Standalone/);
 await assert.rejects(setup({ready:false}).api.fetchMatchingPlayProduct('notes-price-5',5),/connect/);
 assert.equal(f.requests(),0);
 console.log('PASS exact SKU, missing product, INR, single standard offer, wrong-price/discount/rental/preorder, ₹1/₹2/₹5, enrollment gate and native-unavailable failure; native country/version eligibility remains device acceptance');
})().catch(e=>{console.error(e);process.exitCode=1});
