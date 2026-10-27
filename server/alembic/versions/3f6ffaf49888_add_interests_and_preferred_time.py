"""add_interests_and_preferred_time

Revision ID: 3f6ffaf49888
Revises: 03504816da5a
Create Date: 2026-10-27 16:14:25.382212

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3f6ffaf49888'
down_revision: Union[str, Sequence[str], None] = '03504816da5a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    columns_nl = []
    columns_users = []
    indexes_users = []
    try:
        insp = sa.inspect(bind)
        columns_nl = [c['name'] for c in insp.get_columns('notification_logs')]
        columns_users = [c['name'] for c in insp.get_columns('users')]
        indexes_users = [i['name'] for i in insp.get_indexes('users')]
    except Exception:
        pass

    if 'scheduled_time' not in columns_nl:
        op.add_column('notification_logs', sa.Column('scheduled_time', sa.Time(), nullable=True))

    if 'preferred_journaling_time' not in columns_users:
        op.add_column('users', sa.Column('preferred_journaling_time', sa.Time(), server_default='20:00:00', nullable=False))

    if 'interests' not in columns_users:
        op.add_column('users', sa.Column('interests', sa.JSON(), server_default='["mindfulness", "gratitude"]', nullable=False))

    # Drop old index if present and recreate with preferred_journaling_time
    op.execute("DROP INDEX IF EXISTS idx_users_notification_dispatch;")
    op.create_index('idx_users_notification_dispatch', 'users', ['timezone', 'preferred_journaling_time'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('idx_users_notification_dispatch', table_name='users')
    op.create_index(op.f('idx_users_notification_dispatch'), 'users', ['timezone', 'notification_time_preference'], unique=False)
    op.drop_column('users', 'interests')
    op.drop_column('users', 'preferred_journaling_time')
    op.drop_column('notification_logs', 'scheduled_time')
