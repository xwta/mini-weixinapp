from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_admin_user
from app.core.database import get_db
from app.models.ai_generation_log import AiGenerationLog
from app.models.order import Order
from app.models.song import Song
from app.models.user import User
from app.schemas.common import ApiResponse, PageResponse
from app.schemas.song import SongOut
from app.schemas.user import UserOut

router = APIRouter(prefix='/admin', tags=['admin'])


@router.get('/users', response_model=ApiResponse[PageResponse])
def list_users(page: int = 1, page_size: int = 20, db: Session = Depends(get_db), _: dict = Depends(get_admin_user)):
    query = db.query(User).order_by(User.created_at.desc())
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return ApiResponse(data=PageResponse(total=total, page=page, page_size=page_size, items=[UserOut.model_validate(item).model_dump() for item in items]))


@router.get('/songs', response_model=ApiResponse[PageResponse])
def list_songs(page: int = 1, page_size: int = 20, audit_status: str | None = None, db: Session = Depends(get_db), _: dict = Depends(get_admin_user)):
    query = db.query(Song).filter(Song.deleted_at.is_(None)).order_by(Song.created_at.desc())
    if audit_status:
        query = query.filter(Song.audit_status == audit_status)
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return ApiResponse(data=PageResponse(total=total, page=page, page_size=page_size, items=[SongOut.model_validate(item).model_dump() for item in items]))


@router.patch('/songs/{song_id}/audit', response_model=ApiResponse[SongOut])
def audit_song(song_id: int, audit_status: str, db: Session = Depends(get_db), _: dict = Depends(get_admin_user)):
    if audit_status not in {'pending', 'approved', 'rejected'}:
        raise HTTPException(status_code=400, detail='invalid audit_status')
    song = db.get(Song, song_id)
    if not song:
        raise HTTPException(status_code=404, detail='Song not found')
    song.audit_status = audit_status
    if audit_status == 'approved':
        song.is_public = True
    elif audit_status == 'rejected':
        song.is_public = False
    db.commit()
    db.refresh(song)
    return ApiResponse(data=SongOut.model_validate(song))


@router.get('/ai-generation-logs', response_model=ApiResponse[PageResponse])
def ai_logs(page: int = 1, page_size: int = 20, db: Session = Depends(get_db), _: dict = Depends(get_admin_user)):
    query = db.query(AiGenerationLog).order_by(AiGenerationLog.created_at.desc())
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return ApiResponse(data=PageResponse(total=total, page=page, page_size=page_size, items=[{
        'id': item.id,
        'user_id': item.user_id,
        'song_id': item.song_id,
        'generation_type': item.generation_type,
        'status': item.status,
        'model_name': item.model_name,
        'created_at': item.created_at.isoformat() if item.created_at else None,
    } for item in items]))


@router.get('/orders', response_model=ApiResponse[PageResponse])
def list_orders(page: int = 1, page_size: int = 20, db: Session = Depends(get_db), _: dict = Depends(get_admin_user)):
    query = db.query(Order).order_by(Order.created_at.desc())
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return ApiResponse(data=PageResponse(total=total, page=page, page_size=page_size, items=[{
        'id': item.id,
        'user_id': item.user_id,
        'order_no': item.order_no,
        'product_code': item.product_code,
        'amount': float(item.amount),
        'payment_status': item.payment_status,
        'created_at': item.created_at.isoformat() if item.created_at else None,
    } for item in items]))
