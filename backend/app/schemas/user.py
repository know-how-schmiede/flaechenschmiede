from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.user import UserRole


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    email: EmailStr
    display_name: str
    role: UserRole
    is_active: bool
    theme: str
    created_at: datetime


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class ProfileUpdate(BaseModel):
    email: EmailStr
    display_name: str = Field(min_length=2, max_length=100)
    theme: str = Field(pattern="^(light|dark|system)$")


class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str = Field(min_length=12, max_length=128)


class UserCreate(BaseModel):
    email: EmailStr
    display_name: str = Field(min_length=2, max_length=100)
    password: str = Field(min_length=12, max_length=128)
    role: UserRole = UserRole.USER


class UserAdminUpdate(BaseModel):
    role: UserRole
    is_active: bool
