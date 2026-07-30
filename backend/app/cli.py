import getpass
import os

from sqlalchemy import func, select

from app.auth.security import hash_password
from app.core.database import SessionLocal
from app.models.user import User, UserRole


def create_admin():
    email = os.getenv("FS_ADMIN_EMAIL") or input("Admin-E-Mail: ").strip()
    name = os.getenv("FS_ADMIN_NAME") or input("Anzeigename: ").strip()
    password = os.getenv("FS_ADMIN_PASSWORD") or getpass.getpass("Passwort (mind. 12 Zeichen): ")
    if len(password) < 12:
        raise SystemExit("Das Passwort muss mindestens 12 Zeichen lang sein.")
    with SessionLocal() as db:
        if db.scalar(select(User).where(func.lower(User.email) == email.lower())):
            raise SystemExit("Diese E-Mail-Adresse existiert bereits.")
        db.add(User(email=email.lower(), display_name=name, password_hash=hash_password(password),
                    role=UserRole.ADMIN))
        db.commit()
    print("Administratorkonto wurde erstellt.")


if __name__ == "__main__":
    create_admin()
