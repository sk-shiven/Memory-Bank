"""initial_schema_with_timezone_and_indexes

Revision ID: 03504816da5a
Revises: 
Create Date: 2026-10-27 15:31:44.467492

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '03504816da5a'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    tables = []
    try:
        insp = sa.inspect(bind)
        tables = insp.get_table_names()
    except Exception:
        tables = []

    # 1. Users Table
    if 'users' not in tables:
        op.create_table(
            'users',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('google_id', sa.String(length=255), nullable=True),
            sa.Column('email', sa.String(length=255), nullable=False),
            sa.Column('name', sa.String(length=255), nullable=True),
            sa.Column('avatar_url', sa.String(length=1024), nullable=True),
            sa.Column('timezone', sa.String(length=50), server_default='UTC', nullable=False),
            sa.Column('notification_time_preference', sa.String(length=10), server_default='20:00', nullable=False),
            sa.Column('push_token', sa.String(length=1024), nullable=True),
            sa.Column('streak_count', sa.Integer(), server_default='0', nullable=False),
            sa.Column('max_streak', sa.Integer(), server_default='0', nullable=False),
            sa.Column('last_answered_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
        op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
        op.create_index(op.f('ix_users_google_id'), 'users', ['google_id'], unique=True)
        op.create_index('idx_users_notification_dispatch', 'users', ['timezone', 'notification_time_preference'], unique=False)
    else:
        # Legacy fallback if users was partially created by pre-Alembic scripts
        insp = sa.inspect(bind)
        cols = [c['name'] for c in insp.get_columns('users')]
        if 'timezone' not in cols:
            op.add_column('users', sa.Column('timezone', sa.String(length=50), server_default='UTC', nullable=False))
        if 'streak_count' not in cols:
            op.add_column('users', sa.Column('streak_count', sa.Integer(), server_default='0', nullable=False))
        if 'max_streak' not in cols:
            op.add_column('users', sa.Column('max_streak', sa.Integer(), server_default='0', nullable=False))
        if 'last_answered_at' not in cols:
            op.add_column('users', sa.Column('last_answered_at', sa.DateTime(timezone=True), nullable=True))

    # 2. Questions Table
    if 'questions' not in tables:
        op.create_table(
            'questions',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('day_number', sa.Integer(), nullable=False),
            sa.Column('question_text', sa.Text(), nullable=False),
            sa.Column('theme_tags', sa.String(length=512), server_default='reflection,life', nullable=True),
            sa.Column('generated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('is_served', sa.Boolean(), server_default='true', nullable=False),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('user_id', 'day_number', name='uq_user_day_number'),
            sa.CheckConstraint('day_number >= 1 AND day_number <= 365', name='ck_question_day_number_range')
        )
        op.create_index(op.f('ix_questions_id'), 'questions', ['id'], unique=False)
        op.create_index(op.f('ix_questions_user_id'), 'questions', ['user_id'], unique=False)
        op.create_index(op.f('ix_questions_day_number'), 'questions', ['day_number'], unique=False)
        op.create_index('idx_questions_user_day_desc', 'questions', ['user_id', 'day_number'], unique=False)

    # 3. Answers Table
    if 'answers' not in tables:
        op.create_table(
            'answers',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('question_id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('text', sa.Text(), nullable=True),
            sa.Column('photo_url', sa.String(length=1024), nullable=True),
            sa.Column('audio_url', sa.String(length=1024), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(['question_id'], ['questions.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('question_id', name='uq_answers_question_id')
        )
        op.create_index(op.f('ix_answers_id'), 'answers', ['id'], unique=False)
        op.create_index(op.f('ix_answers_question_id'), 'answers', ['question_id'], unique=True)
        op.create_index(op.f('ix_answers_user_id'), 'answers', ['user_id'], unique=False)
        op.create_index('idx_answers_user_created_at', 'answers', ['user_id', 'created_at'], unique=False)

    # 4. Notification Logs Table
    if 'notification_logs' not in tables:
        op.create_table(
            'notification_logs',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('question_id', sa.Integer(), nullable=True),
            sa.Column('status', sa.String(length=50), nullable=False),
            sa.Column('channel', sa.String(length=50), nullable=False),
            sa.Column('error_message', sa.Text(), nullable=True),
            sa.Column('sent_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(['question_id'], ['questions.id'], ondelete='SET NULL'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index('idx_notification_logs_user_sent', 'notification_logs', ['user_id', 'sent_at'], unique=False)
        op.create_index(op.f('ix_notification_logs_id'), 'notification_logs', ['id'], unique=False)
        op.create_index(op.f('ix_notification_logs_question_id'), 'notification_logs', ['question_id'], unique=False)
        op.create_index(op.f('ix_notification_logs_user_id'), 'notification_logs', ['user_id'], unique=False)

    # 5. PostgreSQL specific extensions and trigram/text search indexes
    if bind.dialect.name == 'postgresql':
        op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")
        op.execute("CREATE INDEX IF NOT EXISTS idx_questions_theme_tags_trgm ON questions USING gin (theme_tags gin_trgm_ops);")
        op.execute("CREATE INDEX IF NOT EXISTS idx_answers_text_tsv ON answers USING gin (to_tsvector('english', COALESCE(text, '')));")


def downgrade() -> None:
    """Downgrade schema."""
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        op.execute("DROP INDEX IF EXISTS idx_answers_text_tsv;")
        op.execute("DROP INDEX IF EXISTS idx_questions_theme_tags_trgm;")
    op.drop_table('notification_logs')
    op.drop_table('answers')
    op.drop_table('questions')
    op.drop_table('users')
