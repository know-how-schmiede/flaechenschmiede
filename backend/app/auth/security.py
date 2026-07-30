import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.core.config import get_settings
from app.core.database import get_db
from app.models.user import Session, User, UserRole

password_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return password_hasher.verify(password_hash, password)
    except VerifyMismatchError:
        return False


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_session(db: DbSession, user: User) -> tuple[str, Session]:
    settings = get_settings()
    raw_token = secrets.token_urlsafe(32)
    session = Session(
        token_hash=token_hash(raw_token),
        csrf_token=secrets.token_urlsafe(32),
        user=user,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=settings.session_lifetime_hours),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return raw_token, session


def get_current_session(
    request: Request, db: DbSession = Depends(get_db)
) -> Session:
    raw_token = request.cookies.get("fs_session")
    if not raw_token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Nicht angemeldet")
    session = db.scalar(select(Session).where(Session.token_hash == token_hash(raw_token)))
    if not session:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sitzung abgelaufen")
    expires_at = session.expires_at
    if not expires_at.tzinfo:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc) or not session.user.is_active:
        db.delete(session)
        db.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sitzung abgelaufen")
    return session


def require_csrf(
    session: Session = Depends(get_current_session),
    csrf_token: str | None = Header(None, alias="X-CSRF-Token"),
) -> Session:
    if not csrf_token or not secrets.compare_digest(csrf_token, session.csrf_token):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Ungültiger CSRF-Token")
    return session


def require_admin(session: Session = Depends(require_csrf)) -> Session:
    if session.user.role != UserRole.ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Administratorrechte erforderlich")
    return session
