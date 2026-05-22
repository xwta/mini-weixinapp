from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.song import Song
from app.models.user import User
from app.schemas.common import ApiResponse, PageResponse
from app.schemas.song import ManualSongCreate, SongCreate, SongOut, SongUpdate

router = APIRouter(prefix='/songs', tags=['songs'])


def parse_raw_tab(raw_text: str) -> dict:
    sections = []
    current = {'name': '正文', 'lines': []}
    pending_chord = None
    for raw_line in raw_text.splitlines():
        line = raw_line.rstrip()
        if not line:
            continue
        if line.startswith('[') and line.endswith(']'):
            if current['lines']:
                sections.append(current)
            current = {'name': line.strip('[]'), 'lines': []}
            pending_chord = None
            continue
        looks_like_chord = any(chord in line.split() for chord in ['C', 'G', 'Am', 'F', 'Em', 'Dm', 'D', 'A', 'E', 'Bm'])
        if looks_like_chord and len(line) <= 80:
            pending_chord = line
        else:
            current['lines'].append({'chordLine': pending_chord, 'lyricLine': line})
            pending_chord = None
    if current['lines']:
        sections.append(current)
    return {'sections': sections or [{'name': '正文', 'lines': [{'chordLine': None, 'lyricLine': raw_text}]}]}


@router.get('/mine', response_model=ApiResponse[PageResponse])
def my_songs(page: int = 1, page_size: int = 20, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    query = db.query(Song).filter(Song.user_id == user.id, Song.deleted_at.is_(None)).order_by(Song.created_at.desc())
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return ApiResponse(data=PageResponse(total=total, page=page, page_size=page_size, items=[SongOut.model_validate(item).model_dump() for item in items]))


@router.get('/search', response_model=ApiResponse[PageResponse])
def search_songs(
    keyword: str = '',
    difficulty: str | None = None,
    song_key: str | None = None,
    source_type: str | None = None,
    sort: str = 'latest',
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
):
    query = db.query(Song).filter(Song.deleted_at.is_(None), Song.is_public.is_(True), Song.audit_status == 'approved')
    if keyword:
        like = f'%{keyword}%'
        query = query.filter(or_(Song.title.like(like), Song.artist_name.like(like), Song.author_name.like(like), Song.style.like(like)))
    if difficulty:
        query = query.filter(Song.difficulty == difficulty)
    if song_key:
        query = query.filter(Song.song_key == song_key)
    if source_type:
        query = query.filter(Song.source_type == source_type)

    if sort == 'likes':
        query = query.order_by(Song.like_count.desc(), Song.created_at.desc())
    elif sort == 'favorites':
        query = query.order_by(Song.favorite_count.desc(), Song.created_at.desc())
    elif sort == 'views':
        query = query.order_by(Song.view_count.desc(), Song.created_at.desc())
    else:
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
        artist_name=payload.artist_name,
        style=payload.style,
        song_key=payload.key,
        bpm=payload.bpm,
        capo=payload.capo,
        difficulty=payload.difficulty,
        strumming=payload.strumming,
        raw_text=payload.raw_text,
        chords_json=payload.chords,
        tags_json=payload.tags,
        content_json=content_json,
        source_type='user_upload',
        edit_mode='manual',
        visibility='public' if payload.is_public else 'private',
        is_public=payload.is_public,
        audit_status='pending',
    )
    db.add(song)
    db.commit()
    db.refresh(song)
    return ApiResponse(data=SongOut.model_validate(song))


@router.post('/manual', response_model=ApiResponse[SongOut])
def create_manual_song(payload: ManualSongCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    content_json = parse_raw_tab(payload.raw_text)
    song = Song(
        user_id=user.id,
        title=payload.title,
        artist_name=payload.artist_name,
        style=payload.style,
        song_key=payload.song_key,
        bpm=payload.bpm,
        capo=payload.capo,
        difficulty=payload.difficulty,
        strumming=payload.strumming,
        raw_text=payload.raw_text,
        tags_json=payload.tags,
        content_json=content_json,
        source_type='user_upload',
        edit_mode='manual',
        visibility='public' if payload.is_public else 'private',
        is_public=payload.is_public,
        audit_status='pending',
    )
    db.add(song)
    db.commit()
    db.refresh(song)
    return ApiResponse(data=SongOut.model_validate(song))


@router.put('/{song_id}', response_model=ApiResponse[SongOut])
def update_song(song_id: int, payload: SongUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    song = db.get(Song, song_id)
    if not song or song.user_id != user.id or song.deleted_at is not None:
        raise HTTPException(status_code=404, detail='Song not found')
    data = payload.model_dump(exclude_unset=True)
    if 'tags' in data:
        song.tags_json = data.pop('tags')
    if 'raw_text' in data and data['raw_text']:
        song.content_json = parse_raw_tab(data['raw_text'])
    for key, value in data.items():
        setattr(song, key, value)
    if payload.is_public is not None:
        song.visibility = 'public' if payload.is_public else 'private'
        song.audit_status = 'pending'
    db.commit()
    db.refresh(song)
    return ApiResponse(data=SongOut.model_validate(song))


@router.post('/{song_id}/publish', response_model=ApiResponse[SongOut])
def publish_song(song_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    song = db.get(Song, song_id)
    if not song or song.user_id != user.id or song.deleted_at is not None:
        raise HTTPException(status_code=404, detail='Song not found')
    song.is_public = True
    song.visibility = 'public'
    song.audit_status = 'pending'
    song.published_at = datetime.utcnow()
    db.commit()
    db.refresh(song)
    return ApiResponse(data=SongOut.model_validate(song))


@router.delete('/{song_id}', response_model=ApiResponse[dict])
def delete_song(song_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    song = db.get(Song, song_id)
    if not song or song.user_id != user.id:
        raise HTTPException(status_code=404, detail='Song not found')
    song.deleted_at = datetime.utcnow()
    db.commit()
    return ApiResponse(data={'deleted': True})
