#!/usr/bin/env python3
import sys
import os
import json
import uuid
from sqlalchemy import create_engine, Column, String, Text, Boolean, DateTime, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

sys.path.insert(0, '/var/www/assessment_ai')

DATABASE_URL = None
env_file = "/var/www/assessment_ai/.env"

if os.path.exists(env_file):
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line.startswith("DATABASE_URL="):
                DATABASE_URL = line.split("=", 1)[1].strip().strip('"').strip("'")
                break

if not DATABASE_URL:
    print("DATABASE_URL non trovato")
    sys.exit(1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class AssessmentTemplate(Base):
    __tablename__ = "assessment_templates"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text)
    sector = Column(String)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class TemplateVersion(Base):
    __tablename__ = "template_versions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_id = Column(UUID(as_uuid=True), nullable=False)
    version = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_deprecated = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class Domain(Base):
    __tablename__ = "domains"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class TemplateDomain(Base):
    __tablename__ = "template_domains"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    version_id = Column(UUID(as_uuid=True), nullable=False)
    domain_id = Column(UUID(as_uuid=True), nullable=False)
    order = Column(Integer, nullable=False)
    weight = Column(Integer)

class Question(Base):
    __tablename__ = "questions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    version_id = Column(UUID(as_uuid=True), nullable=False)
    domain_id = Column(UUID(as_uuid=True), nullable=False)
    code = Column(String, nullable=False)
    text = Column(Text, nullable=False)
    help_text = Column(Text)
    process = Column(String)
    activity = Column(String)
    category = Column(String)
    dimension = Column(String)
    order = Column(Integer, nullable=False)
    max_score = Column(Integer, nullable=False)

def main():
    print("=" * 70)
    print("IMPORT BASE_MODEL")
    print("=" * 70)
    print()
    
    json_file = "/var/www/assessment_ai/base_model.json"
    
    if not os.path.exists(json_file):
        print(f"ERRORE: {json_file} non trovato!")
        sys.exit(1)
    
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"JSON caricato: {len(data)} processi")
    total_activities = sum(len(proc['activities']) for proc in data)
    print(f"   Processi: {len(data)}")
    print(f"   Attivita: {total_activities}\n")
    
    db = SessionLocal()
    
    try:
        # STEP 1: Template
        print("STEP 1/5: Template")
        print("-" * 70)
        template = db.query(AssessmentTemplate).filter_by(code="base_model").first()
        if template:
            print(f"   Template esistente: {template.name} (ID: {template.id})")
        else:
            template = AssessmentTemplate(
                id=uuid.uuid4(),
                code="base_model",
                name="Base Model I4.0",
                description="Template base Industria 4.0 - Politecnico Milano",
                sector="Industria 4.0",
                is_active=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(template)
            db.commit()
            db.refresh(template)
            print(f"   Template creato: {template.name} (ID: {template.id})")
        print()
        
        # STEP 2: Version
        print("STEP 2/5: Versione")
        print("-" * 70)
        version = db.query(TemplateVersion).filter_by(
            template_id=template.id,
            version=1
        ).first()
        if version:
            print(f"   Versione 1 esistente (ID: {version.id})")
        else:
            version = TemplateVersion(
                id=uuid.uuid4(),
                template_id=template.id,
                version=1,
                is_active=True,
                is_deprecated=False,
                created_at=datetime.utcnow()
            )
            db.add(version)
            db.commit()
            db.refresh(version)
            print(f"   Versione 1 creata (ID: {version.id})")
        print()
        
        # STEP 3: Domains
        print("STEP 3/5: Domini")
        print("-" * 70)
        domain_configs = [
            ("governance", "Governance"),
            ("monitoring_control", "Monitoring & Control"),
            ("technology", "Technology"),
            ("organization", "Organization")
        ]
        domain_map = {}
        
        for code, name in domain_configs:
            domain = db.query(Domain).filter_by(code=code).first()
            if domain:
                print(f"   {name}: esistente (ID: {domain.id})")
            else:
                domain = Domain(
                    id=uuid.uuid4(),
                    code=code,
                    name=name,
                    description=f"Dominio {name}",
                    created_at=datetime.utcnow()
                )
                db.add(domain)
                db.commit()
                db.refresh(domain)
                print(f"   {name}: creato (ID: {domain.id})")
            domain_map[name] = domain
        print()
        
        # STEP 4: Template-Domains
        print("STEP 4/5: Collegamenti")
        print("-" * 70)
        template_domain_map = {}
        
        for idx, (code, name) in enumerate(domain_configs, 1):
            domain = domain_map[name]
            td = db.query(TemplateDomain).filter_by(
                version_id=version.id,
                domain_id=domain.id
            ).first()
            
            if td:
                print(f"   {name}: gia collegato")
            else:
                td = TemplateDomain(
                    id=uuid.uuid4(),
                    version_id=version.id,
                    domain_id=domain.id,
                    order=idx,
                    weight=1
                )
                db.add(td)
                db.commit()
                db.refresh(td)
                print(f"   {name}: collegato")
            template_domain_map[name] = td
        print()
        
        # STEP 5: Questions
        print("STEP 5/5: Domande")
        print("-" * 70)
        
        question_counter = 0
        
        for proc in data:
            process_name = proc["process"]
            
            for activity in proc["activities"]:
                activity_name = activity["name"]
                
                for category_name, questions_dict in activity["categories"].items():
                    domain = domain_map.get(category_name)
                    if not domain:
                        continue
                    
                    for dimension_text, max_score_val in questions_dict.items():
                        question_counter += 1
                        
                        # Code univoco per la domanda
                        code = f"q_{question_counter:04d}"
                        
                        # Verifica se esiste
                        existing = db.query(Question).filter_by(
                            version_id=version.id,
                            code=code
                        ).first()
                        
                        if not existing:
                            question = Question(
                                id=uuid.uuid4(),
                                version_id=version.id,
                                domain_id=domain.id,
                                code=code,
                                text=dimension_text,
                                help_text=None,
                                process=process_name,
                                activity=activity_name,
                                category=category_name,
                                dimension=dimension_text,
                                order=question_counter,
                                max_score=5
                            )
                            db.add(question)
        
        db.commit()
        
        total_questions = db.query(Question).filter_by(version_id=version.id).count()
        
        print(f"   Domande create/verificate: {total_questions}")
        print()
        
        print("=" * 70)
        print("IMPORT COMPLETATO!")
        print("=" * 70)
        print()
        print(f"Template: {template.name}")
        print(f"Versione: {version.version}")
        print(f"Domini: {len(domain_map)}")
        print(f"Domande: {total_questions}")
        print()
        
    except Exception as e:
        print("\nERRORE:")
        print(str(e))
        db.rollback()
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()
