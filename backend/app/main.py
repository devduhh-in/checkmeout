"""CheckMeOut API entry point.

Run locally with:  uv run uvicorn app.main:app --reload --port 8000
"""

from fastapi import FastAPI

from app.core.config import get_settings
from app.core.errors import register_error_handlers
from app.modules.health.router import router as health_router

# Every endpoint lives under /api, matching how the frontend forwards requests.
API_PREFIX = "/api"


def create_app() -> FastAPI:
    settings = get_settings()

    # Interactive API docs are only available during development.
    docs_enabled = settings.is_development
    app = FastAPI(
        title=settings.app_name,
        version=settings.version,
        docs_url=f"{API_PREFIX}/docs" if docs_enabled else None,
        redoc_url=None,
        openapi_url=f"{API_PREFIX}/openapi.json" if docs_enabled else None,
    )

    register_error_handlers(app)

    # Each feature module contributes one router. New modules are added here.
    app.include_router(health_router, prefix=API_PREFIX)

    return app


app = create_app()
