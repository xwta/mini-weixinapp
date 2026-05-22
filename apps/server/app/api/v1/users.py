from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.user import UserOut

router = APIRouter(prefix='/users', tags=['users'])


@router.get('/me', response_model=ApiResponse[UserOut])
def me(user: User = Depends(get_current_user)):
    return ApiResponse(data=UserOut.model_validate(user))
