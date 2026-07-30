import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.user import now_utc


class AirfoilKind(str, enum.Enum):
    CONVENTIONAL = "conventional"
    KFM1 = "kfm1"
    KFM2 = "kfm2"
    KFM4 = "kfm4"


class Airfoil(Base):
    __tablename__ = "airfoils"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    kind: Mapped[AirfoilKind] = mapped_column(Enum(AirfoilKind), index=True)
    description: Mapped[str | None] = mapped_column(Text)
    coordinates: Mapped[list[list[float]]] = mapped_column(JSON)
    parameters: Mapped[dict] = mapped_column(JSON, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now_utc, onupdate=now_utc
    )
