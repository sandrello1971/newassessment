from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import AssessmentSession, AssessmentResult, LocalUser
from app.services.pdf_generator import PDFReportGenerator
import io
from typing import Dict, List

router = APIRouter()

@router.get("/assessment/{session_id}/pdf")
async def generate_pdf_report(session_id: str, db: Session = Depends(get_db)):
    """
    Genera e restituisce il report PDF per una sessione di assessment
    
    Args:
        session_id: ID della sessione di assessment
        db: Sessione database
        
    Returns:
        StreamingResponse: File PDF per il download
        
    Raises:
        HTTPException: 404 se sessione o risultati non trovati
    """
    
    # Recupera dati sessione
    session = db.query(AssessmentSession).filter(AssessmentSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessione di assessment non trovata")
    
    # Recupera risultati
    results = db.query(AssessmentResult).filter(
        AssessmentResult.session_id == session_id
    ).all()
    
    if not results:
        raise HTTPException(status_code=404, detail="Nessun risultato trovato per questa sessione")
    
    # Prepara dati sessione per PDF
    # Recupera nome utente che ha creato l'assessment
    user_name = "N/A"
    if session.user_id:
        user = db.query(LocalUser).filter(LocalUser.id == session.user_id).first()
        if user:
            user_name = user.email
    
    session_data = {
        "azienda_nome": session.azienda_nome or "Azienda Non Specificata",
        "settore": session.settore,
        "dimensione": session.dimensione,
        "referente": session.referente,
        "email": session.email,
        "effettuato_da": session.effettuato_da,
        "creato_il": session.creato_il,
        "logo_path": session.logo_path,
        "model_name": session.model_name or "i40_assessment_fto",
        "template_name": None,
        "data_chiusura": session.data_chiusura,
        "user_name": user_name,
        "pareto_recommendations": session.pareto_recommendations
    }
    
    # Prepara dati risultati per PDF  
    results_data = []
    for result in results:
        results_data.append({
            "process": result.process,
            "category": result.category,
            "activity": result.activity,
            "dimension": result.dimension,
            "score": result.score,
            "note": result.note,
            "is_not_applicable": result.is_not_applicable
        })
    
    # Calcola statistiche dettagliate
    stats_data = await calculate_pdf_stats(session_id, db)
    stats_data["session_id"] = session_id
    
    # Se usa template_version_id, recupera il nome del template
    if session.template_version_id:
        from app.models import TemplateVersion, AssessmentTemplate
        template_version = db.query(TemplateVersion).filter(
            TemplateVersion.id == session.template_version_id
        ).first()
        if template_version:
            template = db.query(AssessmentTemplate).filter(
                AssessmentTemplate.id == template_version.template_id
            ).first()
            if template:
                session_data["template_name"] = f"{template.name} (v{template_version.version})"

    
    # Calcola dati radar per processi (per grafico globale con 4 dimensioni)
    processes_radar = await calculate_processes_radar(session_id, db)
    stats_data["processes_radar"] = processes_radar
    
    
    # Recupera conclusioni AI dalla sessione già caricata
    ai_conclusions = session.raccomandazioni if session.raccomandazioni else None
    try:
        # Genera PDF
        pdf_generator = PDFReportGenerator()
        pdf_bytes = pdf_generator.generate_assessment_report(session_data, results_data, stats_data, ai_conclusions)
        
        # Prepara nome file pulito
        clean_company_name = session.azienda_nome.replace(' ', '_').replace('/', '_') if session.azienda_nome else 'Assessment'
        # Rimuovi caratteri speciali
        import re
        clean_company_name = re.sub(r'[^\w\-_]', '', clean_company_name)
        
        filename = f"Assessment_Report_{clean_company_name}_{session_id[:8]}.pdf"
        
        # Restituisci PDF come streaming response
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except Exception as e:
        import traceback
        with open("/tmp/pdf_error.log", "w") as f:
            f.write(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Errore nella generazione del PDF: {str(e)}")


async def calculate_pdf_stats(session_id: str, db: Session) -> Dict:
    """
    Calcola statistiche dettagliate per il PDF
    Riusa e ottimizza la logica esistente da radar.py
    
    Args:
        session_id: ID della sessione
        db: Sessione database
        
    Returns:
        Dict: Statistiche complete per il PDF
    """
    
    # Query base per i risultati della sessione
    base_query = db.query(AssessmentResult).filter(
        AssessmentResult.session_id == session_id
    )
    
    # Statistiche generali
    total_questions = base_query.count()
    applicable_results = base_query.filter(AssessmentResult.is_not_applicable == False)
    applicable_questions = applicable_results.count()
    not_applicable_questions = total_questions - applicable_questions
    
    # Calcola media generale (solo domande applicabili)
    if applicable_questions > 0:
        overall_average = applicable_results.with_entities(
            func.avg(AssessmentResult.score)
        ).scalar() or 0.0
    else:
        overall_average = 0.0
    
    # Statistiche per processo
    processes_stats = {}
    
    # Raggruppa per processo
    process_groups = applicable_results.all()
    processes_dict = {}
    
    for result in process_groups:
        if result.process not in processes_dict:
            processes_dict[result.process] = []
        processes_dict[result.process].append(result)
    
    # Calcola statistiche per ogni processo
    for process_name, process_results in processes_dict.items():
        if process_results:
            scores = [r.score for r in process_results]
            
            processes_stats[process_name] = {
                "applicable_count": len(process_results),
                "average_score": sum(scores) / len(scores) if scores else 0.0,
                "min_score": min(scores) if scores else 0,
                "max_score": max(scores) if scores else 0,
                "total_score": sum(scores),
                "score_distribution": {
                    "0": scores.count(0),
                    "1": scores.count(1), 
                    "2": scores.count(2),
                    "3": scores.count(3),
                    "4": scores.count(4),
                    "5": scores.count(5)
                }
            }
    
    # Statistiche per categoria (cross-process)
    categories_stats = {}
    category_groups = {}
    
    for result in process_groups:
        key = f"{result.process}::{result.category}"
        if key not in category_groups:
            category_groups[key] = []
        category_groups[key].append(result)
    
    for category_key, category_results in category_groups.items():
        if category_results:
            scores = [r.score for r in category_results]
            categories_stats[category_key] = {
                "count": len(category_results),
                "average": sum(scores) / len(scores) if scores else 0.0,
                "min": min(scores) if scores else 0,
                "max": max(scores) if scores else 0
            }
    
    # Compila risultato finale
    stats_result = {
        "total_questions": total_questions,
        "applicable_questions": applicable_questions, 
        "not_applicable_questions": not_applicable_questions,
        "overall_average": round(overall_average, 2),
        "by_process": processes_stats,
        "by_category": categories_stats,
        "completion_rate": (applicable_questions / max(total_questions, 1)) * 100,
        "session_metadata": {
            "total_processes": len(processes_stats),
            "processes_with_data": len([p for p in processes_stats.values() if p["applicable_count"] > 0])
        }
    }
    
    return stats_result


@router.get("/assessment/{session_id}/pdf-preview")
async def get_pdf_stats_preview(session_id: str, db: Session = Depends(get_db)):
    """
    Endpoint per preview delle statistiche che saranno incluse nel PDF
    Utile per debugging e verifica dati prima della generazione
    
    Args:
        session_id: ID della sessione
        db: Sessione database
        
    Returns:
        Dict: Statistiche che saranno utilizzate nel PDF
    """
    
    # Verifica che la sessione esista
    session = db.query(AssessmentSession).filter(AssessmentSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sessione non trovata")
    
    # Verifica che ci siano risultati
    results_count = db.query(AssessmentResult).filter(
        AssessmentResult.session_id == session_id
    ).count()
    
    if results_count == 0:
        raise HTTPException(status_code=404, detail="Nessun risultato trovato")
    
    # Calcola e restituisci statistiche
    stats_data = await calculate_pdf_stats(session_id, db)
    stats_data["session_id"] = session_id
    
    # Aggiungi metadati sessione
    stats_data["session_info"] = {
        "azienda_nome": session.azienda_nome,
        "settore": session.settore,
        "dimensione": session.dimensione,
        "referente": session.referente,
        "email": session.email,
        "creato_il": session.creato_il.isoformat() if session.creato_il else None
    }
    
    return {
        "message": "Preview statistiche PDF",
        "session_id": session_id,
        "ready_for_pdf": True,
        "stats": stats_data
    }


async def calculate_processes_radar(session_id: str, db: Session) -> List[Dict]:
    """
    Calcola i dati radar per ogni processo con le 4 dimensioni
    (Governance, Monitoring & Control, Technology, Organization)
    Usa la logica "media delle medie delle righe" come nel frontend
    """
    
    # Query per ottenere TUTTI i risultati grezzi
    results = (
        db.query(
            AssessmentResult.process,
            AssessmentResult.category,
            AssessmentResult.activity,
            AssessmentResult.dimension,
            AssessmentResult.score,
            AssessmentResult.is_not_applicable
        )
        .filter(AssessmentResult.session_id == session_id)
        .all()
    )
    
    if not results:
        return []
    
    # Organizza: category -> process -> activity -> {dimension: score}
    organized = {}
    for process, category, activity, dimension, score, is_na in results:
        if category not in organized:
            organized[category] = {}
        if process not in organized[category]:
            organized[category][process] = {}
        if activity not in organized[category][process]:
            organized[category][process][activity] = {}
        organized[category][process][activity][dimension] = {
            "score": score,
            "is_not_applicable": is_na
        }
    
    # Helper: calcola media riga (attività)
    def calculate_row_average(dimensions_dict):
        total = 0
        count = 0
        for dim_data in dimensions_dict.values():
            if not dim_data.get("is_not_applicable") and dim_data.get("score") is not None:
                total += dim_data["score"]
                count += 1
        return total / count if count > 0 else None
    
    # Calcola per ogni processo la media per categoria (dominio)
    # Logica: per ogni processo in ogni categoria, media delle medie delle attività
    all_processes = set()
    for cat_data in organized.values():
        all_processes.update(cat_data.keys())
    
    processes_data = {}
    for proc in all_processes:
        processes_data[proc] = {
            "process": proc,
            "dimensions": {
                "governance": 0.0,
                "monitoring_control": 0.0,
                "technology": 0.0,
                "organization": 0.0
            },
            "overall_score": 0.0
        }
    
    # Per ogni categoria (dominio), calcola la media per ogni processo
    category_mapping = {
        "Governance": "governance",
        "Monitoring & Control": "monitoring_control",
        "Technology": "technology",
        "Organization": "organization"
    }
    
    for category, dim_key in category_mapping.items():
        if category not in organized:
            continue
        for proc in all_processes:
            if proc not in organized[category]:
                continue
            activities = organized[category][proc]
            # Media delle medie delle righe (attività)
            avgs = []
            for activity_dims in activities.values():
                avg = calculate_row_average(activity_dims)
                if avg is not None:
                    avgs.append(avg)
            if avgs:
                processes_data[proc]["dimensions"][dim_key] = round(sum(avgs) / len(avgs), 2)
    
    # Calcola punteggio complessivo per ogni processo
    for proc in processes_data:
        dimensions = processes_data[proc]["dimensions"]
        valid_scores = [v for v in dimensions.values() if v > 0]
        if valid_scores:
            processes_data[proc]["overall_score"] = round(sum(valid_scores) / len(valid_scores), 2)
    
    # Converti in lista e ordina per punteggio
    processes_list = sorted(
        list(processes_data.values()),
        key=lambda x: x["overall_score"],
        reverse=True
    )
    
    return processes_list
