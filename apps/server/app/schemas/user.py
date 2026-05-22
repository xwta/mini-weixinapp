from datetime import datetime

from pydantic import BaseModel


class UserOut(BaseModel):
    id: int
    nickname: str | None = None
    avatar_url: str | None = None
    membership_type: str
    generation_quota: int
    daily_free_quota: int
    total_generated: int
    created_at: datetime

    model_config = {'from_attributes': True}


class WechatLoginIn(BaseModel):
    code: str
    nickname: str | None = None
    avatar_url: str | None = None


class LoginOut(BaseModel):
    token: str
    user: UserOut
