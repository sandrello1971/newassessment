from fastapi import FastAPI, APIRouter, Depends, HTTPException
from app.routers import templates
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List, Optional
from app.routers import pdf

from app.database import get_db
from app import schemas, models
from app.routers import radar, admin, auth_routes
from app.routers import assessment_update
from app.routers import excel_export

# ✅ Init FastAPI app
app = FastAPI()
app.include_router(templates.router)

# ✅ Middleware CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Router con prefisso /api
api_router = APIRouter(prefix="/api")


# Funzione per pre-popolare le risposte
def prepopulate_assessment_responses(session_id: UUID, model_name: str = None, template_version_id: str = None, db: Session = None):
    """
    Pre-crea tutte le risposte con score=0 quando viene creato un assessment.
    Supporta ENTRAMBI i sistemi:
    - Vecchio: usa model_name per caricare JSON
    - Nuovo: usa template_version_id per caricare da DB
    """
    import json
    from pathlib import Path
    
    responses_to_create = []
    
    # NUOVO SISTEMA: Template versionati dal DB
    if template_version_id:
        print(f"📊 Prepopolo da template_version: {template_version_id}")
        try:
            # Carica questions dal DB per questa versione
            questions = db.query(models.Question).filter(
                models.Question.version_id == template_version_id
            ).all()
            
            for q in questions:
                response = models.AssessmentResult(
                    session_id=session_id,
                    process=q.process or '',
                    activity=q.activity or '',
                    category=q.category or '',
                    dimension=q.text,
                    score=0,
                    note='',
                    is_not_applicable=False
                )
                responses_to_create.append(response)
            
            print(f"✅ Pre-popolate {len(responses_to_create)} risposte da template DB")
        except Exception as e:
            print(f"⚠️ Errore prepopolamento da template: {e}")
            return
    
    # VECCHIO SISTEMA: JSON file
    else:
        model_name = model_name or "i40_assessment_fto"
        print(f"📄 Prepopolo da JSON: {model_name}")
        
        model_path = Path(f"frontend/public/{model_name}.json")
        if not model_path.exists():
            print(f"⚠️ Modello {model_name} non trovato")
            return
        
        try:
            with open(model_path, 'r', encoding='utf-8') as f:
                model_data = json.load(f)
        except Exception as e:
            print(f"⚠️ Errore caricamento modello: {e}")
            return
        
        for process_data in model_data:
            process_name = process_data.get('process', '')
            for activity in process_data.get('activities', []):
                activity_name = activity.get('name', '')
                for category_name, dimensions in activity.get('categories', {}).items():
                    for dimension_name in dimensions.keys():
                        response = models.AssessmentResult(
                            session_id=session_id,
                            process=process_name,
                            activity=activity_name,
                            category=category_name,
                            dimension=dimension_name,
                            score=0,
                            note='',
                            is_not_applicable=False
                        )
                        responses_to_create.append(response)
        
        print(f"✅ Pre-popolate {len(responses_to_create)} risposte da JSON")
    
    # Salva tutte le risposte
    if responses_to_create:
        db.bulk_save_objects(responses_to_create)
        db.commit()

# 📥 Crea sessione di assessment
@api_router.post("/assessment/session", response_model=schemas.AssessmentSessionOut)
def create_session(data: schemas.AssessmentSessionCreate, db: Session = Depends(get_db)):
    obj = models.AssessmentSession(**data.dict())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    
    # Pre-popola risposte (supporta entrambi i sistemi)
    if data.template_version_id:
        # NUOVO: usa template versionato
        prepopulate_assessment_responses(obj.id, template_version_id=data.template_version_id, db=db)
    else:
        # VECCHIO: usa JSON
        model_name = data.model_name or "i40_assessment_fto"
        prepopulate_assessment_responses(obj.id, model_name=model_name, db=db)
    return obj

# 📋 Lista sessioni
@api_router.get("/assessment/sessions", response_model=List[schemas.AssessmentSessionOut])
def list_sessions(user_id: Optional[str] = None, company_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(models.AssessmentSession)
    if user_id:
        q = q.filter(models.AssessmentSession.user_id == user_id)
    if company_id:
        q = q.filter(models.AssessmentSession.company_id == company_id)
    return q.order_by(models.AssessmentSession.creato_il.desc()).all()

# 📋 Dettaglio singola sessione
@api_router.get("/assessment/session/{session_id}", response_model=schemas.AssessmentSessionOut)
def get_session(session_id: UUID, db: Session = Depends(get_db)):
    session = db.query(models.AssessmentSession).filter(models.AssessmentSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

# 📤 Invia risultati sessione - CON UPSERT
@api_router.post("/assessment/{session_id}/submit", response_model=dict)
def submit(session_id: UUID, results: List[schemas.AssessmentResultCreate], db: Session = Depends(get_db)):
    # Verifica che la sessione esista
    session = db.query(models.AssessmentSession).filter(models.AssessmentSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    updated = 0
    created = 0
    
    for r in results:
        # Cerca se esiste già un risultato per questa combinazione
        existing = db.query(models.AssessmentResult).filter(
            models.AssessmentResult.session_id == session_id,
            models.AssessmentResult.process == r.process,
            models.AssessmentResult.activity == r.activity,
            models.AssessmentResult.category == r.category,
            models.AssessmentResult.dimension == r.dimension
        ).first()
        
        if existing:
            # UPDATE
            existing.score = r.score
            existing.note = r.note
            existing.is_not_applicable = r.is_not_applicable
            updated += 1
        else:
            # INSERT
            db.add(models.AssessmentResult(session_id=session_id, **r.dict()))
            created += 1
    
    db.commit()
    return {"status": "submitted", "created": created, "updated": updated, "total": len(results)}

# 📊 Visualizza risultati sessione
@api_router.get("/assessment/{session_id}/results", response_model=List[schemas.AssessmentResultOut])
def results(session_id: UUID, db: Session = Depends(get_db)):
    """Restituisce i risultati ordinati secondo il template (DB o JSON)"""
    from app.services.template_data_service import get_session_data_source
    
    # Ottieni risultati dal DB
    results = db.query(models.AssessmentResult).filter(
        models.AssessmentResult.session_id == session_id
    ).all()
    
    session = db.query(models.AssessmentSession).filter(
        models.AssessmentSession.id == session_id
    ).first()
    
    if not session or not results:
        return results
    
    # Ottieni struttura dati (DB o JSON)
    data_source = get_session_data_source(session, db)
    
    # ORDINAMENTO RISULTATI
    if data_source['source'] == 'db':
        # NUOVO: Ordina usando questions dal DB
        questions = data_source['questions']
        
        # Crea mappa ordinamento da questions
        order_map = {}
        for idx, q in enumerate(questions):
            key = (q.process, q.activity, q.category, q.text)
            order_map[key] = idx
        
        def get_sort_key_db(result):
            key = (result.process, result.activity, result.category, result.dimension)
            return order_map.get(key, 9999)
        
        results.sort(key=get_sort_key_db)
        
    else:
        # VECCHIO: Ordina usando JSON
        import json
        from pathlib import Path
        
        model_name = session.model_name or 'i40_assessment_fto'
        model_path = Path(f"frontend/public/{model_name}.json")
        
        if model_path.exists():
            try:
                with open(model_path, 'r', encoding='utf-8') as f:
                    model_data = json.load(f)
                
                order_map_json = {}
                for proc in model_data:
                    proc_name = proc.get('process')
                    if proc_name not in order_map_json:
                        order_map_json[proc_name] = {}
                    
                    for activity in proc.get('activities', []):
                        act_name = activity.get('name')
                        for category in activity.get('categories', {}).keys():
                            if category not in order_map_json[proc_name]:
                                order_map_json[proc_name][category] = []
                            if act_name not in order_map_json[proc_name][category]:
                                order_map_json[proc_name][category].append(act_name)
                
                def get_sort_key(result):
                    proc = result.process
                    cat = result.category
                    act = result.activity
                    
                    try:
                        proc_order = list(order_map_json.keys()).index(proc)
                    except (ValueError, AttributeError):
                        proc_order = 999
                    
                    try:
                        cat_order = ['Governance', 'Monitoring & Control', 'Technology', 'Organization'].index(cat)
                    except ValueError:
                        cat_order = 999
                    
                    try:
                        act_order = order_map_json.get(proc, {}).get(cat, []).index(act)
                    except (ValueError, AttributeError):
                        act_order = 999
                    
                    return (proc_order, cat_order, act_order)
                
                results.sort(key=get_sort_key)
            except Exception as e:
                print(f"⚠️ Warning: Could not order results from JSON: {e}")
    
    # Calcola processRating per ogni processo
    process_scores = {}
    for result in results:
        if result.process not in process_scores:
            process_scores[result.process] = []
        if result.score is not None and not result.is_not_applicable:
            process_scores[result.process].append(result.score)
    
    process_ratings = {}
    for proc, scores in process_scores.items():
        if scores:
            avg = sum(scores) / len(scores)
            process_ratings[proc] = round(avg, 2)
        else:
            process_ratings[proc] = 0.0
    
    # Aggiungi processRating a ogni result
    for result in results:
        result.processRating = process_ratings.get(result.process, 0.0)
    
    return results
@api_router.delete("/assessment/{session_id}")
def delete_assessment(session_id: UUID, db: Session = Depends(get_db)):
    """Cancella completamente un assessment: sessione + tutti i risultati"""
    try:
        print(f"🗑️ DELETE: Inizio cancellazione assessment {session_id}")
        
        # Verifica che la sessione esista
        session = db.query(models.AssessmentSession).filter(
            models.AssessmentSession.id == session_id
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Assessment not found")
        
        # Conta i risultati da cancellare
        results_count = db.query(models.AssessmentResult).filter(
            models.AssessmentResult.session_id == session_id
        ).count()
        
        # Cancella prima tutti i risultati associati
        deleted_results = db.query(models.AssessmentResult).filter(
            models.AssessmentResult.session_id == session_id
        ).delete()
        
        # Poi cancella la sessione
        db.delete(session)
        db.commit()
        
        return {
            "status": "deleted",
            "session_id": str(session_id),
            "deleted_results": deleted_results,
            "message": f"Assessment '{session.azienda_nome}' cancellato con successo"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Errore cancellazione: {str(e)}")

# ✅ Registra i router
app.include_router(api_router)
app.include_router(radar.router, prefix="/api")
app.include_router(pdf.router, prefix="/api", tags=["pdf"])
app.include_router(auth_routes.router, prefix="/api/auth", tags=["auth"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(assessment_update.router, prefix="/api", tags=["assessment"])
app.include_router(excel_export.router, prefix="/api/excel", tags=["excel"])

@app.put("/api/assessment/{session_id}/save-ai-conclusions")
async def save_ai_conclusions(session_id: str, conclusions: dict, db: Session = Depends(get_db)):
    """Salva le conclusioni AI nel database"""
    try:
        session = db.query(models.AssessmentSession).filter(
            models.AssessmentSession.id == session_id
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Salva nel campo raccomandazioni
        session.raccomandazioni = conclusions.get('text', '')
        db.commit()
        
        return {"message": "Conclusioni salvate con successo"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# AI Interview Router
from app.routers import ai_interview
api_router.include_router(ai_interview.router, prefix="/api", tags=["ai-interview"])
