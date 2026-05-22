from typing import Any, Generic, TypeVar

from pydantic import BaseModel

T = TypeVar('T')


class ApiResponse(BaseModel, Generic[T]):
    code: int = 0
    message: str = 'success'
    data: T | None = None


class PageResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[Any]
