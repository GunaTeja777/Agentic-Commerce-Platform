import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class AgentSettings(BaseSettings):
    """Configuration settings for the Agent service."""
    BACKEND_URL: str = "http://localhost:8000"
    API_V1_PREFIX: str = "/api"
    
    # LLM Settings (Orchestration with Gemini)
    LLM_PROVIDER: str = "gemini"  # "gemini", "openai", "groq"
    LLM_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    LLM_MODEL: str = "gemini-2.5-flash"
    LLM_TEMPERATURE: float = 0.1

    # Curation Settings (Prompt curation with Hugging Face)
    CURATION_PROVIDER: str = "huggingface"
    HUGGINGFACE_API_KEY: Optional[str] = None
    HF_TOKEN: Optional[str] = None
    CURATION_MODEL: str = "meta-llama/Llama-3.2-3B-Instruct"
    
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
    def effective_api_key(self) -> Optional[str]:
        """Resolve API key based on provider or explicit env variables for the main agent."""
        provider = self.LLM_PROVIDER.lower()
        if provider in ["gemini", "google"]:
            return self.GEMINI_API_KEY or self.LLM_API_KEY or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        elif provider in ["huggingface", "hf"]:
            return self.HUGGINGFACE_API_KEY or self.HF_TOKEN or self.LLM_API_KEY or os.environ.get("HUGGINGFACE_API_KEY") or os.environ.get("HF_TOKEN")
        elif provider in ["groq"]:
            return self.GROQ_API_KEY or self.LLM_API_KEY or os.environ.get("GROQ_API_KEY")
        return self.OPENAI_API_KEY or self.LLM_API_KEY or os.environ.get("OPENAI_API_KEY")

    @property
    def effective_curation_key(self) -> Optional[str]:
        """Resolve API key for the Hugging Face curation service."""
        return self.HUGGINGFACE_API_KEY or self.HF_TOKEN or os.environ.get("HUGGINGFACE_API_KEY") or os.environ.get("HF_TOKEN") or self.effective_api_key

    @property
    def api_base_url(self) -> str:
        """Returns the full base URL including API prefix, e.g. http://localhost:8000/api"""
        base = self.BACKEND_URL.rstrip("/")
        prefix = self.API_V1_PREFIX.strip("/")
        return f"{base}/{prefix}" if prefix else base


settings = AgentSettings()
