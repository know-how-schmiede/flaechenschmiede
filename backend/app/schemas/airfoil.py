from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.airfoil import AirfoilKind


class AirfoilOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    kind: AirfoilKind
    description: str | None
    coordinates: list[list[float]]
    parameters: dict
    is_active: bool
    created_at: datetime


class AirfoilCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    kind: AirfoilKind
    description: str | None = Field(default=None, max_length=1000)
    dat_content: str | None = Field(default=None, max_length=500_000)
    step_position: float = Field(default=0.5, ge=0.1, le=0.9)
    thickness: float = Field(default=0.08, ge=0.01, le=0.3)

    @model_validator(mode="after")
    def conventional_requires_coordinates(self):
        if self.kind == AirfoilKind.CONVENTIONAL and not self.dat_content:
            raise ValueError("Für ein klassisches Profil werden DAT-Koordinaten benötigt.")
        return self


class AirfoilStatusUpdate(BaseModel):
    is_active: bool
