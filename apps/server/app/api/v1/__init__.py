from fastapi import APIRouter
from app.api.v1 import admin, ai, auth, comments, discovery, favorites, orders, practice, social, songs, users
api_router=APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(ai.router)
api_router.include_router(songs.router)
api_router.include_router(favorites.router)
api_router.include_router(orders.router)
api_router.include_router(practice.router)
api_router.include_router(social.router)
api_router.include_router(comments.router)
api_router.include_router(discovery.router)
api_router.include_router(admin.router)