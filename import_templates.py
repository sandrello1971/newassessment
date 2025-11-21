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

def import_template(json_file, code, name, description, sector):
    print("=" * 70)
    print(f"IMPORT: {name}")
    print("=" * 70)
    
    if not os.path.exists(json_file):
        print(f"ERRORE: {json_file} non trovato!")
        return False
    
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"JSON caricato: {len(data)} processi\n")
    
    db = SessionLocal()
    
    try:
        # STEP 1: Template
        print("STEP 1/5: Template")
        template = db.query(AssessmentTemplate).filter_by(code=code).first()
        if template:
            print(f"   Esiste già, salto...\n")
            db.close()
            return True
        
        template = AssessmentTemplate(
            code=code,
            name=name,
            description=description,
            sector=sector
        )
        db.add(template)
        db.commit()
        db.refresh(template)
        print(f"   Creato (ID: {template.id})\n")
        
        # STEP 2: Version
        print("STEP 2/5: Versione")
        version = TemplateVersion(
            template_id=template.id,
            version=1,
            is_active=True,
            is_deprecated=False
        )
        db.add(version)
        db.commit()
        db.refresh(version)
        print(f"   Versione 1 creata (ID: {version.id})\n")
        
        # STEP 3: Domini (assicurati che esistano)
        print("STEP 3/5: Domini")
        domain_configs = [
            ("governance", "Governance"),
            ("monitoring_control", "Monitoring & Control"),
            ("technology", "Technology"),
            ("organization", "Organization")
        ]
        domain_map = {}
        
        for dom_code, dom_name in domain_configs:
            domain = db.query(Domain).filter_by(code=dom_code).first()
            if not domain:
                domain = Domain(
                    code=dom_code,
                    name=dom_name,
                    description=f"Dominio {dom_name}"
                )
                db.add(domain)
                db.commit()
                db.refresh(domain)
            domain_map[dom_name] = domain
        print("   Domini verificati\n")
        
        # STEP 4: Template-Domains
        print("STEP 4/5: Collegamenti")
        for idx, (dom_code, dom_name) in enumerate(domain_configs, 1):
            domain = domain_map[dom_name]
            td = TemplateDomain(
                version_id=version.id,
                domain_id=domain.id,
                order=idx,
                weight=1
            )
            db.add(td)
        db.commit()
        print("   Domini collegati\n")
        
        # STEP 5: Questions
        print("STEP 5/5: Domande")
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
                        code_q = f"{code}_q_{question_counter:04d}"
                        
                        question = Question(
                            version_id=version.id,
                            domain_id=domain.id,
                            code=code_q,
                            text=dimension_text,
                            process=process_name,
                            activity=activity_name,
                            category=category_name,
                            dimension=dimension_text,
                            order=question_counter,
                            max_score=5
                        )
                        db.add(question)
        
        db.commit()
        print(f"   {question_counter} domande create\n")
        
        print("✅ IMPORT COMPLETATO!\n")
        return True
        
    except Exception as e:
        print(f"\n❌ ERRORE: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

def main():
    templates = [
        {
            'file': 'frontend/public/Casoinfinal.json',
            'code': 'casoin_final',
            'name': 'CasoIn Final',
            'sector': 'Servizi',
            'description': 'Template per aziende di servizi - CasoIn versione finale'
        },
        {
            'file': 'frontend/public/impiantisti_light.json',
            'code': 'impiantisti_light',
            'name': 'Impiantisti Light',
            'sector': 'Impiantistica',
            'description': 'Template semplificato per aziende impiantistiche'
        },
        {
            'file': 'frontend/public/agenzie_viaggio.json',
            'code': 'agenzie_viaggio',
            'name': 'Agenzie Viaggio',
            'sector': 'Turismo',
            'description': 'Template specifico per agenzie di viaggio'
        }
    ]
    
    for tmpl in templates:
        success = import_template(
            tmpl['file'],
            tmpl['code'],
            tmpl['name'],
            tmpl['description'],
            tmpl['sector']
        )
        if not success:
            print(f"ERRORE nell'import di {tmpl['name']}")
            sys.exit(1)
    
    print("\n" + "=" * 70)
    print("TUTTI I TEMPLATE IMPORTATI CON SUCCESSO!")
    print("=" * 70)

if __name__ == "__main__":
    main()
