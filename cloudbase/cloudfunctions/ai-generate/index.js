const bannedWords=['赌博','诈骗','违禁','暴力']

function reviewContent(text=''){
 return !bannedWords.some(word=>text.includes(word))
}

// existing code retained...
// before save:
// if(!reviewContent(event.prompt||'')){
// return {code:403,message:'内容审核未通过'}
// }
