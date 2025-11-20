from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.services import template_service


router = APIRouter(
    prefix="/admin/templates",
    tags=["Templates"],
)


# -----------------------------
# MODELLI DI INPUT (Pydantic)
# -----------------------------

from pydantic import BaseModel


class TemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    sector: Optional[str] = None
    is_active: bool = True


class TemplateVersionCreate(BaseModel):
    version_label: str
    status: str = "draft"
    model_name: Optional[str] = None
    base_version_id: Optional[str] = None  # se valorizzato, clona da versione esistente


class DomainCreate(BaseModel):
    domain_name: str
    description: Optional[str] = None
    order: Optional[int] = None
    weight: float = 1.0


class TemplateDomainUpdate(BaseModel):
    order: Optional[int] = None
    weight: Optional[float] = None


class QuestionCreate(BaseModel):
    text: str
    help_text: Optional[str] = None
    max_score: int = 5
    order: Optional[int] = None
    is_active: bool = True


# -----------------------------
# TEMPLATE BASE
# -----------------------------

@router.get("/", summary="Lista tutti i template")
def list_templates(db: Session = Depends(get_db)):
    return template_service.list_templates(db)


@router.post("/", summary="Crea un nuovo template")
def create_template(payload: TemplateCreate, db: Session = Depends(get_db)):
    tpl = template_service.create_template(
        db=db,
        name=payload.name,
        description=payload.description,
        sector=payload.sector,
        is_active=payload.is_active,
    )
    return tpl


@router.get("/{template_id}", summary="Dettaglio template")
def get_template(template_id: str, db: Session = Depends(get_db)):
    tpl = template_service.get_template(db, template_id)
    if not tpl:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template non trovato")
    return tpl


# -----------------------------
# VERSIONI DI TEMPLATE
# -----------------------------

@router.get("/{template_id}/versions", summary="Lista versioni di un template")
def list_template_versions(template_id: str, db: Session = Depends(get_db)):
    return template_service.list_template_versions(db, template_id)


@router.post("/{template_id}/versions", summary="Crea nuova versione (opz. clonando da base)")
def create_template_version(
    template_id: str,
    payload: TemplateVersionCreate,
    db: Session = Depends(get_db),
):
    try:
        version = template_service.create_template_version(
            db=db,
            template_id=template_id,
            version_label=payload.version_label,
            status=payload.status,
            model_name=payload.model_name,
            base_version_id=payload.base_version_id,
        )
        return version
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/versions/{version_id}", summary="Dettaglio versione (con domini/domande)")
def get_template_version(version_id: str, db: Session = Depends(get_db)):
    version = template_service.get_template_version_full(db, version_id)
    if not version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Versione non trovata")
    return version


# -----------------------------
# DOMINI SU VERSIONE
# -----------------------------

@router.post(
    "/versions/{version_id}/domains",
    summary="Aggiunge un dominio ad una versione",
)
def add_domain_to_version(
    version_id: str,
    payload: DomainCreate,
    db: Session = Depends(get_db),
):
    td = template_service.add_domain_to_version(
        db=db,
        template_version_id=version_id,
        domain_name=payload.domain_name,
        description=payload.description,
        order=payload.order,
        weight=payload.weight,
    )
    return td


@router.patch(
    "/template-domains/{template_domain_id}",
    summary="Aggiorna ordine/peso di un dominio su versione",
)
def update_template_domain(
    template_domain_id: str,
    payload: TemplateDomainUpdate,
    db: Session = Depends(get_db),
):
    td = template_service.update_template_domain(
        db=db,
        template_domain_id=template_domain_id,
        order=payload.order,
        weight=payload.weight,
    )
    if not td:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="TemplateDomain non trovato")
    return td


# -----------------------------
# DOMANDE
# -----------------------------

@router.post(
    "/template-domains/{template_domain_id}/questions",
    summary="Aggiunge una domanda ad un dominio di versione",
)
def add_question(
    template_domain_id: str,
    payload: QuestionCreate,
    db: Session = Depends(get_db),
):
    q = template_service.add_question_to_template_domain(
        db=db,
        template_domain_id=template_domain_id,
        text=payload.text,
        help_text=payload.help_text,
        max_score=payload.max_score,
        order=payload.order,
        is_active=payload.is_active,
    )
    return q


@router.patch(
    "/questions/{question_id}/deactivate",
    summary="Disattiva (soft delete) una domanda",
)
def deactivate_question(
    question_id: str,
    db: Session = Depends(get_db),
):
    q = template_service.deactivate_question(db=db, question_id=question_id)
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Domanda non trovata")
    return {"status": "ok", "id": question_id, "is_active": q.is_active}
