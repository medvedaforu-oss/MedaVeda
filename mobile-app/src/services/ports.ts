/** Structural ports compatible with the recovered expo-iap 3.4.4 API. Native compilation is cloud-only. */
export interface Purchase { platform: string; productId: string; purchaseToken?: string | null; purchaseState: string; obfuscatedAccountIdAndroid?: string | null; obfuscatedProfileIdAndroid?: string | null }
export interface PurchaseAndroid extends Purchase { platform: "android" }
export interface Order { id: string; provider?: string; playSku?: string; productId: string; productTitle?: string; status?: string }
export interface NativeBilling {
 initConnection(options: Record<string, never>): Promise<boolean>;
 purchaseUpdatedListener(listener:(purchase:Purchase)=>void): {remove():void};
 purchaseErrorListener(listener:(error:{code?:string;message?:string})=>void): {remove():void};
 requestPurchase(options:{request:{google:{skus:string[];offerToken:string;obfuscatedAccountId:string;obfuscatedProfileId:string}};type:"in-app"}): Promise<unknown>;
 fetchProducts(options:{skus:string[];type:"in-app"}): Promise<Array<{id:string;platform:string;currency:string;oneTimePurchaseOfferDetailsAndroid?:import("./playOfferSelection").StandardPlayOffer[] | null}> | null>;
 getAvailablePurchases(): Promise<Purchase[]>;
}
export interface PlayBillingPorts {
 /** Fixed deployment origin, supplied by the application adapter. */
 projectUrl: string;
 AsyncStorage: {getItem(key:string):Promise<string|null>;setItem(key:string,value:string):Promise<void>;removeItem(key:string):Promise<unknown>};
 Platform: {OS:string};
 Application: {nativeApplicationVersion:string|null;applicationId:string|null};
 sha256(value:string):string;
 purchasesEnabled:boolean;
 getAuthEpoch():number;
 getOrdersByUser(userId:string):Promise<Order[]>;
 supabase: {auth:{getSession():Promise<{data:{session:{user:{id:string};access_token:string}|null}}>};rpc(name:string,args:Record<string,string>):PromiseLike<{data:unknown;error:unknown}>};
 getNativeBilling():Promise<NativeBilling>;
 fetch:typeof fetch;
 setTimeout?:typeof setTimeout;
 clearTimeout?:typeof clearTimeout;
}
