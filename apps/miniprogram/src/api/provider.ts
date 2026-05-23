const USE_CLOUDBASE=true

export async function request(functionName:string,data:any={}){
 if(USE_CLOUDBASE){
   const result=await wx.cloud.callFunction({name:functionName,data})
   return result.result
 }
 return uni.request({url:'',data})
}
