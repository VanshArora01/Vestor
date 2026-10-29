import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


class AppError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400) -> None:
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class UnauthorizedError(AppError):
    def __init__(self, code: str = "AUTH_UNAUTHORIZED", message: str = "Authentication required") -> None:
        super().__init__(code=code, message=message, status_code=401)


class ConflictError(AppError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(code=code, message=message, status_code=409)


class NotFoundError(AppError):
    def __init__(self, code: str = "NOT_FOUND", message: str = "Resource not found") -> None:
        super().__init__(code=code, message=message, status_code=404)


class ForbiddenError(AppError):
    def __init__(self, code: str = "FORBIDDEN", message: str = "Access denied") -> None:
        super().__init__(code=code, message=message, status_code=403)


def _error_body(code: str, message: str) -> dict[str, Any]:
    return {"detail": {"code": code, "message": message}}


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_body(exc.code, exc.message),
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(_request: Request, exc: StarletteHTTPException) -> JSONResponse:
        if isinstance(exc.detail, dict) and "code" in exc.detail and "message" in exc.detail:
            body = {"detail": exc.detail}
        else:
            message = exc.detail if isinstance(exc.detail, str) else "Request failed"
            code = "HTTP_ERROR"
            if exc.status_code == 401:
                code = "AUTH_UNAUTHORIZED"
            elif exc.status_code == 404:
                code = "NOT_FOUND"
            body = _error_body(code, message)
        return JSONResponse(status_code=exc.status_code, content=body)

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        # Keep FastAPI's 422 behavior; normalize detail to envelope shape for consistency
        return JSONResponse(
            status_code=422,
            content=jsonable_encoder({
                "detail": {
                    "code": "VALIDATION_ERROR",
                    "message": "Request validation failed",
                    "errors": exc.errors(),
                }
            }),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled server error: %s", exc)
        return JSONResponse(
            status_code=500,
            content=_error_body("INTERNAL_ERROR", "An unexpected error occurred"),
        )
