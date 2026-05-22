from pydantic import BaseModel

from app.schemas.song import SongSection


class AiSongwritingIn(BaseModel):
    prompt: str
    style: str | None = '民谣'
    difficulty: str | None = '新手'
    key: str | None = 'auto'
    language: str | None = '中文'


class AiChordsIn(BaseModel):
    lyrics: str
    key: str | None = 'auto'
    difficulty: str | None = '新手'
    rhythm: str | None = 'auto'


class AiRewriteIn(BaseModel):
    song_id: int
    rewrite_goal: str


class AiSongResult(BaseModel):
    songId: int | None = None
    title: str
    style: str
    key: str
    bpm: int
    capo: str
    difficulty: str
    strumming: str
    chords: list[str]
    sections: list[SongSection]
    practiceTips: list[str] = []
