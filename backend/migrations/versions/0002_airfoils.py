"""Create airfoil library.

Revision ID: 0002
Revises: 0001
"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

airfoil_kind = sa.Enum("CONVENTIONAL", "KFM1", "KFM2", "KFM4", name="airfoilkind")


def upgrade():
    op.create_table(
        "airfoils",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("kind", airfoil_kind, nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("coordinates", sa.JSON(), nullable=False),
        sa.Column("parameters", sa.JSON(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_by_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_airfoils_name", "airfoils", ["name"], unique=True)
    op.create_index("ix_airfoils_kind", "airfoils", ["kind"])
    op.create_index("ix_airfoils_is_active", "airfoils", ["is_active"])


def downgrade():
    op.drop_table("airfoils")
    airfoil_kind.drop(op.get_bind(), checkfirst=True)
