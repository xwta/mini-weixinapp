"""add practice records

Revision ID: 0002_add_practice_records
Revises: 0001_initial_schema
Create Date: 2026-05-23
"""
from alembic import op
import sqlalchemy as sa

revision = '0002_add_practice_records'
down_revision = '0001_initial_schema'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'practice_records',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('song_id', sa.Integer(), sa.ForeignKey('songs.id'), nullable=False),
        sa.Column('duration_seconds', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('bpm', sa.Integer(), nullable=True),
        sa.Column('scroll_speed', sa.Integer(), nullable=True),
        sa.Column('practiced_sections', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index('ix_practice_records_id', 'practice_records', ['id'])
    op.create_index('ix_practice_records_user_id', 'practice_records', ['user_id'])
    op.create_index('ix_practice_records_song_id', 'practice_records', ['song_id'])


def downgrade() -> None:
    op.drop_table('practice_records')
