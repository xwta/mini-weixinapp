from fastapi import APIRouter

from app.api.v1 import admin, ai, auth, favorites, orders, practice, songs, users

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(ai.router)
api_router.include_router(songs.router)
api_router.include_router(favorites.router)
api_router.include_router(orders.router)
api_router.include_router(practice.router)
api_router.include_router(admin.router)
