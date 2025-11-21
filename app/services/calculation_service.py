"""
Service per calcoli di punteggi, statistiche e aggregazioni.
Funziona sia con sessioni basate su template DB che su JSON.
"""
from sqlalchemy.orm import Session
from app import models
from app.services.template_data_service import get_session_data_source
from typing import Dict, List
from uuid import UUID
from collections import defaultdict


def calculate_session_stats(session_id: UUID, db: Session) -> Dict:
    """
    Calcola tutte le statistiche per una sessione assessment.
    
    Returns:
        {
            'total_questions': int,
            'answered_questions': int,
            'na_questions': int,
            'completion_percentage': float,
            'by_process': {...},
            'by_domain': {...},
            'overall_score': float,
            'overall_max_score': float
        }
    """
    session = db.query(models.AssessmentSession).filter_by(id=session_id).first()
    if not session:
        return {}
    
    # Ottieni risultati
    results = db.query(models.AssessmentResult).filter_by(session_id=session_id).all()
    
    # Ottieni struttura dati
    data_source = get_session_data_source(session, db)
    
    # Calcoli base
    total_questions = len(results)
    answered = sum(1 for r in results if r.score > 0 or not r.is_not_applicable)
    na_count = sum(1 for r in results if r.is_not_applicable)
    
    completion_pct = (answered / total_questions * 100) if total_questions > 0 else 0
    
    # Aggregazione per processo
    by_process = defaultdict(lambda: {'total_score': 0, 'max_score': 0, 'count': 0, 'na_count': 0})
    
    for r in results:
        if r.is_not_applicable:
            by_process[r.process]['na_count'] += 1
        else:
            by_process[r.process]['total_score'] += r.score
            by_process[r.process]['max_score'] += 5
            by_process[r.process]['count'] += 1
    
    # Calcola media per processo
    process_stats = {}
    for proc, stats in by_process.items():
        if stats['max_score'] > 0:
            avg_score = (stats['total_score'] / stats['max_score']) * 100
        else:
            avg_score = 0
        
        process_stats[proc] = {
            'average_score': round(avg_score, 2),
            'total_score': stats['total_score'],
            'max_score': stats['max_score'],
            'count': stats['count'],
            'na_count': stats['na_count']
        }
    
    # Aggregazione per dominio
    by_domain = defaultdict(lambda: {'total_score': 0, 'max_score': 0, 'count': 0, 'na_count': 0})
    
    for r in results:
        if r.is_not_applicable:
            by_domain[r.category]['na_count'] += 1
        else:
            by_domain[r.category]['total_score'] += r.score
            by_domain[r.category]['max_score'] += 5
            by_domain[r.category]['count'] += 1
    
    domain_stats = {}
    for domain, stats in by_domain.items():
        if stats['max_score'] > 0:
            avg_score = (stats['total_score'] / stats['max_score']) * 100
        else:
            avg_score = 0
        
        domain_stats[domain] = {
            'average_score': round(avg_score, 2),
            'total_score': stats['total_score'],
            'max_score': stats['max_score'],
            'count': stats['count'],
            'na_count': stats['na_count']
        }
    
    # Score generale
    total_score = sum(r.score for r in results if not r.is_not_applicable)
    total_max = sum(5 for r in results if not r.is_not_applicable)
    overall_score = (total_score / total_max * 100) if total_max > 0 else 0
    
    return {
        'source': data_source['source'],
        'total_questions': total_questions,
        'answered_questions': answered,
        'na_questions': na_count,
        'completion_percentage': round(completion_pct, 2),
        'by_process': process_stats,
        'by_domain': domain_stats,
        'overall_score': round(overall_score, 2),
        'overall_max_score': total_max,
        'processes': data_source['processes'],
        'domains': data_source['domains']
    }


def calculate_radar_data(session_id: UUID, db: Session) -> Dict:
    """
    Prepara dati per radar chart.
    
    Returns:
        {
            'processes_vs_domains': [...],
            'domains_vs_processes': [...]
        }
    """
    session = db.query(models.AssessmentSession).filter_by(id=session_id).first()
    if not session:
        return {}
    
    results = db.query(models.AssessmentResult).filter_by(session_id=session_id).all()
    data_source = get_session_data_source(session, db)
    
    # Matrice processo x dominio
    matrix = defaultdict(lambda: defaultdict(lambda: {'total': 0, 'max': 0, 'count': 0}))
    
    for r in results:
        if not r.is_not_applicable:
            matrix[r.process][r.category]['total'] += r.score
            matrix[r.process][r.category]['max'] += 5
            matrix[r.process][r.category]['count'] += 1
    
    # Calcola medie
    processes_vs_domains = []
    for process in data_source['processes']:
        process_data = {'process': process, 'domains': {}}
        for domain in data_source['domains']:
            stats = matrix[process][domain]
            if stats['max'] > 0:
                avg = (stats['total'] / stats['max']) * 100
            else:
                avg = 0
            process_data['domains'][domain] = round(avg, 2)
        processes_vs_domains.append(process_data)
    
    # Inverti per domini vs processi
    domains_vs_processes = []
    for domain in data_source['domains']:
        domain_data = {'domain': domain, 'processes': {}}
        for process in data_source['processes']:
            stats = matrix[process][domain]
            if stats['max'] > 0:
                avg = (stats['total'] / stats['max']) * 100
            else:
                avg = 0
            domain_data['processes'][process] = round(avg, 2)
        domains_vs_processes.append(domain_data)
    
    return {
        'processes_vs_domains': processes_vs_domains,
        'domains_vs_processes': domains_vs_processes
    }


def calculate_pareto_analysis(session_id: UUID, db: Session) -> Dict:
    """
    Analisi Pareto secondo formula Enterprise Assessment.
    
    FORMULA:
    1. gap_dominio = 5 - media_score_dominio
    2. gap_normalizzato = gap_dominio / numero_totale_processi
    3. gap_totale_processo = somma(gap_normalizzati di tutti i domini)
    4. percentuale_gap = (gap_processo / totale_gap_sistema) × 100
    5. Ordina per % decrescente e calcola cumulativa
    
    Returns:
        {
            'by_process': [...],
            'by_domain': [...],
            'total_gap_system': float
        }
    """
    session = db.query(models.AssessmentSession).filter_by(id=session_id).first()
    if not session:
        return {}
    
    results = db.query(models.AssessmentResult).filter_by(session_id=session_id).all()
    data_source = get_session_data_source(session, db)
    
    num_processes = len(data_source['processes'])
    num_domains = len(data_source['domains'])
    
    # === PARETO BY PROCESS ===
    
    # STEP 1-2: Calcola gap normalizzato per ogni dominio di ogni processo
    process_domain_gaps = defaultdict(lambda: defaultdict(lambda: {'total_score': 0, 'count': 0}))
    
    for r in results:
        if not r.is_not_applicable:
            process_domain_gaps[r.process][r.category]['total_score'] += r.score
            process_domain_gaps[r.process][r.category]['count'] += 1
    
    # Calcola gap totale per processo
    process_gaps = {}
    
    for process in data_source['processes']:
        gap_totale_processo = 0
        
        for domain in data_source['domains']:
            stats = process_domain_gaps[process][domain]
            
            if stats['count'] > 0:
                media_score_dominio = stats['total_score'] / stats['count']
                gap_dominio = 5.0 - media_score_dominio
                gap_normalizzato = gap_dominio / num_processes
                gap_totale_processo += gap_normalizzato
        
        process_gaps[process] = gap_totale_processo
    
    # STEP 3: Calcola percentuali
    totale_gap_sistema = sum(process_gaps.values())
    
    process_pareto = []
    for process, gap in process_gaps.items():
        percentuale = (gap / totale_gap_sistema * 100) if totale_gap_sistema > 0 else 0
        process_pareto.append({
            'process': process,
            'gap_totale': round(gap, 4),
            'percentuale_gap': round(percentuale, 2)
        })
    
    # STEP 4: Ordina e calcola cumulativa
    process_pareto.sort(key=lambda x: x['percentuale_gap'], reverse=True)
    
    cumulative = 0
    for item in process_pareto:
        cumulative += item['percentuale_gap']
        item['cumulative_percentage'] = round(cumulative, 2)
        item['is_critical'] = cumulative <= 80
    
    # === PARETO BY DOMAIN ===
    
    # Inverti l'aggregazione
    domain_process_gaps = defaultdict(lambda: defaultdict(lambda: {'total_score': 0, 'count': 0}))
    
    for r in results:
        if not r.is_not_applicable:
            domain_process_gaps[r.category][r.process]['total_score'] += r.score
            domain_process_gaps[r.category][r.process]['count'] += 1
    
    domain_gaps = {}
    
    for domain in data_source['domains']:
        gap_totale_dominio = 0
        
        for process in data_source['processes']:
            stats = domain_process_gaps[domain][process]
            
            if stats['count'] > 0:
                media_score_processo = stats['total_score'] / stats['count']
                gap_processo = 5.0 - media_score_processo
                gap_normalizzato = gap_processo / num_domains
                gap_totale_dominio += gap_normalizzato
        
        domain_gaps[domain] = gap_totale_dominio
    
    totale_gap_domini = sum(domain_gaps.values())
    
    domain_pareto = []
    for domain, gap in domain_gaps.items():
        percentuale = (gap / totale_gap_domini * 100) if totale_gap_domini > 0 else 0
        domain_pareto.append({
            'domain': domain,
            'gap_totale': round(gap, 4),
            'percentuale_gap': round(percentuale, 2)
        })
    
    domain_pareto.sort(key=lambda x: x['percentuale_gap'], reverse=True)
    
    cumulative_d = 0
    for item in domain_pareto:
        cumulative_d += item['percentuale_gap']
        item['cumulative_percentage'] = round(cumulative_d, 2)
        item['is_critical'] = cumulative_d <= 80
    
    return {
        'by_process': process_pareto,
        'by_domain': domain_pareto,
        'total_gap_system': round(totale_gap_sistema, 4),
        'critical_processes': [p['process'] for p in process_pareto if p['is_critical']],
        'critical_domains': [d['domain'] for d in domain_pareto if d['is_critical']]
    }
