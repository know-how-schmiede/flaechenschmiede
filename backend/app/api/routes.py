import json
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session as DbSession

from app.auth.security import (
    create_session, get_current_session, hash_password, require_admin,
    require_csrf, verify_password,
)
from app.core.config import get_settings
from app.core.database import get_db
from app.models.user import AuditEvent, Session, User
from app.schemas.user import (
    LoginIn, PasswordUpdate, ProfileUpdate, UserAdminUpdate, UserCreate, UserOut,
)
from app.version import __version__

router = APIRouter(prefix="/api/v1")


def audit(db: DbSession, actor: User, action: str, target_id: UUID | None, details: dict | None = None):
    db.add(AuditEvent(actor_id=actor.id, action=action, target_id=str(target_id) if target_id else None,
                      details=json.dumps(details) if details else None))


@router.get("/health")
def health():
    return {"status": "ok", "version": __version__}


@router.post("/auth/login")
def login(payload: LoginIn, response: Response, db: DbSession = Depends(get_db)):
    user = db.scalar(select(User).where(func.lower(User.email) == payload.email.lower()))
    if not user or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "E-Mail oder Passwort ist falsch")
    raw_token, session = create_session(db, user)
    settings = get_settings()
    response.set_cookie("fs_session", raw_token, httponly=True, secure=settings.session_cookie_secure,
                        samesite=settings.session_cookie_samesite, max_age=settings.session_lifetime_hours * 3600,
                        path="/")
    return {"user": UserOut.model_validate(user), "csrf_token": session.csrf_token}


@router.post("/auth/logout", status_code=204)
def logout(response: Response, session: Session = Depends(require_csrf), db: DbSession = Depends(get_db)):
    db.delete(session)
    db.commit()
    response.delete_cookie("fs_session", path="/")


@router.get("/auth/me")
def me(session: Session = Depends(get_current_session)):
    return {"user": UserOut.model_validate(session.user), "csrf_token": session.csrf_token}


@router.put("/profile")
def update_profile(payload: ProfileUpdate, session: Session = Depends(require_csrf),
                   db: DbSession = Depends(get_db)):
    duplicate = db.scalar(select(User).where(func.lower(User.email) == payload.email.lower(), User.id != session.user.id))
    if duplicate:
        raise HTTPException(status.HTTP_409_CONFLICT, "E-Mail-Adresse wird bereits verwendet")
    session.user.email = payload.email.lower()
    session.user.display_name = payload.display_name.strip()
    session.user.theme = payload.theme
    audit(db, session.user, "profile.updated", session.user.id)
    db.commit()
    return UserOut.model_validate(session.user)


@router.put("/profile/password", status_code=204)
def update_password(payload: PasswordUpdate, session: Session = Depends(require_csrf),
                    db: DbSession = Depends(get_db)):
    if not verify_password(payload.current_password, session.user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Aktuelles Passwort ist falsch")
    session.user.password_hash = hash_password(payload.new_password)
    audit(db, session.user, "password.changed", session.user.id)
    db.commit()


@router.get("/admin/users", response_model=list[UserOut])
def list_users(_: Session = Depends(require_admin), db: DbSession = Depends(get_db)):
    return list(db.scalars(select(User).order_by(User.created_at.desc())))


@router.post("/admin/users", response_model=UserOut, status_code=201)
def create_user(payload: UserCreate, admin: Session = Depends(require_admin),
                db: DbSession = Depends(get_db)):
    if db.scalar(select(User).where(func.lower(User.email) == payload.email.lower())):
        raise HTTPException(status.HTTP_409_CONFLICT, "E-Mail-Adresse wird bereits verwendet")
    user = User(email=payload.email.lower(), display_name=payload.display_name.strip(),
                password_hash=hash_password(payload.password), role=payload.role)
    db.add(user)
    db.flush()
    audit(db, admin.user, "user.created", user.id, {"role": user.role.value})
    db.commit()
    db.refresh(user)
    return user


@router.patch("/admin/users/{user_id}", response_model=UserOut)
def update_user(user_id: UUID, payload: UserAdminUpdate, admin: Session = Depends(require_admin),
                db: DbSession = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Benutzer nicht gefunden")
    if user.id == admin.user.id and not payload.is_active:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Das eigene Konto kann nicht deaktiviert werden")
    user.role, user.is_active = payload.role, payload.is_active
    audit(db, admin.user, "user.updated", user.id, payload.model_dump(mode="json"))
    db.commit()
    return user
