"""social and manual song fields

Revision ID: 0003_social_manual_song_fields
Revises: 0002_add_practice_records
Create Date: 2026-05-23
"""
from alembic import op
import sqlalchemy as sa

revision = '0003_social_manual_song_fields'
down_revision = '0002_add_practice_records'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('songs', sa.Column('artist_name', sa.String(length=100), nullable=True))
    op.add_column('songs', sa.Column('raw_text', sa.Text(), nullable=True))
    op.add_column('songs', sa.Column('tags_json', sa.JSON(), nullable=True))
    op.add_column('songs', sa.Column('edit_mode', sa.String(length=50), nullable=False, server_default='ai'))
    op.add_column('songs', sa.Column('visibility', sa.String(length=50), nullable=False, server_default='private'))
    op.add_column('songs', sa.Column('like_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('songs', sa.Column('share_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('songs', sa.Column('comment_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('songs', sa.Column('published_at', sa.DateTime(), nullable=True))
    op.create_index('ix_songs_artist_name', 'songs', ['artist_name'])

    op.create_table(
        'likes',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('song_id', sa.Integer(), sa.ForeignKey('songs.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint('user_id', 'song_id', name='uk_like_user_song'),
    )
    op.create_index('ix_likes_id', 'likes', ['id'])
    op.create_index('ix_likes_user_id', 'likes', ['user_id'])
    op.create_index('ix_likes_song_id', 'likes', ['song_id'])

    op.create_table(
        'follows',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('follower_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('following_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint('follower_id', 'following_id', name='uk_follow_pair'),
    )
    op.create_index('ix_follows_id', 'follows', ['id'])
    op.create_index('ix_follows_follower_id', 'follows', ['follower_id'])
    op.create_index('ix_follows_following_id', 'follows', ['following_id'])


def downgrade() -> None:
    op.drop_table('follows')
    op.drop_table('likes')
    op.drop_index('ix_songs_artist_name', table_name='songs')
    op.drop_column('songs', 'published_at')
    op.drop_column('songs', 'comment_count')
    op.drop_column('songs', 'share_count')
    op.drop_column('songs', 'like_count')
    op.drop_column('songs', 'visibility')
    op.drop_column('songs', 'edit_mode')
    op.drop_column('songs', 'tags_json')
    op.drop_column('songs', 'raw_text')
    op.drop_column('songs', 'artist_name')
