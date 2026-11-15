const {assert,load,run}=require('./audit-harness.cjs');
run(async()=>{let handler;const enabled={offer:false,new_notes:true};
 load('src/services/studyReminderService.ts',{'@react-native-async-storage/async-storage':{__esModule:true,default:{}},'expo-constants':{__esModule:true,default:{executionEnvironment:'standalone'},ExecutionEnvironment:{StoreClient:'storeClient'}},'expo-notifications':{setNotificationHandler:h=>handler=h},'./notificationRouting':{createNotificationPresentationGate:()=>()=>true},'../utils/logger':{logError(){}},'../utils/notificationPreferences':{isCategoryEnabled:async type=>enabled[type]!==false,NOTIFICATION_CATEGORIES:[{type:'offer'},{type:'new_notes'}]}});
 for(const [data,want] of [[{type:'offer'},false],[{type:'new_notes'},true],[{},true]]){const result=await handler.handleNotification({request:{identifier:'id',content:{data}}});assert.equal(result.shouldShowBanner,want);assert.equal(result.shouldPlaySound,want);assert.equal(result.shouldShowList,want)}
});
