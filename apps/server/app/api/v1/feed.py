from fastapi import APIRouter,Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.song import Song
from app.schemas.common import ApiResponse

router=APIRouter(prefix='/feed',tags=['feed'])

@router.get('/following',response_model=ApiResponse[list])
def following_feed(db:Session=Depends(get_db)):
 items=db.query(Song).filter(Song.deleted_at.is_(None),Song.is_public.is_(True)).order_by(Song.created_at.desc()).limit(20).all()
 return ApiResponse(data=[{
'id':x.id,
'type':'song_publish',
'title':f'发布了《{x.title}》',
'author':x.author_name or '谱友',
'created_at':str(x.created_at)
 } for x in items])