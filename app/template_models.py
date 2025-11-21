from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    Text,
    DateTime,
    Boolean,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database import Base


class AssessmentTemplate(Base):
    __tablename__ = "assessment_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String, nullable=False, unique=True)  # es. "I40_FTO"
    name = Column(String, nullable=False)              # es. "Industria 4.0 FTO"
    description = Column(Text, nullable=True)
    sector = Column(String, nullable=True)             # es. "MANIFATTURA", "TURISMO"
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    versions = relationship("TemplateVersion", back_populates="template")


class TemplateVersion(Base):
    __tablename__ = "template_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_id = Column(UUID(as_uuid=True), ForeignKey("assessment_templates.id"), nullable=False)

    version = Column(Integer, nullable=False)          # 1,2,3...
    is_active = Column(Boolean, default=True, nullable=False)
    is_deprecated = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    template = relationship("AssessmentTemplate", back_populates="versions")
    domains = relationship("TemplateDomain", back_populates="version")
    questions = relationship("Question", back_populates="version")

    __table_args__ = (
        UniqueConstraint("template_id", "version", name="uq_template_version"),
    )


class Domain(Base):
    __tablename__ = "domains"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String, nullable=False, unique=True)   # es. "STRATEGY", "TECH"
    name = Column(String, nullable=False)                # es. "Strategia"
    description = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    template_domains = relationship("TemplateDomain", back_populates="domain")


class TemplateDomain(Base):
    __tablename__ = "template_domains"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    version_id = Column(UUID(as_uuid=True), ForeignKey("template_versions.id"), nullable=False)
    domain_id = Column(UUID(as_uuid=True), ForeignKey("domains.id"), nullable=False)

    order = Column(Integer, nullable=False, default=0)
    weight = Column(Integer, nullable=True)  # opzionale per scoring

    version = relationship("TemplateVersion", back_populates="domains")
    domain = relationship("Domain", back_populates="template_domains")

    __table_args__ = (
        UniqueConstraint("version_id", "domain_id", name="uq_version_domain"),
    )


class Question(Base):
    __tablename__ = "questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    version_id = Column(UUID(as_uuid=True), ForeignKey("template_versions.id"), nullable=False)
    domain_id = Column(UUID(as_uuid=True), ForeignKey("domains.id"), nullable=False)

    code = Column(String, nullable=False)        # es. "Q1_01"
    text = Column(Text, nullable=False)
    help_text = Column(Text, nullable=True)

    process = Column(String, nullable=True)
    activity = Column(String, nullable=True)
    category = Column(String, nullable=True)
    dimension = Column(String, nullable=True)

    order = Column(Integer, nullable=False, default=0)
    max_score = Column(Integer, nullable=False, default=5)

    version = relationship("TemplateVersion", back_populates="questions")
    domain = relationship("Domain")
    answers = relationship("Answer", back_populates="question")

    __table_args__ = (
        UniqueConstraint("version_id", "code", name="uq_question_version_code"),
    )


class Assessment(Base):
    """
    Nuova entità 'pulita' per i nuovi assessment, distinta da AssessmentSession legacy.
    """
    __tablename__ = "assessments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("assessment_session.id"), nullable=True)

    template_id = Column(UUID(as_uuid=True), ForeignKey("assessment_templates.id"), nullable=False)
    version_id = Column(UUID(as_uuid=True), ForeignKey("template_versions.id"), nullable=False)

    azienda_nome = Column(Text, nullable=False)
    settore = Column(Text, nullable=True)
    dimensione = Column(Text, nullable=True)
    referente = Column(Text, nullable=True)
    email = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    closed_at = Column(DateTime, nullable=True)

    template = relationship("AssessmentTemplate")
    version = relationship("TemplateVersion")
    answers = relationship("Answer", back_populates="assessment")
    legacy_session = relationship("AssessmentSession", backref="new_assessment", uselist=False)


class Answer(Base):
    __tablename__ = "answers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assessment_id = Column(UUID(as_uuid=True), ForeignKey("assessments.id"), nullable=False)
    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.id"), nullable=False)

    score = Column(Integer, nullable=True)
    note = Column(Text, nullable=True)
    is_not_applicable = Column(Boolean, default=False, nullable=False)

    assessment = relationship("Assessment", back_populates="answers")
    question = relationship("Question", back_populates="answers")

    __table_args__ = (
        UniqueConstraint("assessment_id", "question_id", name="uq_assessment_question"),
    )
