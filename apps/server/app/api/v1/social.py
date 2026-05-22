from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.follow import Follow
from app.models.like import Like
from app.models.song import Song
from app.models.user import User
from app.schemas.common import ApiResponse, PageResponse
from app.schemas.song import SongOut
from app.schemas.user import UserOut

router = APIRouter(tags=['social'])


@router.post('/songs/{song_id}/like', response_model=ApiResponse[dict])
def like_song(song_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    song = db.get(Song, song_id)
    if not song or song.deleted_at is not None:
        raise HTTPException(status_code=404, detail='Song not found')
    exists = db.query(Like).filter(Like.user_id == user.id, Like.song_id == song_id).first()
    if exists:
        return ApiResponse(data={'liked': True, 'like_count': song.like_count})
    like = Like(user_id=user.id, song_id=song_id)
    song.like_count += 1
    db.add(like)
    db.commit()
    return ApiResponse(data={'liked': True, 'like_count': song.like_count})


@router.delete('/songs/{song_id}/like', response_model=ApiResponse[dict])
def unlike_song(song_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    like = db.query(Like).filter(Like.user_id == user.id, Like.song_id == song_id).first()
    song = db.get(Song, song_id)
    if not like:
        return ApiResponse(data={'liked': False, 'like_count': song.like_count if song else 0})
    if song and song.like_count > 0:
        song.like_count -= 1
    db.delete(like)
    db.commit()
    return ApiResponse(data={'liked': False, 'like_count': song.like_count if song else 0})


@router.get('/users/me/likes', response_model=ApiResponse[PageResponse])
def my_liked_songs(page: int = 1, page_size: int = 20, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    query = db.query(Song).join(Like, Like.song_id == Song.id).filter(Like.user_id == user.id, Song.deleted_at.is_(None)).order_by(Like.created_at.desc())
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return ApiResponse(data=PageResponse(total=total, page=page, page_size=page_size, items=[SongOut.model_validate(item).model_dump() for item in items]))


@router.post('/users/{user_id}/follow', response_model=ApiResponse[dict])
def follow_user(user_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user_id == user.id:
        raise HTTPException(status_code=400, detail='Cannot follow yourself')
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail='User not found')
    exists = db.query(Follow).filter(Follow.follower_id == user.id, Follow.following_id == user_id).first()
    if exists:
        return ApiResponse(data={'following': True})
    db.add(Follow(follower_id=user.id, following_id=user_id))
    db.commit()
    return ApiResponse(data={'following': True})


@router.delete('/users/{user_id}/follow', response_model=ApiResponse[dict])
def unfollow_user(user_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    follow = db.query(Follow).filter(Follow.follower_id == user.id, Follow.following_id == user_id).first()
    if follow:
        db.delete(follow)
        db.commit()
    return ApiResponse(data={'following': False})


@router.get('/users/{user_id}/profile', response_model=ApiResponse[dict])
def user_profile(user_id: int, db: Session = Depends(get_db)):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail='User not found')
    works_count = db.query(Song).filter(Song.user_id == user_id, Song.deleted_at.is_(None)).count()
    likes_count = sum(song.like_count for song in db.query(Song).filter(Song.user_id == user_id, Song.deleted_at.is_(None)).all())
    followers_count = db.query(Follow).filter(Follow.following_id == user_id).count()
    following_count = db.query(Follow).filter(Follow.follower_id == user_id).count()
    return ApiResponse(data={
        'user': UserOut.model_validate(target).model_dump(),
        'stats': {
            'works_count': works_count,
            'likes_count': likes_count,
            'followers_count': followers_count,
            'following_count': following_count,
        },
    })


@router.get('/users/{user_id}/songs', response_model=ApiResponse[PageResponse])
def user_songs(user_id: int, page: int = 1, page_size: int = 20, db: Session = Depends(get_db)):
    query = db.query(Song).filter(Song.user_id == user_id, Song.deleted_at.is_(None), Song.is_public.is_(True), Song.audit_status == 'approved').order_by(Song.created_at.desc())
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return ApiResponse(data=PageResponse(total=total, page=page, page_size=page_size, items=[SongOut.model_validate(item).model_dump() for item in items]))
