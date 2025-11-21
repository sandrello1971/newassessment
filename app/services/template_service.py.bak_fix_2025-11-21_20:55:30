import re
from typing import Optional

from sqlalchemy.orm import Session, joinedload

from app import models


# ===============================
#  TEMPLATE BASE
# ===============================

def list_templates(db: Session):
    return db.query(models.AssessmentTemplate).all()


def create_template(
    db: Session,
    name: str,
    description: Optional[str] = None,
    sector: Optional[str] = None,
    is_active: bool = True,
    code: Optional[str] = None,
):
    """Crea nuovo template con auto-generazione code"""
    
    # AUTO-GENERA CODE se manca
    if not code:
        # Genera code da name: "My Template" -> "my_template"
        code = re.sub(r'[^a-z0-9]+', '_', name.lower()).strip('_')
    
    tpl = models.AssessmentTemplate(
        code=code,
        name=name,
        description=description,
        sector=sector,
        is_active=is_active,
    )
    db.add(tpl)
    db.commit()
    db.refresh(tpl)
    return tpl

def get_template(db: Session, template_id: str):
    return (
        db.query(models.AssessmentTemplate)
        .filter(models.AssessmentTemplate.id == template_id)
        .first()
    )


# ===============================
#  VERSIONI DI TEMPLATE
# ===============================

def list_template_versions(db: Session, template_id: str):
    return (
        db.query(models.TemplateVersion)
        .filter(models.TemplateVersion.template_id == template_id)
        .order_by(models.TemplateVersion.id.asc())
        .all()
    )


def create_template_version(
    db: Session,
    template_id: str,
    version_label: str = None,
    status: str = "draft",
    model_name: Optional[str] = None,
    base_version_id: Optional[str] = None,
):
    # Calcola prossimo numero versione
    last_version = db.query(models.TemplateVersion).filter(
        models.TemplateVersion.template_id == template_id
    ).order_by(models.TemplateVersion.version.desc()).first()
    
    next_version = (last_version.version + 1) if last_version else 1
    
    # crea versione
    new_version = models.TemplateVersion(
        template_id=template_id,
        version=next_version,
        is_active=True,
        is_deprecated=False
    )
    db.add(new_version)
    db.commit()
    db.refresh(new_version)

    # se devo clonare da versione esistente
    if base_version_id:
        base_version = (
            db.query(models.TemplateVersion)
            .options(
                joinedload(models.TemplateVersion.template_domains)
                .joinedload(models.TemplateDomain.questions)
            )
            .filter(models.TemplateVersion.id == base_version_id)
            .first()
        )
        if not base_version:
            raise ValueError("Versione di base non trovata")

        for base_td in base_version.template_domains:
            # copia TemplateDomain
            new_td = models.TemplateDomain(
                template_version_id=new_version.id,
                domain_id=base_td.domain_id,
                order=base_td.order,
                weight=base_td.weight,
            )
            db.add(new_td)
            db.commit()
            db.refresh(new_td)

            # copia Questions
            for q in base_td.questions:
                new_q = models.Question(
                    template_domain_id=new_td.id,
                    text=q.text,
                    help_text=q.help_text,
                    max_score=q.max_score,
                    order=q.order,
                    is_active=q.is_active,
                )
                db.add(new_q)
        db.commit()

    return new_version


def get_template_version_full(db: Session, version_id: str):
    """
    Ritorna la versione con domini + domande già caricati.
    """
    from sqlalchemy.orm import joinedload
    
    # Carica version con template_domains e i loro domini
    version = (
        db.query(models.TemplateVersion)
        .options(
            joinedload(models.TemplateVersion.template_domains)
            .joinedload(models.TemplateDomain.domain)
        )
        .filter(models.TemplateVersion.id == version_id)
        .first()
    )
    
    if not version:
        return None
    
    # Carica tutte le questions per questa version
    questions = (
        db.query(models.Question)
        .filter(models.Question.version_id == version_id)
        .order_by(models.Question.order)
        .all()
    )
    
    # Raggruppa questions per domain_id
    questions_by_domain = {}
    for q in questions:
        if q.domain_id not in questions_by_domain:
            questions_by_domain[q.domain_id] = []
        questions_by_domain[q.domain_id].append({
            "id": str(q.id),
            "code": q.code,
            "text": q.text,
            "help_text": q.help_text,
            "process": q.process,
            "activity": q.activity,
            "category": q.category,
            "dimension": q.dimension,
            "order": q.order,
            "max_score": q.max_score
        })
    
    # Costruisci risposta
    result = {
        "id": str(version.id),
        "template_id": str(version.template_id),
        "version": version.version,
        "is_active": version.is_active,
        "is_deprecated": version.is_deprecated,
        "created_at": version.created_at.isoformat(),
        "domains": []
    }
    
    for td in version.template_domains:
        domain_data = {
            "template_domain_id": str(td.id),
            "domain_id": str(td.domain_id),
            "domain_code": td.domain.code,
            "domain_name": td.domain.name,
            "order": td.order,
            "weight": td.weight,
            "questions": questions_by_domain.get(td.domain_id, [])
        }
        result["domains"].append(domain_data)
    
    return result



def add_domain_to_version(
    db: Session,
    template_version_id: str,
    domain_name: str,
    description: Optional[str] = None,
    order: Optional[int] = None,
    weight: float = 1.0,
):
    # Domain globale (riusabile tra versioni)
    domain = (
        db.query(models.Domain)
        .filter(models.Domain.name == domain_name)
        .first()
    )
    if not domain:
        domain = models.Domain(
            name=domain_name,
            description=description,
        )
        db.add(domain)
        db.commit()
        db.refresh(domain)

    # Associazione Domain <-> TemplateVersion
    td = models.TemplateDomain(
        template_version_id=template_version_id,
        domain_id=domain.id,
        order=order,
        weight=weight,
    )
    db.add(td)
    db.commit()
    db.refresh(td)
    return td


def update_template_domain(
    db: Session,
    template_domain_id: str,
    order: Optional[int] = None,
    weight: Optional[float] = None,
):
    td = (
        db.query(models.TemplateDomain)
        .filter(models.TemplateDomain.id == template_domain_id)
        .first()
    )
    if not td:
        return None

    if order is not None:
        td.order = order
    if weight is not None:
        td.weight = weight

    db.commit()
    db.refresh(td)
    return td


# ===============================
#  DOMANDE
# ===============================

def add_question_to_template_domain(
    db: Session,
    template_domain_id: str,
    text: str,
    help_text: Optional[str] = None,
    max_score: int = 5,
    order: Optional[int] = None,
    is_active: bool = True,
):
    q = models.Question(
        template_domain_id=template_domain_id,
        text=text,
        help_text=help_text,
        max_score=max_score,
        order=order,
        is_active=is_active,
    )
    db.add(q)
    db.commit()
    db.refresh(q)
    return q


def deactivate_question(db: Session, question_id: str):
    q = (
        db.query(models.Question)
        .filter(models.Question.id == question_id)
        .first()
    )
    if not q:
        return None

    q.is_active = False
    db.commit()
    db.refresh(q)
    return q
