from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.practice_record import PracticeRecord
from app.models.song import Song
from app.models.user import User
from app.schemas.common import ApiResponse, PageResponse
from app.schemas.practice import PracticeRecordCreateIn, PracticeRecordOut

router = APIRouter(prefix='/practice-records', tags=['practice'])


@router.post('', response_model=ApiResponse[PracticeRecordOut])
def create_practice_record(payload: PracticeRecordCreateIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    song = db.get(Song, payload.song_id)
    if not song or song.deleted_at is not None:
        raise HTTPException(status_code=404, detail='Song not found')

    record = PracticeRecord(
        user_id=user.id,
        song_id=payload.song_id,
        duration_seconds=payload.duration_seconds,
        bpm=payload.bpm,
        scroll_speed=payload.scroll_speed,
        practiced_sections=payload.practiced_sections,
    )
    song.practice_count += 1
    db.add(record)
    db.commit()
    db.refresh(record)
    return ApiResponse(data=PracticeRecordOut.model_validate(record))


@router.get('/recent', response_model=ApiResponse[PageResponse])
def recent_practice_records(page: int = 1, page_size: int = 20, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    query = db.query(PracticeRecord).filter(PracticeRecord.user_id == user.id).order_by(PracticeRecord.created_at.desc())
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return ApiResponse(data=PageResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[PracticeRecordOut.model_validate(item).model_dump() for item in items],
    ))
