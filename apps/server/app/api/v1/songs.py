from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.song import Song
from app.models.user import User
from app.schemas.common import ApiResponse, PageResponse
from app.schemas.song import SongCreate, SongOut

router = APIRouter(prefix='/songs', tags=['songs'])


@router.get('/mine', response_model=ApiResponse[PageResponse])
def my_songs(page: int = 1, page_size: int = 20, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    query = db.query(Song).filter(Song.user_id == user.id, Song.deleted_at.is_(None)).order_by(Song.created_at.desc())
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return ApiResponse(data=PageResponse(total=total, page=page, page_size=page_size, items=[SongOut.model_validate(item).model_dump() for item in items]))


@router.get('/search', response_model=ApiResponse[PageResponse])
def search_songs(keyword: str = '', page: int = 1, page_size: int = 20, db: Session = Depends(get_db)):
    query = db.query(Song).filter(Song.deleted_at.is_(None), Song.is_public.is_(True), Song.audit_status == 'approved')
    if keyword:
        like = f'%{keyword}%'
        query = query.filter(or_(Song.title.like(like), Song.style.like(like)))
    query = query.order_by(Song.created_at.desc())
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return ApiResponse(data=PageResponse(total=total, page=page, page_size=page_size, items=[SongOut.model_validate(item).model_dump() for item in items]))


@router.get('/{song_id}', response_model=ApiResponse[SongOut])
def get_song(song_id: int, db: Session = Depends(get_db)):
    song = db.get(Song, song_id)
    if not song or song.deleted_at is not None:
        raise HTTPException(status_code=404, detail='Song not found')
    song.view_count += 1
    db.commit()
    db.refresh(song)
    return ApiResponse(data=SongOut.model_validate(song))


@router.post('', response_model=ApiResponse[SongOut])
def create_song(payload: SongCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    content_json = payload.content_json or {
        'title': payload.title,
        'style': payload.style,
        'key': payload.key,
        'bpm': payload.bpm,
        'capo': payload.capo,
        'difficulty': payload.difficulty,
        'strumming': payload.strumming,
        'chords': payload.chords,
        'sections': [section.model_dump() for section in payload.sections or []],
    }
    song = Song(
        user_id=user.id,
        title=payload.title,
        style=payload.style,
        song_key=payload.key,
        bpm=payload.bpm,
        capo=payload.capo,
        difficulty=payload.difficulty,
        strumming=payload.strumming,
        chords_json=payload.chords,
        content_json=content_json,
        source_type='user_upload',
        is_public=payload.is_public,
        audit_status='pending',
    )
    db.add(song)
    db.commit()
    db.refresh(song)
    return ApiResponse(data=SongOut.model_validate(song))


@router.delete('/{song_id}', response_model=ApiResponse[dict])
def delete_song(song_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    song = db.get(Song, song_id)
    if not song or song.user_id != user.id:
        raise HTTPException(status_code=404, detail='Song not found')
    song.deleted_at = __import__('datetime').datetime.utcnow()
    db.commit()
    return ApiResponse(data={'deleted': True})
