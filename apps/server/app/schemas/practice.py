from datetime import datetime
from typing import Any

from pydantic import BaseModel


class PracticeRecordCreateIn(BaseModel):
    song_id: int
    duration_seconds: int = 0
    bpm: int | None = None
    scroll_speed: int | None = None
    practiced_sections: dict[str, Any] | None = None


class PracticeRecordOut(BaseModel):
    id: int
    user_id: int
    song_id: int
    duration_seconds: int
    bpm: int | None = None
    scroll_speed: int | None = None
    practiced_sections: dict[str, Any] | None = None
    created_at: datetime

    model_config = {'from_attributes': True}
