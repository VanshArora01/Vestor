from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import setup_logging
import logging

logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    setup_logging()
    get_settings.cache_clear()
    settings = get_settings()
    logger.info("CORS allow_origins=%s", settings.cors_origins_list)

    app = FastAPI(title="Vestor API", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(app)
    from app.api.integrations.setu import router as setu_router
    app.include_router(api_router, prefix="/api/v1")
    app.include_router(setu_router, prefix="/api/integrations/setu")
    return app


app = create_app()
