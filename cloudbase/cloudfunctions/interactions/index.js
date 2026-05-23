const cloud=require('wx-server-sdk')
cloud.init({env:cloud.DYNAMIC_CURRENT_ENV})
const db=cloud.database()
const _=db.command
const likes=db.collection('likes')
const favorites=db.collection('favorites')
const songs=db.collection('songs')

exports.main=async(event)=>{
 const openid=cloud.getWXContext().OPENID
 const action=event.action
 const songId=event.song_id
 const now=new Date()
 if(!songId) return {code:400,message:'song_id required'}

 if(action==='toggleLike'){
   const exist=await likes.where({user_openid:openid,song_id:songId}).get()
   if(exist.data.length){
      await likes.doc(exist.data[0]._id).remove()
      await songs.doc(songId).update({data:{like_count:_.inc(-1)}})
      return {code:0,data:{liked:false}}
   }
   await likes.add({data:{user_openid:openid,song_id:songId,created_at:now}})
   await songs.doc(songId).update({data:{like_count:_.inc(1)}})
   return {code:0,data:{liked:true}}
 }

 if(action==='toggleFavorite'){
   const exist=await favorites.where({user_openid:openid,song_id:songId}).get()
   if(exist.data.length){
      await favorites.doc(exist.data[0]._id).remove()
      await songs.doc(songId).update({data:{favorite_count:_.inc(-1)}})
      return {code:0,data:{favorited:false}}
   }
   await favorites.add({data:{user_openid:openid,song_id:songId,created_at:now}})
   await songs.doc(songId).update({data:{favorite_count:_.inc(1)}})
   return {code:0,data:{favorited:true}}
 }

 return {code:400,message:'Unknown action'}
}
