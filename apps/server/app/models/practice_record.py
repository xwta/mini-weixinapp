from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class PracticeRecord(Base):
    __tablename__ = 'practice_records'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), nullable=False, index=True)
    song_id: Mapped[int] = mapped_column(ForeignKey('songs.id'), nullable=False, index=True)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0)
    bpm: Mapped[int | None] = mapped_column(Integer, nullable=True)
    scroll_speed: Mapped[int | None] = mapped_column(Integer, nullable=True)
    practiced_sections: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
