from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class SongLine(BaseModel):
    chordLine: str | None = None
    lyricLine: str


class SongSection(BaseModel):
    name: str
    lines: list[SongLine]


class SongCreate(BaseModel):
    title: str
    style: str | None = None
    key: str | None = Field(default=None, alias='song_key')
    bpm: int | None = None
    capo: str | None = None
    difficulty: str | None = None
    strumming: str | None = None
    chords: list[str] | None = None
    sections: list[SongSection] | None = None
    content_json: dict[str, Any] | None = None
    is_public: bool = False


class SongOut(BaseModel):
    id: int
    title: str
    style: str | None = None
    song_key: str | None = None
    bpm: int | None = None
    capo: str | None = None
    difficulty: str | None = None
    strumming: str | None = None
    chords_json: list[str] | None = None
    content_json: dict[str, Any] | None = None
    source_type: str
    is_public: bool
    audit_status: str
    favorite_count: int
    view_count: int
    created_at: datetime

    model_config = {'from_attributes': True}
