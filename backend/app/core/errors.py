"""One error format for the whole API.

Every error response looks like this, so the frontend can handle all of them
the same way:

    {
      "error": {
        "code": "not_found",            # stable, machine-readable
        "message": "Not found.",        # safe to show to a person
        "details": [...]                # optional, e.g. which fields are invalid
      }
    }

Unexpected errors never reveal internal details (stack traces, file paths,
database messages); those are only written to the server log.
"""

import logging
from http import HTTPStatus
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("checkmeout.errors")


class AppError(Exception):
    """Raise this from feature code for an expected, user-facing error."""

    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        details: list[dict[str, Any]] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details


def error_body(code: str, message: str, details: list[dict[str, Any]] | None = None) -> dict:
    error: dict[str, Any] = {"code": code, "message": message}
    if details:
        error["details"] = details
    return {"error": error}


# Friendly codes for the HTTP errors the framework itself produces.
_HTTP_CODES = {
    400: "bad_request",
    401: "unauthenticated",
    403: "forbidden",
    404: "not_found",
    405: "method_not_allowed",
    409: "conflict",
    413: "payload_too_large",
    415: "unsupported_media_type",
    422: "validation_error",
    429: "rate_limited",
}


async def _handle_app_error(_: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=error_body(exc.code, exc.message, exc.details),
    )


async def _handle_http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
    code = _HTTP_CODES.get(exc.status_code, "http_error")
    # Use the framework's standard reason phrase rather than exc.detail, which
    # could contain internal text.
    message = f"{HTTPStatus(exc.status_code).phrase}."
    return JSONResponse(
        status_code=exc.status_code,
        content=error_body(code, message),
        headers=getattr(exc, "headers", None),
    )


async def _handle_validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
    details = [
        {
            "field": ".".join(str(part) for part in err.get("loc", ())),
            "message": err.get("msg", "Invalid value."),
        }
        for err in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content=error_body("validation_error", "Some fields are invalid.", details),
    )


async def _handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error on %s %s", request.method, request.url.path, exc_info=exc)
    return JSONResponse(
        status_code=500,
        content=error_body("internal_error", "Something went wrong. Please try again."),
    )


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, _handle_app_error)
    app.add_exception_handler(StarletteHTTPException, _handle_http_error)
    app.add_exception_handler(RequestValidationError, _handle_validation_error)
    app.add_exception_handler(Exception, _handle_unexpected_error)
