from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, UnauthorizedError
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest
from app.schemas.user import UserResponse


class AuthService:
    def __init__(self, db: Session) -> None:
        self.users = UserRepository(db)

    def register(self, payload: RegisterRequest) -> AuthResponse:
        existing = self.users.get_by_email(payload.email)
        if existing is not None:
            raise ConflictError(
                code="AUTH_EMAIL_EXISTS",
                message="An account with this email already exists",
            )

        user = self.users.create(
            email=payload.email,
            password_hash=hash_password(payload.password),
            name=payload.name.strip(),
        )
        return self._auth_response(user)

    def login(self, payload: LoginRequest) -> AuthResponse:
        user = self.users.get_by_email(payload.email)
        if user is None or not verify_password(payload.password, user.password_hash):
            raise UnauthorizedError(
                code="AUTH_INVALID_CREDENTIALS",
                message="Invalid email or password",
            )
        return self._auth_response(user)

    def _auth_response(self, user: User) -> AuthResponse:
        return AuthResponse(
            access_token=create_access_token(user.id),
            user=UserResponse.model_validate(user),
        )
