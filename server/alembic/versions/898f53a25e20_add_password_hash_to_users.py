"""add_password_hash_to_users

Revision ID: 898f53a25e20
Revises: 3f6ffaf49888
Create Date: 2026-10-27 19:52:03.720952

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '898f53a25e20'
down_revision: Union[str, Sequence[str], None] = '3f6ffaf49888'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);")


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("users", "password_hash")
