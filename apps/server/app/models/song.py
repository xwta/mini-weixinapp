from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Song(Base):
    __tablename__ = 'songs'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey('users.id'), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    author_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    artist_name: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    style: Mapped[str | None] = mapped_column(String(100), nullable=True)
    song_key: Mapped[str | None] = mapped_column(String(20), nullable=True)
    bpm: Mapped[int | None] = mapped_column(Integer, nullable=True)
    capo: Mapped[str | None] = mapped_column(String(50), nullable=True)
    difficulty: Mapped[str | None] = mapped_column(String(50), nullable=True)
    strumming: Mapped[str | None] = mapped_column(String(255), nullable=True)
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    chords_json: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    tags_json: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    content_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    source_type: Mapped[str] = mapped_column(String(50), default='ai')
    edit_mode: Mapped[str] = mapped_column(String(50), default='ai')
    visibility: Mapped[str] = mapped_column(String(50), default='private')
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    audit_status: Mapped[str] = mapped_column(String(50), default='pending')
    favorite_count: Mapped[int] = mapped_column(Integer, default=0)
    like_count: Mapped[int] = mapped_column(Integer, default=0)
    share_count: Mapped[int] = mapped_column(Integer, default=0)
    comment_count: Mapped[int] = mapped_column(Integer, default=0)
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    practice_count: Mapped[int] = mapped_column(Integer, default=0)
    published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    user = relationship('User', back_populates='songs')
