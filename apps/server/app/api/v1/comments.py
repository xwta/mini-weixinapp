from fastapi import APIRouter,Depends
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.comment import Comment
from app.models.user import User
from app.schemas.comment import CommentCreateIn,CommentOut
from app.schemas.common import ApiResponse

router=APIRouter(prefix='/comments',tags=['comments'])

@router.post('',response_model=ApiResponse[CommentOut])
def create(payload:CommentCreateIn,db:Session=Depends(get_db),user:User=Depends(get_current_user)):
 c=Comment(user_id=user.id,song_id=payload.song_id,parent_id=payload.parent_id,content=payload.content)
 db.add(c)
 db.commit()
 db.refresh(c)
 return ApiResponse(data=CommentOut.model_validate(c))

@router.get('/song/{song_id}',response_model=ApiResponse[list])
def list_comments(song_id:int,db:Session=Depends(get_db)):
 items=db.query(Comment).filter(Comment.song_id==song_id).order_by(Comment.created_at.desc()).all()
 return ApiResponse(data=[CommentOut.model_validate(x).model_dump() for x in items])