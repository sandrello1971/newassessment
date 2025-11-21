"""add template_version_id to assessment_session

Revision ID: add_template_version
Revises: 1f53b617cb54
Create Date: 2025-11-20 22:00:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_template_version'
down_revision = '1f53b617cb54'
branch_labels = None
depends_on = None


def upgrade():
    # Aggiungi colonna template_version_id (nullable per retrocompatibilità)
    op.add_column('assessment_session', 
        sa.Column('template_version_id', postgresql.UUID(as_uuid=True), nullable=True)
    )
    
    # Aggiungi foreign key constraint
    op.create_foreign_key(
        'fk_assessment_session_template_version',
        'assessment_session', 'template_versions',
        ['template_version_id'], ['id']
    )


def downgrade():
    # Rimuovi foreign key
    op.drop_constraint('fk_assessment_session_template_version', 'assessment_session', type_='foreignkey')
    
    # Rimuovi colonna
    op.drop_column('assessment_session', 'template_version_id')
