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
    artist_name: str | None = None
    style: str | None = None
    key: str | None = Field(default=None, alias='song_key')
    bpm: int | None = None
    capo: str | None = None
    difficulty: str | None = None
    strumming: str | None = None
    chords: list[str] | None = None
    tags: list[str] | None = None
    sections: list[SongSection] | None = None
    content_json: dict[str, Any] | None = None
    raw_text: str | None = None
    is_public: bool = False


class ManualSongCreate(BaseModel):
    title: str
    artist_name: str | None = None
    style: str | None = '弹唱'
    song_key: str | None = 'C'
    bpm: int | None = None
    capo: str | None = '0品'
    difficulty: str | None = '新手'
    strumming: str | None = None
    tags: list[str] | None = None
    raw_text: str
    is_public: bool = False


class SongUpdate(BaseModel):
    title: str | None = None
    artist_name: str | None = None
    style: str | None = None
    song_key: str | None = None
    bpm: int | None = None
    capo: str | None = None
    difficulty: str | None = None
    strumming: str | None = None
    tags: list[str] | None = None
    raw_text: str | None = None
    content_json: dict[str, Any] | None = None
    is_public: bool | None = None


class SongOut(BaseModel):
    id: int
    user_id: int | None = None
    title: str
    author_name: str | None = None
    artist_name: str | None = None
    style: str | None = None
    song_key: str | None = None
    bpm: int | None = None
    capo: str | None = None
    difficulty: str | None = None
    strumming: str | None = None
    raw_text: str | None = None
    chords_json: list[str] | None = None
    tags_json: list[str] | None = None
    content_json: dict[str, Any] | None = None
    source_type: str
    edit_mode: str
    visibility: str
    is_public: bool
    audit_status: str
    favorite_count: int
    like_count: int
    share_count: int
    comment_count: int
    view_count: int
    practice_count: int
    created_at: datetime

    model_config = {'from_attributes': True}
