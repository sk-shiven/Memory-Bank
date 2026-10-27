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
    bind = op.get_bind()
    columns_users = []
    try:
        insp = sa.inspect(bind)
        columns_users = [c['name'] for c in insp.get_columns('users')]
    except Exception:
        pass

    if 'password_hash' not in columns_users:
        if bind.dialect.name == 'postgresql':
            op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);")
        else:
            op.add_column('users', sa.Column('password_hash', sa.String(length=255), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("users", "password_hash")
