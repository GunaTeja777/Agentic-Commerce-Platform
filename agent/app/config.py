import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class AgentSettings(BaseSettings):
    """Configuration settings for the Agent service."""
    BACKEND_URL: str = "http://localhost:8000"
    API_V1_PREFIX: str = "/api"
    
    # LLM Settings
    LLM_PROVIDER: str = "openai"
    LLM_API_KEY: Optional[str] = None
    LLM_MODEL: str = "gpt-4o-mini"
    LLM_TEMPERATURE: float = 0.1
    
    # Merchant defaults
    DEFAULT_MERCHANT_ID: int = 1
    
    # Timeouts & Retries
    BACKEND_TIMEOUT_SECONDS: float = 10.0
    
    LOG_LEVEL: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def api_base_url(self) -> str:
        """Returns the full base URL including API prefix, e.g. http://localhost:8000/api"""
        base = self.BACKEND_URL.rstrip("/")
        prefix = self.API_V1_PREFIX.strip("/")
        return f"{base}/{prefix}" if prefix else base


settings = AgentSettings()
