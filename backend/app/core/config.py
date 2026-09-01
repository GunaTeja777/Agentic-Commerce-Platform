import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Agentic Commerce API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    DATABASE_URL: str = "postgresql+psycopg://postgres:4538@localhost:5432/agentic_commerce"
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    ENVIRONMENT: str = "development"
    
    RAZORPAY_KEY_ID: str = "rzp_test_TWfbZX7sZugjLd"
    RAZORPAY_KEY_SECRET: str = "dDKMrN7rmFmhUu5gHyPR26J1"
    RAZORPAY_ENV: str = "test"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
