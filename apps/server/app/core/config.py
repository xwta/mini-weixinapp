from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    APP_NAME: str = '谱灵 AI API'
    APP_ENV: str = 'development'
    DEBUG: bool = True
    API_V1_PREFIX: str = '/api/v1'

    SECRET_KEY: str = 'change-me'
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    DATABASE_URL: str = 'mysql+pymysql://puling_user:puling_password@127.0.0.1:3306/puling_ai?charset=utf8mb4'
    REDIS_URL: str = 'redis://127.0.0.1:6379/0'

    WECHAT_APP_ID: str = ''
    WECHAT_APP_SECRET: str = ''

    AI_PROVIDER: str = 'mock'
    OPENAI_API_KEY: str = ''
    OPENAI_BASE_URL: str = 'https://api.openai.com/v1'
    OPENAI_MODEL: str = 'gpt-4o-mini'

    ADMIN_USERNAME: str = 'admin'
    ADMIN_PASSWORD: str = 'admin123456'


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
