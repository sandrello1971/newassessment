from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime, Boolean, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime
import uuid

Base = declarative_base()


class LocalUser(Base):
    __tablename__ = "local_users"

    id = Column(String, primary_key=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password = Column(String)
    role = Column(String, default="user")
    must_change_password = Column(Boolean, default=True)


class AssessmentSession(Base):
    __tablename__ = "assessment_session"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, nullable=True)
    company_id = Column(Integer, nullable=True)
    azienda_nome = Column(Text, nullable=False)
    settore = Column(Text, nullable=True)
    dimensione = Column(Text, nullable=True)
    referente = Column(Text, nullable=True)
    effettuato_da = Column(Text, nullable=True)  # Chi esegue l'assessment
    email = Column(Text, nullable=True)
    model_name = Column(Text, nullable=True, default="i40_assessment_fto")  # Nome del modello JSON usato
    template_version_id = Column(UUID(as_uuid=True), ForeignKey("template_versions.id"), nullable=True)  # Nuova: link a template versionato
    risposte_json = Column(Text, nullable=True)
    punteggi_json = Column(Text, nullable=True)
    raccomandazioni = Column(Text, nullable=True)
    pareto_recommendations = Column(Text, nullable=True)  # Raccomandazioni basate su Pareto
    creato_il = Column(DateTime, default=datetime.now, nullable=False)
    data_chiusura = Column(DateTime, nullable=True)  # Data di completamento assessment
    logo_path = Column(Text, nullable=True)  # Percorso file logo azienda

    results = relationship("AssessmentResult", backref="session")


class AssessmentResult(Base):
    __tablename__ = "assessment_result"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("assessment_session.id"), nullable=False)
    process = Column(String, nullable=False)
    activity = Column(String, nullable=False)
    category = Column(String, nullable=False)
    dimension = Column(String, nullable=False)
    score = Column(Integer, nullable=False, default=0)  # Default 0, accetta 0-5
    note = Column(Text, nullable=True)
    is_not_applicable = Column(Boolean, default=False, nullable=False)


# ===============================
#  MODELLI PER I TEMPLATE
# ===============================

class AssessmentTemplate(Base):
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

class TemplateVersion(Base):
    __tablename__ = "template_versions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_id = Column(UUID(as_uuid=True), ForeignKey("assessment_templates.id"), nullable=False)
    version = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_deprecated = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    template = relationship("AssessmentTemplate", back_populates="versions")
    template_domains = relationship("TemplateDomain", back_populates="version", cascade="all, delete-orphan")

class Domain(Base):
    __tablename__ = "domains"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    template_domains = relationship("TemplateDomain", back_populates="domain")

class TemplateDomain(Base):
    __tablename__ = "template_domains"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    version_id = Column(UUID(as_uuid=True), ForeignKey("template_versions.id"), nullable=False)
    domain_id = Column(UUID(as_uuid=True), ForeignKey("domains.id"), nullable=False)
    order = Column(Integer, nullable=False)
    weight = Column(Integer, nullable=True)
    
    version = relationship("TemplateVersion", back_populates="template_domains")
    domain = relationship("Domain", back_populates="template_domains")

class Question(Base):
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
    

