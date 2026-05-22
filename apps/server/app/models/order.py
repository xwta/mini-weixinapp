from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Order(Base):
    __tablename__ = 'orders'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), nullable=False, index=True)
    product_code: Mapped[str] = mapped_column(String(100), nullable=False)
    order_no: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    product_type: Mapped[str] = mapped_column(String(50), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    payment_status: Mapped[str] = mapped_column(String(50), default='pending')
    payment_method: Mapped[str] = mapped_column(String(50), default='wechat')
    transaction_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
