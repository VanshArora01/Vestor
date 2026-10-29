from uuid import UUID

from sqlalchemy.orm import Session

from app.models.user import User


class UserRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(self, user_id: UUID) -> User | None:
        return self.db.get(User, user_id)

    def get_by_email(self, email: str) -> User | None:
        return self.db.query(User).filter(User.email == email.lower()).first()

    def create(self, *, email: str, password_hash: str, name: str) -> User:
        user = User(email=email.lower(), password_hash=password_hash, name=name)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user
