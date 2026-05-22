"""initial schema

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-05-23
"""
from alembic import op
import sqlalchemy as sa

revision = '0001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('openid', sa.String(length=100), nullable=False),
        sa.Column('unionid', sa.String(length=100), nullable=True),
        sa.Column('nickname', sa.String(length=100), nullable=True),
        sa.Column('avatar_url', sa.Text(), nullable=True),
        sa.Column('membership_type', sa.String(length=50), nullable=False, server_default='free'),
        sa.Column('generation_quota', sa.Integer(), nullable=False, server_default='3'),
        sa.Column('daily_free_quota', sa.Integer(), nullable=False, server_default='3'),
        sa.Column('total_generated', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='active'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index('ix_users_id', 'users', ['id'])
    op.create_index('ix_users_openid', 'users', ['openid'], unique=True)

    op.create_table(
        'songs',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('author_name', sa.String(length=100), nullable=True),
        sa.Column('style', sa.String(length=100), nullable=True),
        sa.Column('song_key', sa.String(length=20), nullable=True),
        sa.Column('bpm', sa.Integer(), nullable=True),
        sa.Column('capo', sa.String(length=50), nullable=True),
        sa.Column('difficulty', sa.String(length=50), nullable=True),
        sa.Column('strumming', sa.String(length=255), nullable=True),
        sa.Column('chords_json', sa.JSON(), nullable=True),
        sa.Column('content_json', sa.JSON(), nullable=True),
        sa.Column('source_type', sa.String(length=50), nullable=False, server_default='ai'),
        sa.Column('is_public', sa.Boolean(), nullable=False, server_default=sa.text('0')),
        sa.Column('audit_status', sa.String(length=50), nullable=False, server_default='pending'),
        sa.Column('favorite_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('view_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('practice_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_songs_id', 'songs', ['id'])
    op.create_index('ix_songs_user_id', 'songs', ['user_id'])
    op.create_index('ix_songs_title', 'songs', ['title'])

    op.create_table(
        'favorites',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('song_id', sa.Integer(), sa.ForeignKey('songs.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint('user_id', 'song_id', name='uk_user_song'),
    )
    op.create_index('ix_favorites_id', 'favorites', ['id'])
    op.create_index('ix_favorites_user_id', 'favorites', ['user_id'])
    op.create_index('ix_favorites_song_id', 'favorites', ['song_id'])

    op.create_table(
        'ai_generation_logs',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('song_id', sa.Integer(), sa.ForeignKey('songs.id'), nullable=True),
        sa.Column('generation_type', sa.String(length=50), nullable=False),
        sa.Column('input_text', sa.Text(), nullable=True),
        sa.Column('input_params', sa.JSON(), nullable=True),
        sa.Column('output_json', sa.JSON(), nullable=True),
        sa.Column('model_name', sa.String(length=100), nullable=True),
        sa.Column('prompt_version', sa.String(length=50), nullable=True),
        sa.Column('token_usage', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('cost_amount', sa.Numeric(10, 4), nullable=False, server_default='0'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='success'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index('ix_ai_generation_logs_id', 'ai_generation_logs', ['id'])
    op.create_index('ix_ai_generation_logs_user_id', 'ai_generation_logs', ['user_id'])
    op.create_index('ix_ai_generation_logs_song_id', 'ai_generation_logs', ['song_id'])

    op.create_table(
        'orders',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('product_code', sa.String(length=100), nullable=False),
        sa.Column('order_no', sa.String(length=100), nullable=False),
        sa.Column('product_type', sa.String(length=50), nullable=False),
        sa.Column('amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('payment_status', sa.String(length=50), nullable=False, server_default='pending'),
        sa.Column('payment_method', sa.String(length=50), nullable=False, server_default='wechat'),
        sa.Column('transaction_id', sa.String(length=100), nullable=True),
        sa.Column('paid_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index('ix_orders_id', 'orders', ['id'])
    op.create_index('ix_orders_user_id', 'orders', ['user_id'])
    op.create_index('ix_orders_order_no', 'orders', ['order_no'], unique=True)


def downgrade() -> None:
    op.drop_table('orders')
    op.drop_table('ai_generation_logs')
    op.drop_table('favorites')
    op.drop_table('songs')
    op.drop_table('users')
