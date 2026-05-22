from datetime import datetime

from pydantic import BaseModel


class ProductOut(BaseModel):
    code: str
    name: str
    product_type: str
    amount: float
    description: str
    benefits: list[str]


class OrderCreateIn(BaseModel):
    product_code: str


class OrderOut(BaseModel):
    id: int
    order_no: str
    product_code: str
    product_type: str
    amount: float
    payment_status: str
    payment_method: str
    created_at: datetime

    model_config = {'from_attributes': True}
