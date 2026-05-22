from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.favorite import Favorite
from app.models.song import Song
from app.models.user import User
from app.schemas.common import ApiResponse, PageResponse
from app.schemas.song import SongOut

router = APIRouter(prefix='/favorites', tags=['favorites'])


@router.post('', response_model=ApiResponse[dict])
def add_favorite(song_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    song = db.get(Song, song_id)
    if not song or song.deleted_at is not None:
        raise HTTPException(status_code=404, detail='Song not found')
    exists = db.query(Favorite).filter(Favorite.user_id == user.id, Favorite.song_id == song_id).first()
    if exists:
        return ApiResponse(data={'favorited': True})
    favorite = Favorite(user_id=user.id, song_id=song_id)
    song.favorite_count += 1
    db.add(favorite)
    db.commit()
    return ApiResponse(data={'favorited': True})


@router.delete('/{song_id}', response_model=ApiResponse[dict])
def remove_favorite(song_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    favorite = db.query(Favorite).filter(Favorite.user_id == user.id, Favorite.song_id == song_id).first()
    if not favorite:
        return ApiResponse(data={'favorited': False})
    song = db.get(Song, song_id)
    if song and song.favorite_count > 0:
        song.favorite_count -= 1
    db.delete(favorite)
    db.commit()
    return ApiResponse(data={'favorited': False})


@router.get('', response_model=ApiResponse[PageResponse])
def my_favorites(page: int = 1, page_size: int = 20, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    query = db.query(Song).join(Favorite, Favorite.song_id == Song.id).filter(Favorite.user_id == user.id, Song.deleted_at.is_(None)).order_by(Favorite.created_at.desc())
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return ApiResponse(data=PageResponse(total=total, page=page, page_size=page_size, items=[SongOut.model_validate(item).model_dump() for item in items]))
