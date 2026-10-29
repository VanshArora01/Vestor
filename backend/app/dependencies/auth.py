from uuid import UUID

import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.exceptions import UnauthorizedError
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User
from app.repositories.user_repository import UserRepository

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise UnauthorizedError(
            code="AUTH_UNAUTHORIZED",
            message="Authentication required",
        )

    try:
        payload = decode_access_token(credentials.credentials)
        user_id = UUID(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError) as exc:
        raise UnauthorizedError(
            code="AUTH_INVALID_TOKEN",
            message="Invalid or expired token",
        ) from exc

    user = UserRepository(db).get_by_id(user_id)
    if user is None:
        raise UnauthorizedError(
            code="AUTH_INVALID_TOKEN",
            message="Invalid or expired token",
        )
    return user
