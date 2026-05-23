from fastapi import APIRouter,Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.song import Song
from app.schemas.common import ApiResponse

router=APIRouter(prefix='/discovery',tags=['discovery'])

@router.get('/hot',response_model=ApiResponse[list])
def hot_songs(db:Session=Depends(get_db)):
    items=db.query(Song).filter(Song.deleted_at.is_(None),Song.is_public.is_(True)).order_by((Song.like_count+Song.favorite_count+Song.view_count).desc()).limit(10).all()
    return ApiResponse(data=[{'id':x.id,'title':x.title,'artist':x.artist_name,'likes':x.like_count} for x in items])

@router.get('/keywords',response_model=ApiResponse[list])
def hot_keywords():
    return ApiResponse(data=['晴天','成都','周杰伦','民谣','新手弹唱','AI原创'])

@router.get('/recommend',response_model=ApiResponse[list])
def recommend(db:Session=Depends(get_db)):
    items=db.query(Song).filter(Song.deleted_at.is_(None),Song.is_public.is_(True)).order_by(Song.practice_count.desc(),Song.created_at.desc()).limit(8).all()
    return ApiResponse(data=[{'id':x.id,'title':x.title,'artist':x.artist_name} for x in items])
