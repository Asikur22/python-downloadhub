"""Initial tables creation

Revision ID: 0001
Revises: None
Create Date: 2026-07-15 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # 1. Create downloads table
    op.create_table(
        'downloads',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('aria2_gid', sa.String(length=64), nullable=True),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('url', sa.Text(), nullable=False),
        sa.Column('destination', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('progress', sa.Integer(), nullable=False),
        sa.Column('downloaded_bytes', sa.Integer(), nullable=False),
        sa.Column('total_bytes', sa.Integer(), nullable=False),
        sa.Column('speed', sa.Integer(), nullable=False),
        sa.Column('eta', sa.Integer(), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_downloads_aria2_gid', 'downloads', ['aria2_gid'], unique=False)

    # 2. Create settings table
    op.create_table(
        'settings',
        sa.Column('key', sa.String(length=100), nullable=False),
        sa.Column('value', sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint('key')
    )

def downgrade() -> None:
    op.drop_index('ix_downloads_aria2_gid', table_name='downloads')
    op.drop_table('downloads')
    op.drop_table('settings')
