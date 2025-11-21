"""
Service per leggere dati da template versionati nel DB.
Sostituisce la lettura da JSON per le nuove sessioni.
"""
from sqlalchemy.orm import Session
from app import models
from typing import List, Dict, Set
from uuid import UUID


def get_session_data_source(session: models.AssessmentSession, db: Session) -> dict:
    """
    Determina la fonte dati per una sessione e ritorna info strutturate.
    
    Returns:
        {
            'source': 'db' | 'json',
            'template_version_id': UUID | None,
            'model_name': str | None,
            'processes': List[str],
            'domains': List[str],
            'questions': List[Question] (solo se source='db')
        }
    """
    if session.template_version_id:
        # NUOVO SISTEMA: Leggi dal DB
        questions = db.query(models.Question).filter(
            models.Question.version_id == session.template_version_id
        ).all()
        
        processes = sorted(list(set([q.process for q in questions if q.process])))
        domains = sorted(list(set([q.category for q in questions if q.category])))
        
        return {
            'source': 'db',
            'template_version_id': session.template_version_id,
            'model_name': None,
            'processes': processes,
            'domains': domains,
            'questions': questions
        }
    else:
        # VECCHIO SISTEMA: Usa JSON
        import json
        from pathlib import Path
        
        model_name = session.model_name or 'i40_assessment_fto'
        model_path = Path(f"frontend/public/{model_name}.json")
        
        if not model_path.exists():
            return {
                'source': 'json',
                'template_version_id': None,
                'model_name': model_name,
                'processes': [],
                'domains': [],
                'questions': []
            }
        
        with open(model_path, 'r', encoding='utf-8') as f:
            model_data = json.load(f)
        
        processes = [p['process'] for p in model_data]
        # Domini standard del modello Polimi
        domains = ['Governance', 'Monitoring & Control', 'Technology', 'Organization']
        
        return {
            'source': 'json',
            'template_version_id': None,
            'model_name': model_name,
            'processes': processes,
            'domains': domains,
            'questions': []  # JSON usa struttura diversa
        }


def get_all_dimensions_for_session(session: models.AssessmentSession, db: Session) -> List[Dict]:
    """
    Ritorna tutte le dimensioni (domande) per una sessione.
    Funziona sia con DB che con JSON.
    
    Returns:
        List[{
            'process': str,
            'activity': str,
            'category': str,
            'dimension': str
        }]
    """
    data_source = get_session_data_source(session, db)
    
    if data_source['source'] == 'db':
        # Leggi da questions
        dimensions = []
        for q in data_source['questions']:
            dimensions.append({
                'process': q.process or '',
                'activity': q.activity or '',
                'category': q.category or '',
                'dimension': q.text
            })
        return dimensions
    else:
        # Leggi da JSON (vecchio sistema)
        import json
        from pathlib import Path
        
        model_name = data_source['model_name']
        model_path = Path(f"frontend/public/{model_name}.json")
        
        if not model_path.exists():
            return []
        
        with open(model_path, 'r', encoding='utf-8') as f:
            model_data = json.load(f)
        
        dimensions = []
        for process_data in model_data:
            process_name = process_data.get('process', '')
            for activity in process_data.get('activities', []):
                activity_name = activity.get('name', '')
                for category_name, dims in activity.get('categories', {}).items():
                    for dimension_name in dims.keys():
                        dimensions.append({
                            'process': process_name,
                            'activity': activity_name,
                            'category': category_name,
                            'dimension': dimension_name
                        })
        return dimensions
