#!/usr/bin/env python3
import re

with open('models.py', 'r') as f:
    content = f.read()

# Fix AssessmentTemplate
content = re.sub(
    r'class AssessmentTemplate\(Base\):.*?(?=class |\Z)',
    '''class AssessmentTemplate(Base):
    __tablename__ = "assessment_templates"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    sector = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    versions = relationship("TemplateVersion", back_populates="template")

''',
    content,
    flags=re.DOTALL
)

# Fix TemplateVersion
content = re.sub(
    r'class TemplateVersion\(Base\):.*?(?=class |\Z)',
    '''class TemplateVersion(Base):
    __tablename__ = "template_versions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_id = Column(UUID(as_uuid=True), ForeignKey("assessment_templates.id"), nullable=False)
    version = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_deprecated = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    template = relationship("AssessmentTemplate", back_populates="versions")
    template_domains = relationship("TemplateDomain", back_populates="version", cascade="all, delete-orphan")

''',
    content,
    flags=re.DOTALL
)

# Fix Domain
content = re.sub(
    r'class Domain\(Base\):.*?(?=class |\Z)',
    '''class Domain(Base):
    __tablename__ = "domains"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    template_domains = relationship("TemplateDomain", back_populates="domain")

''',
    content,
    flags=re.DOTALL
)

# Fix TemplateDomain
content = re.sub(
    r'class TemplateDomain\(Base\):.*?(?=class |\Z)',
    '''class TemplateDomain(Base):
    __tablename__ = "template_domains"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    version_id = Column(UUID(as_uuid=True), ForeignKey("template_versions.id"), nullable=False)
    domain_id = Column(UUID(as_uuid=True), ForeignKey("domains.id"), nullable=False)
    order = Column(Integer, nullable=False)
    weight = Column(Integer, nullable=True)
    
    version = relationship("TemplateVersion", back_populates="template_domains")
    domain = relationship("Domain", back_populates="template_domains")
    questions = relationship("Question", back_populates="template_domain", cascade="all, delete-orphan")

''',
    content,
    flags=re.DOTALL
)

# Fix Question
content = re.sub(
    r'class Question\(Base\):.*?(?=class |\Z)',
    '''class Question(Base):
    __tablename__ = "questions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    version_id = Column(UUID(as_uuid=True), ForeignKey("template_versions.id"), nullable=False)
    domain_id = Column(UUID(as_uuid=True), ForeignKey("domains.id"), nullable=False)
    code = Column(String, nullable=False)
    text = Column(Text, nullable=False)
    help_text = Column(Text, nullable=True)
    process = Column(String, nullable=True)
    activity = Column(String, nullable=True)
    category = Column(String, nullable=True)
    dimension = Column(String, nullable=True)
    order = Column(Integer, nullable=False)
    max_score = Column(Integer, nullable=False)
    
    template_domain = relationship("TemplateDomain", back_populates="questions")

''',
    content,
    flags=re.DOTALL
)

# Aggiungi import UUID se non presente
if 'from sqlalchemy.dialects.postgresql import UUID' not in content:
    content = content.replace(
        'from sqlalchemy import',
        'from sqlalchemy.dialects.postgresql import UUID\nfrom sqlalchemy import'
    )

# Aggiungi import uuid se non presente
if 'import uuid' not in content:
    content = 'import uuid\n' + content

with open('models.py', 'w') as f:
    f.write(content)

print("✅ Modelli aggiornati!")
