from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.order import Order
from app.models.user import User
from app.schemas.common import ApiResponse, PageResponse
from app.schemas.order import OrderCreateIn, OrderOut, ProductOut
from app.services.product_service import get_product, list_products

router = APIRouter(tags=['orders'])


@router.get('/products', response_model=ApiResponse[list[ProductOut]])
def products():
    return ApiResponse(data=list_products())


@router.post('/orders/create', response_model=ApiResponse[dict])
def create_order(payload: OrderCreateIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    product = get_product(payload.product_code)
    if not product:
        raise HTTPException(status_code=404, detail='Product not found')

    order_no = 'PL' + datetime.utcnow().strftime('%Y%m%d%H%M%S') + uuid4().hex[:8].upper()
    order = Order(
        user_id=user.id,
        product_code=product.code,
        order_no=order_no,
        product_type=product.product_type,
        amount=product.amount,
        payment_status='pending',
        payment_method='wechat',
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    # MVP returns a mock payment payload. Replace with real WeChat prepay parameters later.
    return ApiResponse(data={
        'order': OrderOut.model_validate(order).model_dump(),
        'payment_params': {
            'mock': True,
            'message': '微信支付预下单参数待接入',
        },
    })


@router.get('/orders/mine', response_model=ApiResponse[PageResponse])
def my_orders(page: int = 1, page_size: int = 20, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    query = db.query(Order).filter(Order.user_id == user.id).order_by(Order.created_at.desc())
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return ApiResponse(data=PageResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[OrderOut.model_validate(item).model_dump() for item in items],
    ))
