from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class Notification(Base):
    __tablename__='notifications'

    id:Mapped[int]=mapped_column(Integer,primary_key=True,index=True)
    user_id:Mapped[int]=mapped_column(ForeignKey('users.id'),nullable=False,index=True)
    type:Mapped[str]=mapped_column(String(50),nullable=False)
    title:Mapped[str]=mapped_column(String(255),nullable=False)
    content:Mapped[str]=mapped_column(Text,nullable=False)
    is_read:Mapped[bool]=mapped_column(Boolean,default=False)
    created_at:Mapped[datetime]=mapped_column(DateTime,server_default=func.now())