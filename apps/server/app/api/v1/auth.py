from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.user import LoginOut, UserOut, WechatLoginIn

router = APIRouter(prefix='/auth', tags=['auth'])


@router.post('/wechat-login', response_model=ApiResponse[LoginOut])
def wechat_login(payload: WechatLoginIn, db: Session = Depends(get_db)):
    # MVP mock login: use code as openid fallback.
    # Replace with WeChat jscode2session call before production.
    if not payload.code:
        raise HTTPException(status_code=400, detail='code is required')

    openid = f'mock_{payload.code}' if settings.APP_ENV != 'production' else payload.code
    user = db.query(User).filter(User.openid == openid).first()
    if not user:
        user = User(openid=openid, nickname=payload.nickname, avatar_url=payload.avatar_url)
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(user.id)
    return ApiResponse(data=LoginOut(token=token, user=UserOut.model_validate(user)))


@router.post('/admin-login')
def admin_login(username: str, password: str):
    if username != settings.ADMIN_USERNAME or password != settings.ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail='Invalid admin credentials')
    token = create_access_token('admin', extra={'role': 'admin'})
    return ApiResponse(data={'token': token})
