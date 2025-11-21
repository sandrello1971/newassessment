# app/routers/radar.py - VERSIONE COMPLETA CON GESTIONE NON APPLICABILI
from app.ai_recommendations import get_ai_recommendations_advanced, get_sector_insights
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from uuid import UUID
from app import database, models
from dotenv import load_dotenv
from urllib.parse import unquote
from datetime import datetime
from typing import List, Dict, Optional, Union
import matplotlib.pyplot as plt
import matplotlib
import io
import numpy as np
import openai
import os
import math
import traceback

# Configura matplotlib per headless server
matplotlib.use('Agg')

load_dotenv()

openai.api_key = os.getenv("OPENAI_API_KEY")
model = os.getenv("OPENAI_MODEL", "gpt-4")

router = APIRouter()

# ============================================================================
# ENDPOINT PRINCIPALI AGGIORNATI
# ============================================================================

@router.get("/assessment/{session_id}/processes-radar")
def processes_radar_data(session_id: UUID, db: Session = Depends(database.get_db)):
    """Restituisce i dati radar separati per ogni processo - ESCLUDE NON APPLICABILI"""
    try:
        print(f"🎯 DEBUG: processes_radar_data per sessione {session_id}")
        
        # ✅ QUERY AGGIORNATA - ESCLUDE is_not_applicable = True
        results = (
            db.query(
                models.AssessmentResult.process,
                models.AssessmentResult.category,
                func.avg(models.AssessmentResult.score).label("avg_score")
            )
            .filter(models.AssessmentResult.session_id == session_id)
            .filter(models.AssessmentResult.is_not_applicable.is_(False))  # ✅ FILTRO CHIAVE
            .group_by(models.AssessmentResult.process, models.AssessmentResult.category)
            .all()
        )

        print(f"🔍 DEBUG: Trovati {len(results) if results else 0} risultati applicabili")

        if not results:
            print(f"❌ DEBUG: Nessun risultato applicabile per sessione {session_id}")
            raise HTTPException(status_code=404, detail="No applicable results found for this session")

        # Organizza i dati per processo
        processes_data = {}
        
        for process, category, avg_score in results:
            if process not in processes_data:
                processes_data[process] = {
                    "process": process,
                    "dimensions": {},
                    "overall_score": 0
                }
            
            # Mappa le categorie alle 4 dimensioni del Politecnico di Milano
            dimension_mapping = {
                "Governance": "governance",
                "Process": "governance", 
                "Monitoring": "monitoring_control",
                "Monitoring & Control": "monitoring_control",
                "Control": "monitoring_control",
                "Technology": "technology",
                "Tech": "technology",
                "ICT": "technology",
                "Organization": "organization",
                "Org": "organization",
                "People": "organization"
            }
            
            # Trova la dimensione corrispondente
            dimension_key = None
            for key, value in dimension_mapping.items():
                if key.lower() in category.lower():
                    dimension_key = value
                    break
            
            if dimension_key:
                processes_data[process]["dimensions"][dimension_key] = round(float(avg_score), 2)

        # Calcola il punteggio complessivo per ogni processo
        for process_key in processes_data:
            dimensions = processes_data[process_key]["dimensions"]
            if dimensions:
                overall = sum(dimensions.values()) / len(dimensions)
                processes_data[process_key]["overall_score"] = round(overall, 2)
                
                # Determina il livello di maturità
                if overall >= 4:
                    status = "OTTIMO"
                    level = 5
                elif overall >= 3.5:
                    status = "BUONO"
                    level = 4
                elif overall >= 2.5:
                    status = "SUFFICIENTE"
                    level = 3
                elif overall >= 2:
                    status = "CARENTE"
                    level = 2
                else:
                    status = "CRITICO"
                    level = 1
                    
                processes_data[process_key]["status"] = status
                processes_data[process_key]["level"] = level

        print(f"✅ DEBUG: Processati {len(processes_data)} processi (solo applicabili)")
        
        return {
            "session_id": str(session_id),
            "processes": list(processes_data.values()),
            "total_processes": len(processes_data)
        }
        
    except Exception as e:
        print(f"❌ Errore in processes_radar_data: {e}")
        print(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Errore nel calcolo dei dati radar per processo: {str(e)}")

@router.get("/assessment/{session_id}/radar")
def radar_data(session_id: UUID, db: Session = Depends(database.get_db)):
    """Restituisce i dati aggregati per il radar chart - ESCLUDE NON APPLICABILI"""
    try:
        print(f"🎯 DEBUG: radar_data per sessione {session_id}")
        
        # ✅ QUERY AGGIORNATA - ESCLUDE is_not_applicable = True
        results = (
            db.query(
                models.AssessmentResult.process,
                func.avg(models.AssessmentResult.score).label("avg_score")
            )
            .filter(models.AssessmentResult.session_id == session_id)
            .filter(models.AssessmentResult.is_not_applicable.is_(False))  # ✅ FILTRO CHIAVE
            .group_by(models.AssessmentResult.process)
            .all()
        )

        print(f"🔍 DEBUG: radar_data trovati {len(results) if results else 0} processi applicabili")

        if not results:
            print(f"❌ DEBUG: Nessun risultato applicabile per radar_data sessione {session_id}")
            raise HTTPException(status_code=404, detail="No applicable results found for this session")

        radar_output = []
        for process, avg_score in results:
            if avg_score >= 4:
                status = "OTTIMO"
                level = 5
            elif avg_score >= 3.5:
                status = "BUONO" 
                level = 4
            elif avg_score >= 2.5:
                status = "SUFFICIENTE"
                level = 3
            elif avg_score >= 2:
                status = "CARENTE"
                level = 2
            else:
                status = "CRITICO"
                level = 1

            radar_output.append({
                "process": process,
                "avg_score": round(avg_score, 2),
                "status": status,
                "level": level
            })

        print(f"✅ DEBUG: radar_data restituendo {len(radar_output)} processi applicabili")

        return {
            "benchmarks": 4,
            "ratings": radar_output,
            "session_id": str(session_id),
            "total_processes": len(radar_output)
        }
        
    except Exception as e:
        print(f"❌ Errore in radar_data: {e}")
        print(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Errore nel calcolo dei dati radar: {str(e)}")

@router.get("/assessment/{session_id}/radar-image")
def radar_image(session_id: UUID, db: Session = Depends(database.get_db)):
    """Genera l'immagine del radar chart aggregato - SEMPRE RADAR CLASSICO - ESCLUDE NON APPLICABILI"""
    try:
        print(f"🎯 RADAR IMAGE: Inizio generazione radar classico per sessione {session_id}")
        
        # ✅ QUERY AGGIORNATA - ESCLUDE is_not_applicable = True
        results = (
            db.query(
                models.AssessmentResult.process,
                func.avg(models.AssessmentResult.score).label("avg_score")
            )
            .filter(models.AssessmentResult.session_id == session_id)
            .filter(models.AssessmentResult.is_not_applicable.is_(False))  # ✅ FILTRO CHIAVE
            .group_by(models.AssessmentResult.process)
            .all()
        )

        print(f"🔍 RADAR IMAGE: Trovati {len(results) if results else 0} processi applicabili")
        
        if not results:
            print(f"❌ RADAR IMAGE: Nessun dato applicabile, creando placeholder")
            return create_placeholder_radar_image()

        # Estrai e processa labels e values
        raw_labels = [r[0] for r in results]
        values = [float(r[1]) for r in results]
        
        print(f"📊 RADAR IMAGE: Processi applicabili da visualizzare:")
        for i, (label, val) in enumerate(zip(raw_labels, values)):
            print(f"  {i+1}. {label}: {val:.2f}")
        
        # FORZA SEMPRE RADAR CLASSICO (anche per 8+ processi)
        print("🎯 RADAR IMAGE: Forzando radar chart classico (solo applicabili)")
        return create_radar_chart_optimized(raw_labels, values)
        
    except Exception as e:
        print(f"💥 RADAR IMAGE: Errore {str(e)}")
        print(f"💥 RADAR IMAGE: Traceback {traceback.format_exc()}")
        return create_error_image(session_id, str(e))

@router.get("/assessment/{session_id}/summary-radar-svg")
def summary_radar_svg(session_id: UUID, db: Session = Depends(database.get_db)):
    """Genera un radar chart SVG riassuntivo - ESCLUDE NON APPLICABILI"""
    try:
        print(f"🎯 SVG RADAR: Generando per sessione {session_id}")
        
        # ✅ QUERY AGGIORNATA - ESCLUDE is_not_applicable = True
        results = (
            db.query(
                models.AssessmentResult.process,
                func.avg(models.AssessmentResult.score).label("avg_score")
            )
            .filter(models.AssessmentResult.session_id == session_id)
            .filter(models.AssessmentResult.is_not_applicable.is_(False))  # ✅ FILTRO CHIAVE
            .group_by(models.AssessmentResult.process)
            .all()
        )

        print(f"🔍 SVG RADAR: Trovati {len(results) if results else 0} processi applicabili")

        if not results:
            print("❌ SVG RADAR: Nessun dato applicabile, usando placeholder")
            return Response(content=create_placeholder_summary_radar_svg(), media_type="image/svg+xml")

        # Organizza i dati
        processes_scores = {}
        for process, avg_score in results:
            processes_scores[process] = float(avg_score)
            print(f"  📊 {process}: {avg_score}")

        # Genera SVG radar classico
        svg_content = create_summary_radar_svg_classic(processes_scores)
        return Response(content=svg_content, media_type="image/svg+xml")
        
    except Exception as e:
        print(f"💥 SVG RADAR: Errore {e}")
        print(f"💥 SVG RADAR: Traceback {traceback.format_exc()}")
        error_svg = create_error_summary_radar_svg()
        return Response(content=error_svg, media_type="image/svg+xml")

# ============================================================================
# ENDPOINT PROCESSO SINGOLO - VERSIONE FISSA CON QUERY PARAMETERS
# ============================================================================

@router.get("/assessment/{session_id}/process-radar-svg")
def process_radar_svg_fixed(session_id: UUID, process_name: str, db: Session = Depends(database.get_db)):
    """Genera un radar chart SVG per un singolo processo - VERSIONE FISSA - ESCLUDE NON APPLICABILI"""
    try:
        print(f"🎯 [FIXED] Generando radar SVG per processo: {process_name}")
        
        # ✅ QUERY AGGIORNATA - ESCLUDE is_not_applicable = True
        results = (
            db.query(
                models.AssessmentResult.category,
                func.avg(models.AssessmentResult.score).label("avg_score")
            )
            .filter(models.AssessmentResult.session_id == session_id)
            .filter(models.AssessmentResult.process == process_name)
            .filter(models.AssessmentResult.is_not_applicable.is_(False))  # ✅ FILTRO CHIAVE
            .group_by(models.AssessmentResult.category)
            .all()
        )

        if not results:
            print(f"❌ [FIXED] Nessun risultato applicabile per processo {process_name}")
            svg_content = create_placeholder_radar_svg(process_name)
            return Response(content=svg_content, media_type="image/svg+xml")

        # Prepara dimensioni
        dimensions = {
            "Governance": 0.0,
            "Monitoring": 0.0, 
            "Technology": 0.0,
            "Organization": 0.0
        }
        
        dimension_mapping = {
            "Governance": "Governance", "Process": "Governance",
            "Monitoring": "Monitoring", "Control": "Monitoring", 
            "Technology": "Technology", "Tech": "Technology", "ICT": "Technology",
            "Organization": "Organization", "Org": "Organization", "People": "Organization"
        }

        for category, avg_score in results:
            for key, dimension in dimension_mapping.items():
                if key.lower() in category.lower():
                    dimensions[dimension] = float(avg_score)
                    break

        print(f"📊 [FIXED] Dimensioni applicabili per {process_name}: {dimensions}")
        svg_content = create_radar_svg(dimensions, process_name)
        return Response(content=svg_content, media_type="image/svg+xml")
        
    except Exception as e:
        print(f"💥 [FIXED] Errore process radar svg: {e}")
        print(f"💥 [FIXED] Traceback: {traceback.format_exc()}")
        error_svg = create_error_radar_svg(process_name)
        return Response(content=error_svg, media_type="image/svg+xml")

@router.get("/assessment/{session_id}/process-radar-image")
def process_radar_image_fixed(session_id: UUID, process_name: str, db: Session = Depends(database.get_db)):
    """Genera l'immagine del radar chart per un singolo processo - VERSIONE FISSA - ESCLUDE NON APPLICABILI"""
    try:
        print(f"🎯 [FIXED] Generando radar matplotlib per processo: {process_name}")
        
        # ✅ QUERY AGGIORNATA - ESCLUDE is_not_applicable = True
        results = (
            db.query(
                models.AssessmentResult.category,
                func.avg(models.AssessmentResult.score).label("avg_score")
            )
            .filter(models.AssessmentResult.session_id == session_id)
            .filter(models.AssessmentResult.process == process_name)
            .filter(models.AssessmentResult.is_not_applicable.is_(False))  # ✅ FILTRO CHIAVE
            .group_by(models.AssessmentResult.category)
            .all()
        )

        if not results:
            raise HTTPException(status_code=404, detail=f"No applicable results found for process {process_name}")

        # Prepara i dati per le 4 dimensioni
        dimensions = {
            "Governance": 0,
            "Monitoring": 0, 
            "Technology": 0,
            "Organization": 0
        }
        
        dimension_mapping = {
            "Governance": "Governance", "Process": "Governance",
            "Monitoring": "Monitoring", "Control": "Monitoring", 
            "Technology": "Technology", "Tech": "Technology", "ICT": "Technology",
            "Organization": "Organization", "Org": "Organization", "People": "Organization"
        }

        for category, avg_score in results:
            for key, dimension in dimension_mapping.items():
                if key.lower() in category.lower():
                    dimensions[dimension] = float(avg_score)
                    break

        # Dati per il radar chart
        labels = list(dimensions.keys())
        values = list(dimensions.values())
        
        # Calcola angoli per 4 dimensioni
        angles = np.linspace(0, 2 * np.pi, 4, endpoint=False).tolist()
        angles += angles[:1]  # Chiudi il cerchio
        values += values[:1]   # Chiudi il cerchio
        labels += labels[:1]   # Chiudi il cerchio

        # Crea il grafico radar
        fig, ax = plt.subplots(figsize=(8, 8), subplot_kw=dict(polar=True))
        
        # Disegna il radar
        ax.plot(angles, values, linewidth=3, linestyle='solid', color='#3B82F6', alpha=0.9)
        ax.fill(angles, values, alpha=0.25, color='#3B82F6')
        
        # Configura gli assi
        ax.set_yticks([1, 2, 3, 4, 5])
        ax.set_yticklabels(['1', '2', '3', '4', '5'], fontsize=11)
        ax.set_ylim(0, 5)
        
        # Configura le etichette
        ax.set_xticks(angles[:-1])
        ax.set_xticklabels(labels[:-1], fontsize=12, fontweight='bold')
        
        # Stile
        ax.grid(True, alpha=0.3)
        ax.set_facecolor('white')
        ax.set_title(f"{process_name}\nDigital Assessment (Solo Applicabili)", 
                    fontsize=14, fontweight='bold', pad=20, color='#1F2937')

        # Salva in buffer
        buf = io.BytesIO()
        plt.savefig(buf, format="png", dpi=150, bbox_inches='tight', 
                   facecolor='white', edgecolor='none', transparent=False)
        plt.close(fig)
        buf.seek(0)

        return StreamingResponse(buf, media_type="image/png")
        
    except Exception as e:
        print(f"💥 [FIXED] Errore in process_radar_image: {e}")
        print(f"💥 [FIXED] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Errore nella generazione del radar chart: {str(e)}")

# ============================================================================
# ENDPOINT LEGACY - COMPATIBILITÀ RETROGRADA (CON PATH PARAMETERS)
# ============================================================================

@router.get("/assessment/{session_id}/process-radar-svg/{process_name}")
def process_radar_svg_legacy(session_id: UUID, process_name: str, db: Session = Depends(database.get_db)):
    """Genera un radar chart SVG per un singolo processo - LEGACY - ESCLUDE NON APPLICABILI"""
    try:
        decoded_process_name = unquote(process_name)
        print(f"🔍 [LEGACY] Process originale URL: {process_name}")
        print(f"🔍 [LEGACY] Process decodificato: {decoded_process_name}")
        print(f"🎯 [LEGACY] Generando radar SVG per processo: {decoded_process_name}")
        
        # ✅ QUERY AGGIORNATA - ESCLUDE is_not_applicable = True
        results = (
            db.query(
                models.AssessmentResult.category,
                func.avg(models.AssessmentResult.score).label("avg_score")
            )
            .filter(models.AssessmentResult.session_id == session_id)
            .filter(models.AssessmentResult.process == decoded_process_name)
            .filter(models.AssessmentResult.is_not_applicable.is_(False))  # ✅ FILTRO CHIAVE
            .group_by(models.AssessmentResult.category)
            .all()
        )

        if not results:
            print(f"❌ [LEGACY] Nessun risultato applicabile per processo {decoded_process_name}")
            return Response(
                content=f'<svg width="300" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="300" height="300" fill="#fff3cd"/><text x="150" y="140" font-family="Arial" font-size="12" text-anchor="middle" fill="#856404">Endpoint deprecato - Solo Applicabili</text><text x="150" y="160" font-family="Arial" font-size="10" text-anchor="middle" fill="#856404">Usa: ?process_name={decoded_process_name}</text></svg>',
                media_type="image/svg+xml"
            )

        # Stesso codice della versione fissa per compatibilità
        dimensions = {
            "Governance": 0.0,
            "Monitoring": 0.0, 
            "Technology": 0.0,
            "Organization": 0.0
        }
        
        dimension_mapping = {
            "Governance": "Governance", "Process": "Governance",
            "Monitoring": "Monitoring", "Control": "Monitoring", 
            "Technology": "Technology", "Tech": "Technology", "ICT": "Technology",
            "Organization": "Organization", "Org": "Organization", "People": "Organization"
        }

        for category, avg_score in results:
            for key, dimension in dimension_mapping.items():
                if key.lower() in category.lower():
                    dimensions[dimension] = float(avg_score)
                    break

        print(f"📊 [LEGACY] Dimensioni applicabili per {decoded_process_name}: {dimensions}")
        svg_content = create_radar_svg(dimensions, decoded_process_name)
        return Response(content=svg_content, media_type="image/svg+xml")
        
    except Exception as e:
        print(f"💥 [LEGACY] Errore process radar svg: {e}")
        print(f"💥 [LEGACY] Process name originale: {process_name}")
        print(f"💥 [LEGACY] Traceback: {traceback.format_exc()}")
        error_svg = create_error_radar_svg(process_name)
        return Response(content=error_svg, media_type="image/svg+xml")

@router.get("/assessment/{session_id}/process-radar-image/{process_name}")
def process_radar_image_legacy(session_id: UUID, process_name: str, db: Session = Depends(database.get_db)):
    """Genera l'immagine del radar chart per un singolo processo - LEGACY - ESCLUDE NON APPLICABILI"""
    try:
        decoded_process_name = unquote(process_name)
        print(f"🔍 [LEGACY] Process originale URL: {process_name}")
        print(f"🔍 [LEGACY] Process decodificato: {decoded_process_name}")
        print(f"🎯 [LEGACY] Generando radar matplotlib per processo: {decoded_process_name}")
        
        # ✅ QUERY AGGIORNATA - ESCLUDE is_not_applicable = True
        results = (
            db.query(
                models.AssessmentResult.category,
                func.avg(models.AssessmentResult.score).label("avg_score")
            )
            .filter(models.AssessmentResult.session_id == session_id)
            .filter(models.AssessmentResult.process == decoded_process_name)
            .filter(models.AssessmentResult.is_not_applicable.is_(False))  # ✅ FILTRO CHIAVE
            .group_by(models.AssessmentResult.category)
            .all()
        )

        if not results:
            raise HTTPException(status_code=404, detail=f"No applicable results found for process {decoded_process_name}. Try using query parameter: ?process_name={decoded_process_name}")

        # Stesso codice della versione fissa
        dimensions = {
            "Governance": 0,
            "Monitoring": 0, 
            "Technology": 0,
            "Organization": 0
        }
        
        dimension_mapping = {
            "Governance": "Governance", "Process": "Governance",
            "Monitoring": "Monitoring", "Control": "Monitoring", 
            "Technology": "Technology", "Tech": "Technology", "ICT": "Technology",
            "Organization": "Organization", "Org": "Organization", "People": "Organization"
        }

        for category, avg_score in results:
            for key, dimension in dimension_mapping.items():
                if key.lower() in category.lower():
                    dimensions[dimension] = float(avg_score)
                    break

        # Crea il grafico
        labels = list(dimensions.keys())
        values = list(dimensions.values())
        
        angles = np.linspace(0, 2 * np.pi, 4, endpoint=False).tolist()
        angles += angles[:1]
        values += values[:1]
        labels += labels[:1]

        fig, ax = plt.subplots(figsize=(8, 8), subplot_kw=dict(polar=True))
        ax.plot(angles, values, linewidth=3, linestyle='solid', color='#3B82F6', alpha=0.9)
        ax.fill(angles, values, alpha=0.25, color='#3B82F6')
        
        ax.set_yticks([1, 2, 3, 4, 5])
        ax.set_yticklabels(['1', '2', '3', '4', '5'], fontsize=11)
        ax.set_ylim(0, 5)
        ax.set_xticks(angles[:-1])
        ax.set_xticklabels(labels[:-1], fontsize=12, fontweight='bold')
        ax.grid(True, alpha=0.3)
        ax.set_facecolor('white')
        ax.set_title(f"{decoded_process_name}\nDigital Assessment (Legacy - Solo Applicabili)", 
                    fontsize=14, fontweight='bold', pad=20, color='#1F2937')

        buf = io.BytesIO()
        plt.savefig(buf, format="png", dpi=150, bbox_inches='tight', 
                   facecolor='white', edgecolor='none', transparent=False)
        plt.close(fig)
        buf.seek(0)

        return StreamingResponse(buf, media_type="image/png")
        
    except Exception as e:
        print(f"💥 [LEGACY] Errore in process_radar_image: {e}")
        raise HTTPException(status_code=500, detail=f"Errore nella generazione del radar chart: {str(e)}")

# ============================================================================
# ✅ NUOVO ENDPOINT PER STATISTICHE DETTAGLIATE
# ============================================================================

@router.get("/assessment/{session_id}/detailed-stats")
def detailed_stats(session_id: UUID, db: Session = Depends(database.get_db)):
    """Statistiche dettagliate incluse domande non applicabili"""
    try:
        print(f"📊 DETAILED STATS: Iniziando per sessione {session_id}")
        
        # Conta totali
        total_results = db.query(models.AssessmentResult).filter(
            models.AssessmentResult.session_id == session_id
        ).count()
        
        applicable_results = db.query(models.AssessmentResult).filter(
            models.AssessmentResult.session_id == session_id,
            models.AssessmentResult.is_not_applicable.is_(False)
        ).count()
        
        not_applicable_results = db.query(models.AssessmentResult).filter(
            models.AssessmentResult.session_id == session_id,
            models.AssessmentResult.is_not_applicable.is_(True)
        ).count()
        
        print(f"📊 TOTALI: {total_results} totali, {applicable_results} applicabili, {not_applicable_results} non applicabili")
        
        # Distribuzione per processo
        process_stats = db.query(
            models.AssessmentResult.process,
            func.count(func.case([(models.AssessmentResult.is_not_applicable.is_(False), 1)])).label("applicable_count"),
            func.count(func.case([(models.AssessmentResult.is_not_applicable.is_(True), 1)])).label("not_applicable_count"),
            func.avg(func.case([(models.AssessmentResult.is_not_applicable.is_(False), models.AssessmentResult.score)])).label("avg_score")
        ).filter(
            models.AssessmentResult.session_id == session_id
        ).group_by(models.AssessmentResult.process).all()
        
        print(f"📊 PROCESSI: Analizzati {len(process_stats)} processi")
        
        return {
            "session_id": str(session_id),
            "totals": {
                "total_questions": total_results,
                "applicable_questions": applicable_results,
                "not_applicable_questions": not_applicable_results,
                "applicable_percentage": round((applicable_results / total_results) * 100, 1) if total_results > 0 else 0
            },
            "by_process": [
                {
                    "process": p,
                    "applicable_count": int(app_count or 0),
                    "not_applicable_count": int(na_count or 0),
                    "avg_score_applicable": round(float(avg), 2) if avg else 0,
                    "total_questions": int(app_count or 0) + int(na_count or 0)
                }
                for p, app_count, na_count, avg in process_stats
            ]
        }
        
    except Exception as e:
        print(f"❌ Errore detailed_stats: {e}")
        print(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Errore statistiche: {str(e)}")

@router.get("/assessment/{session_id}/ai-suggestions-enhanced")
def ai_suggestions_enhanced(session_id: UUID, include_roadmap: bool = False, db: Session = Depends(database.get_db)):
    """Versione migliorata dell'endpoint ai-suggestions originale"""
    try:
        print(f"🤖 AI SUGGESTIONS ENHANCED: Per sessione {session_id}")
        
        # Carica risultati applicabili (come versione originale)
        results = db.query(models.AssessmentResult).filter(
            models.AssessmentResult.session_id == session_id,
            models.AssessmentResult.is_not_applicable.is_(False)
        ).all()

        if not results:
            raise HTTPException(status_code=404, detail="No applicable assessment results found")

        # Mantieni compatibilità con versione originale
        critical_areas = [
            {
                "process": r.process,
                "category": r.category,
                "dimension": r.dimension,
                "score": r.score,
                "note": r.note
            }
            for r in results if r.score < 3
        ]
        
        if not critical_areas:
            return {
                "message": "Nessuna area critica rilevata nelle domande applicabili",
                "critical_count": 0,
                "suggestions": "🎉 Ottimo lavoro! Tutti i punteggi applicabili sono accettabili.",
                "enhanced_available": True
            }

        # Se disponibile, usa il modulo AI avanzato
        try:
            session = db.query(models.AssessmentSession).filter(
                models.AssessmentSession.id == session_id
            ).first()
            
            if session and include_roadmap:
                session_data = {
                    "azienda_nome": session.azienda_nome,
                    "settore": session.settore,
                    "dimensione": session.dimensione
                }
                
                # Usa il modulo AI avanzato
                advanced_recommendations = get_ai_recommendations_advanced(
                    str(session_id), results, session_data
                )
                
                return {
                    "critical_count": len(critical_areas),
                    "suggestions": advanced_recommendations["ai_recommendations"]["content"],
                    "enhanced_mode": True,
                    "roadmap_included": True,
                    "priority_matrix": advanced_recommendations["priority_matrix"],
                    "roi_predictions": advanced_recommendations["roi_predictions"]
                }
        
        except Exception as e:
            print(f"⚠️ Fallback to basic AI: {e}")
        
        # Fallback alla versione originale migliorata
        if not openai.api_key:
            return {
                "critical_count": len(critical_areas),
                "suggestions": "⚠️ API OpenAI non configurata. Configurare OPENAI_API_KEY per suggerimenti personalizzati.",
                "enhanced_available": False
            }

        # Prompt migliorato rispetto all'originale
        prompt = f"""Sei un esperto di trasformazione digitale per aziende italiane.

AREE CRITICHE IDENTIFICATE ({len(critical_areas)} su {len(results)} domande applicabili):
"""
        
        for item in critical_areas:
            prompt += f"\n🔴 [{item['process']}] {item['category']} → {item['dimension']} (Punteggio: {item['score']}/5)\n"
            if item['note']:
                prompt += f"  💬 Nota: {item['note']}\n"

        prompt += """
Per ogni area critica, fornisci raccomandazioni specifiche e actionable.
Rispondi in italiano, tono professionale ma accessibile."""

        try:
            response = openai.chat.completions.create(
                model=os.getenv("OPENAI_MODEL", "gpt-4"),
                messages=[
                    {"role": "system", "content": "Sei un consulente di trasformazione digitale per PMI italiane."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=2000,
                temperature=0.7
            )
            
            return {
                "critical_count": len(critical_areas),
                "suggestions": response.choices[0].message.content,
                "enhanced_mode": False,
                "model_used": os.getenv("OPENAI_MODEL", "gpt-4")
            }
            
        except Exception as e:
            print(f"❌ Errore OpenAI enhanced: {e}")
            return {
                "critical_count": len(critical_areas),
                "suggestions": f"⚠️ Errore generazione AI: {str(e)}\n\n{len(critical_areas)} aree critiche identificate necessitano attenzione.",
                "enhanced_available": False
            }
            
    except Exception as e:
        print(f"❌ Errore ai_suggestions_enhanced: {e}")
        raise HTTPException(status_code=500, detail=f"Errore suggerimenti: {str(e)}")

print("✅ Modifiche radar.py con integrazione AI module completate!")
print("🏨 Supporto settore TURISMO attivato!")
print("🤖 Endpoints AI avanzati disponibili:")
print("   - /ai-recommendations-advanced")
print("   - /sector-insights-advanced") 
print("   - /smart-recommendations")
print("   - /enhanced-summary")

@router.get("/assessment/{session_id}/summary")
def assessment_summary(session_id: UUID, db: Session = Depends(database.get_db)):
    """Riepilogo completo assessment - ESCLUDE NON APPLICABILI DALLE MEDIE"""
    try:
        print(f"📋 SUMMARY: Iniziando per sessione {session_id}")
        
        # Totale domande (include anche non applicabili per statistica)
        total_questions = db.query(models.AssessmentResult).filter(
            models.AssessmentResult.session_id == session_id
        ).count()
        
        # ✅ CONTA SOLO QUELLE APPLICABILI
        applicable_questions = db.query(models.AssessmentResult).filter(
            models.AssessmentResult.session_id == session_id,
            models.AssessmentResult.is_not_applicable.is_(False)
        ).count()
        
        not_applicable_questions = total_questions - applicable_questions
        
        print(f"📋 SUMMARY: {total_questions} totali, {applicable_questions} applicabili, {not_applicable_questions} non applicabili")
        
        if applicable_questions == 0:
            raise HTTPException(status_code=404, detail="No applicable assessment data found")
        
        # ✅ MEDIA SOLO SU QUELLE APPLICABILI
        avg_score = db.query(func.avg(models.AssessmentResult.score)).filter(
            models.AssessmentResult.session_id == session_id,
            models.AssessmentResult.is_not_applicable.is_(False)
        ).scalar()
        
        # ✅ DISTRIBUZIONE SOLO SU QUELLE APPLICABILI
        score_distribution = db.query(
            models.AssessmentResult.score,
            func.count(models.AssessmentResult.score).label('count')
        ).filter(
            models.AssessmentResult.session_id == session_id,
            models.AssessmentResult.is_not_applicable.is_(False)
        ).group_by(models.AssessmentResult.score).all()
        
        # ✅ PUNTEGGI PER PROCESSO SOLO SU QUELLE APPLICABILI
        process_scores = db.query(
            models.AssessmentResult.process,
            func.avg(models.AssessmentResult.score).label("avg_score"),
            func.count(models.AssessmentResult.score).label("applicable_count")
        ).filter(
            models.AssessmentResult.session_id == session_id,
            models.AssessmentResult.is_not_applicable.is_(False)
        ).group_by(models.AssessmentResult.process).all()
        
        print(f"📋 SUMMARY: Media generale applicabili: {avg_score:.2f}")
        
        return {
            "session_id": str(session_id),
            "total_questions": total_questions,
            "applicable_questions": applicable_questions,  # ✅ NUOVO CAMPO
            "not_applicable_questions": not_applicable_questions,  # ✅ NUOVO CAMPO
            "overall_score": round(float(avg_score), 2) if avg_score else 0,
            "score_distribution": [{"score": s, "count": c} for s, c in score_distribution],
            "process_breakdown": [
                {
                    "process": p,
                    "avg_score": round(float(avg), 2),
                    "applicable_count": count,  # ✅ RINOMINATO DA question_count
                    "percentage": round((float(avg) / 5) * 100, 1)
                }
                for p, avg, count in process_scores
            ]
        }
        
    except Exception as e:
        print(f"❌ Errore summary: {e}")
        print(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Errore riepilogo: {str(e)}")

# ============================================================================
# ENDPOINT DI TEST E DEBUG AGGIORNATI
# ============================================================================

@router.get("/debug/process/{process_name}")
def debug_process_name(process_name: str):
    """Debug endpoint per testare URL decoding"""
    decoded = unquote(process_name)
    return {
        "original_url_param": process_name,
        "decoded_param": decoded,
        "length_original": len(process_name),
        "length_decoded": len(decoded),
        "test_encoding": process_name == "DESIGN%20%26%20ENGINEERING",
        "test_decoding": decoded == "DESIGN & ENGINEERING",
        "contains_ampersand": "&" in decoded,
        "url_safe_chars": all(c.isalnum() or c in "-._~" for c in process_name)
    }

@router.get("/debug/session/{session_id}/process/{process_name}")
def debug_process_db_query(session_id: UUID, process_name: str, db: Session = Depends(database.get_db)):
    """Debug endpoint per testare query database - CON GESTIONE NON APPLICABILI"""
    decoded = unquote(process_name)
    
    # Query con nome originale (tutte)
    results_original = db.query(models.AssessmentResult).filter(
        models.AssessmentResult.session_id == session_id,
        models.AssessmentResult.process == process_name
    ).all()
    
    # Query con nome decodificato (tutte)
    results_decoded = db.query(models.AssessmentResult).filter(
        models.AssessmentResult.session_id == session_id,
        models.AssessmentResult.process == decoded
    ).all()
    
    # ✅ SOLO QUELLE APPLICABILI
    results_applicable = db.query(models.AssessmentResult).filter(
        models.AssessmentResult.session_id == session_id,
        models.AssessmentResult.process == decoded,
        models.AssessmentResult.is_not_applicable.is_(False)
    ).all()
    
    # ✅ SOLO QUELLE NON APPLICABILI
    results_not_applicable = db.query(models.AssessmentResult).filter(
        models.AssessmentResult.session_id == session_id,
        models.AssessmentResult.process == decoded,
        models.AssessmentResult.is_not_applicable.is_(True)
    ).all()
    
    # Tutti i processi per questa sessione
    all_processes = db.query(models.AssessmentResult.process).filter(
        models.AssessmentResult.session_id == session_id
    ).distinct().all()
    
    return {
        "process_original": process_name,
        "process_decoded": decoded,
        "results_with_original": len(results_original),
        "results_with_decoded": len(results_decoded),
        "results_applicable": len(results_applicable),  # ✅ NUOVO
        "results_not_applicable": len(results_not_applicable),  # ✅ NUOVO
        "all_processes_in_db": [p[0] for p in all_processes],
        "exact_match_found": decoded in [p[0] for p in all_processes],
        "recommendation": f"Found {len(results_applicable)} applicable, {len(results_not_applicable)} not applicable"
    }

@router.get("/test-query-param")
def test_query_param(process_name: str):
    """Test endpoint per verificare query parameters"""
    return {
        "received_process_name": process_name,
        "length": len(process_name),
        "contains_ampersand": "&" in process_name,
        "contains_space": " " in process_name,
        "test_success": process_name == "DESIGN & ENGINEERING",
        "message": "✅ Query parameter funziona correttamente!" if process_name == "DESIGN & ENGINEERING" else "⚠️ Valore non previsto"
    }

@router.get("/test-working-radar")
def test_working_radar():
    """Radar di test che funziona sempre - per verificare matplotlib"""
    try:
        print("🎯 TEST RADAR: Creando radar di test")
        
        # Dati di test fissi
        labels = ['Processo A', 'Processo B', 'Processo C', 'Processo D', 'Processo E']
        values = [3.2, 4.1, 2.8, 3.7, 3.5]
        
        return create_radar_chart_optimized(labels, values, title_override="🧪 Test Radar - Matplotlib Funzionante (Solo Applicabili)")
        
    except Exception as e:
        print(f"💥 TEST RADAR: Errore {e}")
        raise HTTPException(status_code=500, detail=f"Test radar fallito: {str(e)}")

@router.get("/assessment/{session_id}/test-radar-debug")
def test_radar_debug(session_id: UUID, db: Session = Depends(database.get_db)):
    """Endpoint di test per debug completo - CON GESTIONE NON APPLICABILI"""
    try:
        print(f"🔍 DEBUG TEST: Iniziando per sessione {session_id}")
        
        # Test 1: Verifica connessione DB
        total_results = db.query(models.AssessmentResult).filter(
            models.AssessmentResult.session_id == session_id
        ).count()
        
        # ✅ CONTA APPLICABILI E NON APPLICABILI
        applicable_results = db.query(models.AssessmentResult).filter(
            models.AssessmentResult.session_id == session_id,
            models.AssessmentResult.is_not_applicable.is_(False)
        ).count()
        
        not_applicable_results = db.query(models.AssessmentResult).filter(
            models.AssessmentResult.session_id == session_id,
            models.AssessmentResult.is_not_applicable.is_(True)
        ).count()
        
        print(f"📊 DEBUG TEST: Totale risultati DB: {total_results} (applicabili: {applicable_results}, non applicabili: {not_applicable_results})")
        
        if applicable_results == 0:
            return {
                "status": "WARNING",
                "message": "Nessun risultato applicabile nel database",
                "session_id": str(session_id),
                "total_results": total_results,
                "applicable_results": applicable_results,
                "not_applicable_results": not_applicable_results
            }
        
        # Test 2: Query processi applicabili
        results = (
            db.query(
                models.AssessmentResult.process,
                func.avg(models.AssessmentResult.score).label("avg_score")
            )
            .filter(models.AssessmentResult.session_id == session_id)
            .filter(models.AssessmentResult.is_not_applicable.is_(False))  # ✅ SOLO APPLICABILI
            .group_by(models.AssessmentResult.process)
            .all()
        )
        
        print(f"📈 DEBUG TEST: Processi applicabili trovati: {len(results)}")
        
        processes_data = {}
        for process, avg_score in results:
            processes_data[process] = float(avg_score)
            print(f"  • {process}: {avg_score}")
        
        # Test 3: Matplotlib
        try:
            fig, ax = plt.subplots(figsize=(5, 5))
            ax.plot([1, 2, 3], [1, 2, 3])
            ax.set_title("Matplotlib Test - Solo Applicabili")
            
            buf = io.BytesIO()
            plt.savefig(buf, format="png", dpi=72)
            plt.close(fig)
            buf.seek(0)
            
            matplotlib_status = "OK"
            
        except Exception as e:
            matplotlib_status = f"ERROR: {str(e)}"
            print(f"❌ MATPLOTLIB ERROR: {e}")
        
        return {
            "status": "SUCCESS",
            "session_id": str(session_id),
            "total_results": total_results,
            "applicable_results": applicable_results,
            "not_applicable_results": not_applicable_results,
            "applicable_percentage": round((applicable_results / total_results) * 100, 1) if total_results > 0 else 0,
            "processes_found": len(results),
            "processes_data": processes_data,
            "matplotlib_status": matplotlib_status,
            "debug_info": "Tutti i test completati - Sistema con gestione Non Applicabili attivo"
        }
        
    except Exception as e:
        print(f"💥 DEBUG TEST: Errore {e}")
        return {
            "status": "ERROR",
            "message": str(e),
            "session_id": str(session_id),
            "traceback": traceback.format_exc()
        }

@router.get("/assessment/{session_id}/force-working-radar")
def force_working_radar(session_id: UUID, db: Session = Depends(database.get_db)):
    """Radar che DEVE funzionare - usa dati applicabili o fake"""
    try:
        print(f"🎯 FORCE RADAR: Iniziando per {session_id}")
        
        # Prova dati applicabili
        results = db.query(
            models.AssessmentResult.process,
            func.avg(models.AssessmentResult.score).label("avg_score")
        ).filter(
            models.AssessmentResult.session_id == session_id,
            models.AssessmentResult.is_not_applicable.is_(False)  # ✅ SOLO APPLICABILI
        ).group_by(models.AssessmentResult.process).all()
        
        if results and len(results) > 0:
            # Usa dati applicabili
            raw_labels = [r[0] for r in results]
            values = [float(r[1]) for r in results]
            title = f"Radar Forzato - {len(results)} Processi Applicabili"
            print(f"📊 FORCE RADAR: Usando {len(results)} processi applicabili")
            
        else:
            # Usa dati fake
            raw_labels = ['Produzione', 'Qualità', 'Logistica', 'Manutenzione', 'Vendite', 'Marketing']
            values = [3.2, 4.1, 2.8, 3.9, 3.5, 2.9]
            title = "Radar Forzato - Dati Demo (Nessun Applicabile)"
            print("🎭 FORCE RADAR: Usando dati demo (nessun risultato applicabile)")
        
        # Crea sempre un radar classico
        return create_radar_chart_optimized(raw_labels, values, title_override=title)
        
    except Exception as e:
        print(f"💥 FORCE RADAR: Errore {e}")
        return create_emergency_chart(str(e))

# ============================================================================
# FUNZIONI DI SUPPORTO PER MATPLOTLIB - RIMANGONO UGUALI
# ============================================================================

def create_radar_chart_optimized(labels, values, title_override=None):
    """Crea radar chart classico ottimizzato per qualsiasi numero di processi"""
    try:
        print(f"🎯 Creando radar chart ottimizzato per {len(labels)} processi...")
        
        # Tronca nomi per molti processi
        display_labels = []
        for label in labels:
            if len(labels) > 6:  # Per molti processi, tronca di più
                words = label.split()
                if len(words) > 1:
                    if len(words[0]) > 10:
                        short = f"{words[0][:8]}..."
                    else:
                        short = f"{words[0]} {words[1][:3]}..." if len(words) > 1 else words[0][:10]
                else:
                    short = label[:8] + "..." if len(label) > 8 else label
            else:
                short = label[:15] + "..." if len(label) > 18 else label
            display_labels.append(short)
        
        num_vars = len(labels)
        angles = np.linspace(0, 2 * np.pi, num_vars, endpoint=False).tolist()
        angles += angles[:1]
        values_closed = values + [values[0]]
        display_labels_closed = display_labels + [display_labels[0]]

        # Crea radar con dimensioni adattive
        fig_size = max(10, min(16, len(labels) * 1.2))  # Dimensioni intelligenti
        fig, ax = plt.subplots(figsize=(fig_size, fig_size), subplot_kw=dict(polar=True))
        
        # Disegna radar con stile migliorato
        ax.plot(angles, values_closed, linewidth=4, linestyle='solid', color='#2E86AB', alpha=0.9)
        ax.fill(angles, values_closed, alpha=0.3, color='#2E86AB')
        
        # Aggiungi punti colorati per distinguere i processi
        colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#F97316', '#06B6D4', '#84CC16']
        for i, (angle, value) in enumerate(zip(angles[:-1], values)):
            color = colors[i % len(colors)]
            ax.plot(angle, value, 'o', color=color, markersize=10, 
                   markeredgecolor='white', markeredgewidth=3, alpha=0.9)
        
        # Assi con stile migliorato
        ax.set_yticks([1, 2, 3, 4, 5])
        ax.set_yticklabels(['1', '2', '3', '4', '5'], fontsize=12, fontweight='bold')
        ax.set_ylim(0, 5)
        
        # Etichette - dimensione font adattiva
        label_fontsize = max(8, min(12, 16 - len(labels)))  # Font adattivo
        ax.set_xticks(angles[:-1])
        ax.set_xticklabels(display_labels, fontsize=label_fontsize, fontweight='bold')
        
        # Stile radar professionale
        ax.grid(True, alpha=0.4, linewidth=1)
        ax.set_facecolor('white')
        
        # Titolo dinamico
        if title_override:
            title = title_override
        else:
            title = f"Digital Assessment 4.0 - Solo Applicabili ({len(labels)} Processi)"
        
        ax.set_title(title, fontsize=max(14, min(18, 20 - len(labels))), 
                    fontweight='bold', pad=30, color='#1F4E79')

        # Aggiungi legenda se ci sono molti processi
        if len(labels) > 4:
            legend_elements = []
            for i, (label, color) in enumerate(zip(labels, colors[:len(labels)])):
                legend_elements.append(plt.Line2D([0], [0], marker='o', color='w', 
                                                markerfacecolor=color, markersize=8, 
                                                label=label[:20] + ('...' if len(label) > 20 else ''),
                                                markeredgecolor='white', markeredgewidth=2))
            
            ax.legend(handles=legend_elements, loc='center left', bbox_to_anchor=(1.1, 0.5),
                     fontsize=max(8, min(10, 12 - len(labels)//2)), frameon=True, 
                     fancybox=True, shadow=True)

        # Salva con qualità alta
        buf = io.BytesIO()
        plt.savefig(buf, format="png", dpi=150, bbox_inches='tight', 
                   facecolor='white', edgecolor='none', pad_inches=0.2)
        plt.close(fig)
        buf.seek(0)

        print("✅ Radar chart ottimizzato creato con successo")
        return StreamingResponse(buf, media_type="image/png")
        
    except Exception as e:
        print(f"💥 Errore radar chart ottimizzato: {e}")
        print(f"💥 Traceback: {traceback.format_exc()}")
        raise

def create_placeholder_radar_image():
    """Placeholder quando non ci sono dati applicabili"""
    try:
        fig, ax = plt.subplots(figsize=(10, 8))
        ax.text(0.5, 0.5, 'Nessun dato applicabile\nper il Radar Chart', 
                ha='center', va='center', fontsize=18, color='#6B7280',
                bbox=dict(boxstyle="round,pad=1", facecolor="#F9FAFB", edgecolor="#E5E7EB"))
        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1)
        ax.set_title("Digital Assessment 4.0 - Solo Applicabili", fontsize=20, pad=20, color='#1F2937')
        ax.axis('off')
        
        buf = io.BytesIO()
        plt.savefig(buf, format="png", dpi=150, bbox_inches='tight', facecolor='white')
        plt.close(fig)
        buf.seek(0)
        
        return StreamingResponse(buf, media_type="image/png")
    except Exception as e:
        print(f"Errore placeholder: {e}")
        raise HTTPException(status_code=500, detail="Errore generazione placeholder")

def create_error_image(session_id, error_msg):
    """Immagine di errore"""
    try:
        fig, ax = plt.subplots(figsize=(10, 8))
        ax.text(0.5, 0.6, '❌ Errore Generazione Radar', 
               ha='center', va='center', fontsize=18, color='#DC2626', fontweight='bold')
        ax.text(0.5, 0.4, f'Sessione: {session_id}', 
               ha='center', va='center', fontsize=12, color='#374151')
        ax.text(0.5, 0.2, f'Errore: {error_msg[:60]}...', 
               ha='center', va='center', fontsize=10, color='#6B7280')
        
        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1)
        ax.set_title("Digital Assessment 4.0 - Errore (Solo Applicabili)", fontsize=16, color='#DC2626')
        ax.axis('off')
        
        # Box rosso
        ax.add_patch(plt.Rectangle((0.1, 0.1), 0.8, 0.8, fill=True, 
                                  facecolor='#FEF2F2', edgecolor='#FCA5A5', linewidth=3))
        
        buf = io.BytesIO()
        plt.savefig(buf, format="png", dpi=150, bbox_inches='tight', facecolor='white')
        plt.close(fig)
        buf.seek(0)
        
        return StreamingResponse(buf, media_type="image/png")
        
    except Exception as e:
        print(f"Errore anche nell'immagine di errore: {e}")
        raise HTTPException(status_code=500, detail="Errore critico grafico")

def create_emergency_chart(error_msg):
    """Chart di emergenza assoluta"""
    try:
        fig, ax = plt.subplots(figsize=(8, 6))
        ax.text(0.5, 0.5, f'EMERGENZA RADAR\n{error_msg[:50]}', 
               ha='center', va='center', fontsize=14, color='red')
        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1)
        ax.set_title("Errore Critico - Solo Applicabili", fontsize=16, color='red')
        ax.axis('off')
        
        buf = io.BytesIO()
        plt.savefig(buf, format="png", dpi=100, bbox_inches='tight', facecolor='yellow')
        plt.close(fig)
        buf.seek(0)
        
        return StreamingResponse(buf, media_type="image/png")
        
    except:
        raise HTTPException(status_code=500, detail="Errore catastrofico")

# ============================================================================
# FUNZIONI DI SUPPORTO PER SVG - RIMANGONO UGUALI MA CON MESSAGGI AGGIORNATI
# ============================================================================

def create_radar_svg(dimensions, process_name):
    """Crea radar SVG per singolo processo"""
    # Escape XML characters
    process_name_escaped = process_name.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    
    size = 300
    center = size / 2
    max_radius = 100
    
    labels = list(dimensions.keys())
    values = list(dimensions.values())
    
    num_points = 4
    angle_step = 2 * math.pi / num_points
    
    radar_points = []
    for i, value in enumerate(values):
        angle = i * angle_step - math.pi / 2
        radius = (value / 5) * max_radius
        x = center + radius * math.cos(angle)
        y = center + radius * math.sin(angle)
        radar_points.append((x, y))
    
    svg = f'''<svg width="{size}" height="{size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="{size}" height="{size}" fill="white" stroke="#e5e7eb"/>
    
    <g stroke="#e5e7eb" fill="none">
        <circle cx="{center}" cy="{center}" r="{max_radius * 0.2}"/>
        <circle cx="{center}" cy="{center}" r="{max_radius * 0.4}"/>
        <circle cx="{center}" cy="{center}" r="{max_radius * 0.6}"/>
        <circle cx="{center}" cy="{center}" r="{max_radius * 0.8}"/>
        <circle cx="{center}" cy="{center}" r="{max_radius}"/>
    </g>
    
    <g stroke="#e5e7eb">'''
    
    for i in range(num_points):
        angle = i * angle_step - math.pi / 2
        end_x = center + max_radius * math.cos(angle)
        end_y = center + max_radius * math.sin(angle)
        svg += f'<line x1="{center}" y1="{center}" x2="{end_x}" y2="{end_y}"/>'
    
    svg += '''</g>
    
    <polygon points="'''
    
    for x, y in radar_points:
        svg += f"{x:.1f},{y:.1f} "
    
    svg += f'''" fill="#3B82F6" fill-opacity="0.25" stroke="#3B82F6" stroke-width="2"/>
    
    <g fill="#3B82F6">'''
    
    for x, y in radar_points:
        svg += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4"/>'
    
    svg += '''</g>
    
    <g font-family="Arial" font-weight="bold" text-anchor="middle">'''
    
    for i, (label, value) in enumerate(zip(labels, values)):
        angle = i * angle_step - math.pi / 2
        label_radius = max_radius + 25
        x = center + label_radius * math.cos(angle)
        y = center + label_radius * math.sin(angle) + 5
        
        svg += f'<text x="{x:.1f}" y="{y:.1f}" fill="#374151" font-size="12">{label}</text>'
        svg += f'<text x="{x:.1f}" y="{y + 15:.1f}" fill="#3B82F6" font-size="11">({value:.1f})</text>'
    
    svg += f'''</g>
    
    <text x="{center}" y="20" font-family="Arial" font-size="14" font-weight="bold" 
          text-anchor="middle" fill="#1F2937">{process_name_escaped} (Solo Applicabili)</text>
    
    <g font-family="Arial" font-size="9" fill="#6B7280" text-anchor="middle">
        <text x="{center}" y="{center - max_radius * 0.8 + 3}">4</text>
        <text x="{center}" y="{center - max_radius * 0.6 + 3}">3</text>
        <text x="{center}" y="{center - max_radius * 0.4 + 3}">2</text>
        <text x="{center}" y="{center - max_radius * 0.2 + 3}">1</text>
        <text x="{center}" y="{center + 3}">0</text>
    </g>
</svg>'''
    
    return svg

def create_summary_radar_svg_classic(processes_scores):
    """Crea un radar SVG classico per tutti i processi"""
    if not processes_scores:
        return create_placeholder_summary_radar_svg()
    
    size = 500  # Più grande per molti processi
    center = size / 2
    max_radius = 180
    
    processes = list(processes_scores.keys())
    values = list(processes_scores.values())
    num_processes = len(processes)
    
    if num_processes == 0:
        return create_placeholder_summary_radar_svg()
    
    # Colori distintivi
    colors = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#F97316", "#06B6D4", "#84CC16"]
    
    angle_step = 2 * math.pi / num_processes
    
    svg_parts = [
        f'<svg width="{size}" height="{size}" xmlns="http://www.w3.org/2000/svg">',
        f'<rect width="{size}" height="{size}" fill="white" stroke="#e5e7eb"/>',
        
        # Griglia circolare
        '<g stroke="#e5e7eb" fill="none" stroke-width="1">',
        f'<circle cx="{center}" cy="{center}" r="{max_radius * 0.2}"/>',
        f'<circle cx="{center}" cy="{center}" r="{max_radius * 0.4}"/>',
        f'<circle cx="{center}" cy="{center}" r="{max_radius * 0.6}"/>',
        f'<circle cx="{center}" cy="{center}" r="{max_radius * 0.8}"/>',
        f'<circle cx="{center}" cy="{center}" r="{max_radius}"/>',
        '</g>'
    ]
    
    # Linee radiali
    svg_parts.append('<g stroke="#e5e7eb" stroke-width="1">')
    for i in range(num_processes):
        angle = i * angle_step - math.pi / 2
        end_x = center + max_radius * math.cos(angle)
        end_y = center + max_radius * math.sin(angle)
        svg_parts.append(f'<line x1="{center}" y1="{center}" x2="{end_x:.1f}" y2="{end_y:.1f}"/>')
    svg_parts.append('</g>')
    
    # Calcola punti radar
    points = []
    for i, value in enumerate(values):
        angle = i * angle_step - math.pi / 2
        radius = (value / 5) * max_radius
        x = center + radius * math.cos(angle)
        y = center + radius * math.sin(angle)
        points.append((x, y))
    
    # Area radar principale
    point_strings = [f"{x:.1f},{y:.1f}" for x, y in points]
    svg_parts.append(f'<polygon points="{" ".join(point_strings)}" fill="#2E86AB" fill-opacity="0.2" stroke="#2E86AB" stroke-width="3"/>')
    
    # Punti individuali colorati e più grandi
    svg_parts.append('<g>')
    for i, (x, y) in enumerate(points):
        color = colors[i % len(colors)]
        svg_parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="8" fill="{color}" stroke="white" stroke-width="3"/>')
    svg_parts.append('</g>')
    
    # Labels processi ottimizzati
    svg_parts.append('<g font-family="Arial, sans-serif" text-anchor="middle">')
    font_size = max(9, min(12, 16 - num_processes))  # Font adattivo
    
    for i, (process, value) in enumerate(processes_scores.items()):
        angle = i * angle_step - math.pi / 2
        label_radius = max_radius + 40
        x = center + label_radius * math.cos(angle)
        y = center + label_radius * math.sin(angle)
        
        # Tronca nomi intelligentemente
        if len(process) > 15:
            words = process.split()
            if len(words) > 1:
                display_name = f"{words[0][:8]} {words[1][:3]}..."
            else:
                display_name = process[:12] + "..."
        else:
            display_name = process
        
        color = colors[i % len(colors)]
        
        svg_parts.append(f'<text x="{x:.1f}" y="{y:.1f}" fill="{color}" font-size="{font_size}" font-weight="bold">{display_name}</text>')
        svg_parts.append(f'<text x="{x:.1f}" y="{y + 14:.1f}" fill="#374151" font-size="{font_size-1}">({value:.1f})</text>')
    svg_parts.append('</g>')
    
    # Titoli
    svg_parts.append(f'<text x="{center}" y="30" font-family="Arial, sans-serif" font-size="18" font-weight="bold" text-anchor="middle" fill="#1F2937">Digital Assessment 4.0</text>')
    svg_parts.append(f'<text x="{center}" y="50" font-family="Arial, sans-serif" font-size="14" text-anchor="middle" fill="#6B7280">Solo Applicabili - {num_processes} Processi</text>')
    
    # Scala numerica con stile migliorato
    svg_parts.append('<g font-family="Arial, sans-serif" font-size="11" fill="#4B5563" text-anchor="middle" font-weight="bold">')
    for i, val in enumerate([5, 4, 3, 2, 1]):
        radius_pos = max_radius * (0.2 * (5-i))
        svg_parts.append(f'<text x="{center}" y="{center - radius_pos + 4}">{val}</text>')
    svg_parts.append('</g>')
    
    svg_parts.append('</svg>')
    
    return '\n'.join(svg_parts)

def create_placeholder_radar_svg(process_name):
    """SVG placeholder processo"""
    return f'''<svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">
    <rect width="300" height="300" fill="#f9fafb" stroke="#e5e7eb"/>
    <circle cx="150" cy="150" r="80" fill="none" stroke="#e5e7eb" stroke-width="2"/>
    <text x="150" y="140" font-family="Arial" font-size="12" text-anchor="middle" fill="#6b7280">
        Dati applicabili non disponibili
    </text>
    <text x="150" y="160" font-family="Arial" font-size="14" font-weight="bold" text-anchor="middle" fill="#374151">
        {process_name[:20]}
    </text>
</svg>'''

def create_error_radar_svg(process_name):
    """SVG errore processo"""
    return f'''<svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">
    <rect width="300" height="300" fill="#fef2f2" stroke="#fca5a5"/>
    <text x="150" y="140" font-family="Arial" font-size="12" text-anchor="middle" fill="#dc2626">
        Errore generazione radar
    </text>
    <text x="150" y="160" font-family="Arial" font-size="14" font-weight="bold" text-anchor="middle" fill="#991b1b">
        {process_name[:20]} (Solo Applicabili)
    </text>
</svg>'''

def create_placeholder_summary_radar_svg():
    """SVG placeholder riassuntivo"""
    return '''<svg width="500" height="500" xmlns="http://www.w3.org/2000/svg">
    <rect width="500" height="500" fill="#f9fafb" stroke="#e5e7eb"/>
    <circle cx="250" cy="250" r="150" fill="none" stroke="#e5e7eb" stroke-width="2"/>
    <circle cx="250" cy="250" r="100" fill="none" stroke="#e5e7eb" stroke-width="1"/>
    <circle cx="250" cy="250" r="50" fill="none" stroke="#e5e7eb" stroke-width="1"/>
    <text x="250" y="240" font-family="Arial" font-size="16" text-anchor="middle" fill="#6b7280">
        Nessun dato applicabile disponibile
    </text>
    <text x="250" y="260" font-family="Arial" font-size="18" font-weight="bold" text-anchor="middle" fill="#374151">
        Radar Classico (Solo Applicabili)
    </text>
</svg>'''

def create_error_summary_radar_svg():
    """SVG errore riassuntivo"""
    return '''<svg width="500" height="500" xmlns="http://www.w3.org/2000/svg">
    <rect width="500" height="500" fill="#fef2f2" stroke="#fca5a5"/>
    <text x="250" y="240" font-family="Arial" font-size="16" text-anchor="middle" fill="#dc2626">
        Errore generazione
    </text>
    <text x="250" y="260" font-family="Arial" font-size="18" font-weight="bold" text-anchor="middle" fill="#991b1b">
        Radar Classico (Solo Applicabili)
    </text>
</svg>'''


# ============================================================================
# 🤖 NUOVI ENDPOINT AI - AGGIUNGI QUESTI ALLA FINE DEL FILE
# ============================================================================

@router.get("/assessment/{session_id}/ai-recommendations-advanced")
def ai_recommendations_advanced(session_id: UUID, db: Session = Depends(database.get_db)):
    """Sistema di raccomandazioni AI avanzato - RICHIEDE OpenAI configurato"""
    try:
        print(f"🤖 AI ADVANCED: Iniziando per sessione {session_id}")
        
        # ✅ CONTROLLO PRELIMINARE OpenAI
        openai_key = os.getenv("OPENAI_API_KEY")
        if not openai_key:
            raise HTTPException(
                status_code=503,
                detail={
                    "error": "AI_NOT_CONFIGURED",
                    "message": "Sistema AI non configurato",
                    "instructions": [
                        "1. Aggiungere OPENAI_API_KEY al file .env",
                        "2. Riavviare il server",
                        "3. Verificare che la chiave API sia valida"
                    ],
                    "fallback_available": False
                }
            )
        
        # Carica dati sessione
        session = db.query(models.AssessmentSession).filter(
            models.AssessmentSession.id == session_id
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Carica risultati applicabili
        results = db.query(models.AssessmentResult).filter(
            models.AssessmentResult.session_id == session_id,
            models.AssessmentResult.is_not_applicable.is_(False)
        ).all()
        
        if not results:
            raise HTTPException(
                status_code=404, 
                detail="No applicable assessment results found. Complete assessment first."
            )
        
        print(f"📊 Trovati {len(results)} risultati applicabili per AI analysis")
        
        # Prepara dati sessione
        session_data = {
            "azienda_nome": session.azienda_nome,
            "settore": session.settore,
            "dimensione": session.dimensione,
            "referente": session.referente,
            "email": session.email
        }
        
        # ✅ USA IL MODULO AI (può lanciare HTTPException se problemi)
        recommendations = get_ai_recommendations_advanced(
            str(session_id), 
            results, 
            session_data
        )
        
        print(f"✅ AI Analysis completata: {recommendations['ai_recommendations']['model_used']}")
        
        return recommendations
        
    except HTTPException:
        # Re-raise HTTP exceptions (già formattate)
        raise
    except Exception as e:
        print(f"❌ Errore AI advanced: {e}")
        print(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500, 
            detail={
                "error": "AI_SYSTEM_ERROR",
                "message": f"Errore interno sistema AI: {str(e)}",
                "suggestion": "Verificare configurazione OpenAI e riprovare"
            }
        )

@router.get("/assessment/{session_id}/sector-insights-advanced")
def sector_insights_advanced(session_id: UUID, db: Session = Depends(database.get_db)):
    """Insights settoriali avanzati incluso turismo"""
    try:
        print(f"🏭 SECTOR INSIGHTS ADVANCED: Per sessione {session_id}")
        
        # Carica sessione
        session = db.query(models.AssessmentSession).filter(
            models.AssessmentSession.id == session_id
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Carica risultati applicabili
        results = db.query(models.AssessmentResult).filter(
            models.AssessmentResult.session_id == session_id,
            models.AssessmentResult.is_not_applicable.is_(False)
        ).all()
        
        if not results:
            raise HTTPException(status_code=404, detail="No applicable results found")
        
        # Contesto aziendale
        company_context = {
            "name": session.azienda_nome,
            "sector": session.settore if session.settore else "Non specificato",
            "size": session.dimensione if session.dimensione else "Non specificato"
        }
        
        # ✅ USA IL NUOVO MODULO AI PER INSIGHTS
        insights = get_sector_insights(results, company_context)
        
        return {
            "session_id": str(session_id),
            "company": company_context,
            "sector_insights": insights,
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Errore sector insights: {e}")
        raise HTTPException(status_code=500, detail=f"Errore insights settoriali: {str(e)}")

@router.get("/assessment/{session_id}/smart-recommendations")
def smart_recommendations_combined(session_id: UUID, include_insights: bool = True, db: Session = Depends(database.get_db)):
    """Endpoint combinato: raccomandazioni AI + insights settoriali"""
    try:
        print(f"🎯 SMART RECOMMENDATIONS: Combinato per {session_id}")
        
        # Carica sessione e risultati
        session = db.query(models.AssessmentSession).filter(
            models.AssessmentSession.id == session_id
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        results = db.query(models.AssessmentResult).filter(
            models.AssessmentResult.session_id == session_id,
            models.AssessmentResult.is_not_applicable.is_(False)
        ).all()
        
        if not results:
            raise HTTPException(status_code=404, detail="No applicable results found")
        
        # Prepara dati
        session_data = {
            "azienda_nome": session.azienda_nome,
            "settore": session.settore,
            "dimensione": session.dimensione,
            "referente": session.referente,
            "email": session.email
        }
        
        company_context = {
            "name": session.azienda_nome,
            "sector": session.settore if session.settore else "Non specificato", 
            "size": session.dimensione if session.dimensione else "Non specificato"
        }
        
        # ✅ COMBINA RACCOMANDAZIONI + INSIGHTS
        recommendations = get_ai_recommendations_advanced(str(session_id), results, session_data)
        
        response = {
            "session_id": str(session_id),
            "company": company_context,
            "recommendations": recommendations,
            "generated_at": datetime.now().isoformat()
        }
        
        if include_insights:
            insights = get_sector_insights(results, company_context)
            response["sector_insights"] = insights
        
        return response
        
    except Exception as e:
        print(f"❌ Errore smart recommendations: {e}")
        raise HTTPException(status_code=500, detail=f"Errore raccomandazioni smart: {str(e)}")

# ============================================================================
# 🔧 ENDPOINT CONFIGURAZIONE E STATUS AI
# ============================================================================

@router.get("/ai-status")
def check_ai_status():
    """Verifica stato configurazione AI"""
    try:
        openai_key = os.getenv("OPENAI_API_KEY")
        openai_model = os.getenv("OPENAI_MODEL", "gpt-4")
        
        if not openai_key:
            return {
                "status": "NOT_CONFIGURED",
                "ai_available": False,
                "message": "OpenAI API key non configurata",
                "instructions": [
                    "1. Aggiungere OPENAI_API_KEY al file .env",
                    "2. Opzionalmente impostare OPENAI_MODEL (default: gpt-4)", 
                    "3. Riavviare il server"
                ],
                "endpoints_affected": [
                    "/ai-recommendations-advanced",
                    "/smart-recommendations", 
                    "/ai-suggestions-enhanced"
                ]
            }
        
        # Test connessione OpenAI
        try:
            import openai as openai_test
            openai_test.api_key = openai_key
            
            # Test molto leggero - solo list models
            models = openai_test.models.list()
            
            return {
                "status": "CONFIGURED",
                "ai_available": True,
                "model": openai_model,
                "message": "✅ Sistema AI configurato e funzionante",
                "api_key_length": len(openai_key),
                "api_key_prefix": openai_key[:7] + "..." if len(openai_key) > 10 else "***",
                "supported_features": [
                    "Raccomandazioni settore-specifiche",
                    "Analisi predittiva ROI",
                    "Roadmap implementazione",
                    "Priority matrix intelligente"
                ]
            }
            
        except Exception as e:
            return {
                "status": "CONFIGURED_BUT_ERROR",
                "ai_available": False,
                "message": f"Chiave configurata ma errore connessione: {str(e)}",
                "possible_causes": [
                    "Chiave API non valida",
                    "Crediti OpenAI esauriti",
                    "Problemi di connessione internet",
                    "Rate limit temporaneo"
                ]
            }
            
    except Exception as e:
        return {
            "status": "ERROR",
            "ai_available": False,
            "message": f"Errore verifica AI: {str(e)}"
        }

@router.get("/ai-requirements")
def ai_requirements():
    """Informazioni sui requisiti AI"""
    return {
        "required_dependencies": [
            "openai>=1.0.0"
        ],
        "environment_variables": {
            "OPENAI_API_KEY": {
                "required": True,
                "description": "Chiave API OpenAI per raccomandazioni",
                "format": "sk-proj-xxx o sk-xxx",
                "where_to_get": "https://platform.openai.com/api-keys"
            },
            "OPENAI_MODEL": {
                "required": False,
                "description": "Modello OpenAI da utilizzare",
                "default": "gpt-4",
                "alternatives": ["gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
                "recommendation": "gpt-4o-mini per costi ridotti, gpt-4 per qualità massima"
            }
        },
        "estimated_costs": {
            "gpt-4": "~$0.20-0.40 per raccomandazione completa",
            "gpt-4o-mini": "~$0.05-0.10 per raccomandazione completa",
            "note": "Costi variano in base alla lunghezza dell'analisi"
        },
        "setup_instructions": [
            "1. pip install openai>=1.0.0",
            "2. Ottenere API key da https://platform.openai.com",
            "3. Aggiungere OPENAI_API_KEY=sk-xxx al file .env",
            "4. Opzionale: OPENAI_MODEL=gpt-4o-mini per risparmiare",
            "5. Riavviare il server"
        ]
    }

# ============================================================================
# 🧪 ENDPOINT DI TEST AI - PER VERIFICARE INTEGRAZIONE
# ============================================================================


@router.get("/test-ai-integration")
def test_ai_integration():
    """Test integrazione modulo AI - VERSIONE AI-ONLY"""
    try:
        # Controllo base configurazione
        ai_status = check_ai_status()
        
        if not ai_status["ai_available"]:
            return {
                "status": "FAILED",
                "reason": "AI_NOT_AVAILABLE",
                "ai_status": ai_status,
                "message": "❌ Test fallito: Sistema AI non configurato correttamente"
            }
        
        # Test import modulo
        try:
            from .ai_recommendations import AIRecommendationEngine
            engine = AIRecommendationEngine()
            
            return {
                "status": "SUCCESS",
                "message": "✅ Sistema AI integrato e configurato correttamente",
                "ai_status": ai_status,
                "module_info": {
                    "engine_initialized": True,
                    "openai_configured": bool(engine.openai_api_key),
                    "model": engine.model,
                    "sectors_supported": [
                        "automotive", "food", "machinery", "electronics", 
                        "pharmaceutical", "textile",
                        "turismo", "hospitality", "hotel", "restaurant", "travel"
                    ],
                    "ai_features": [
                        "Sector-specific recommendations",
                        "ROI predictions", 
                        "Implementation roadmap",
                        "Priority matrix",
                        "Benchmark comparison"
                    ]
                },
                "endpoints_ready": [
                    "/ai-recommendations-advanced ✅",
                    "/sector-insights-advanced ✅", 
                    "/smart-recommendations ✅",
                    "/enhanced-summary ✅"
                ]
            }
            
        except ImportError as e:
            return {
                "status": "FAILED",
                "reason": "IMPORT_ERROR",
                "message": f"❌ Errore import modulo AI: {str(e)}",
                "solution": "Verificare che app/ai_recommendations.py sia presente"
            }
            
    except Exception as e:
        return {
            "status": "FAILED",
            "reason": "SYSTEM_ERROR",
            "message": f"❌ Errore test: {str(e)}",
            "traceback": traceback.format_exc()
        }


@router.get("/sectors-supported")
def list_supported_sectors():
    """Lista settori supportati dal sistema AI"""
    return {
        "supported_sectors": {
            "manifatturiero": {
                "automotive": "🚗 Automotive & Mobilità",
                "machinery": "⚙️ Machinery & Equipment", 
                "food": "🍕 Food & Beverage",
                "electronics": "💻 Electronics & Tech",
                "pharmaceutical": "💊 Pharmaceutical",
                "textile": "🧵 Textile & Fashion"
            },
            "servizi": {
                "turismo": "🏨 Turismo & Hospitality",
                "hospitality": "🛎️ Hospitality & Hotel",
                "restaurant": "🍽️ Restaurant & F&B",
                "travel": "✈️ Travel & Tourism",
                "entertainment": "🎭 Entertainment & Events"
            }
        },
        "ai_features": {
            "sector_specific_recommendations": True,
            "roi_predictions": True,
            "implementation_roadmap": True,
            "benchmark_comparison": True,
            "priority_matrix": True
        },
        "turismo_specific_features": {
            "revenue_management_focus": True,
            "customer_experience_optimization": True,
            "booking_system_integration": True,
            "kpis": ["RevPAR", "ADR", "Occupancy", "Guest Satisfaction"],
            "technologies": ["PMS", "Channel Manager", "CRM", "Revenue Management"]
        }
    }


# ============================================================================
# 📊 ENDPOINT MIGLIORATO PER STATISTICHE - VERSIONE CON AI
# ============================================================================

# ============================================================================
# 📊 ENDPOINT MIGLIORATO PER STATISTICHE - VERSIONE CON AI
# ============================================================================

@router.get("/assessment/{session_id}/enhanced-summary")
def enhanced_summary_with_ai(session_id: UUID, db: Session = Depends(database.get_db)):
    """Summary potenziato con preview raccomandazioni AI"""
    try:
        print(f"📊 ENHANCED SUMMARY: Per sessione {session_id}")
        
        # Usa la funzione summary esistente come base
        base_summary = assessment_summary(session_id, db)
        
        # Carica sessione per contesto AI
        session = db.query(models.AssessmentSession).filter(
            models.AssessmentSession.id == session_id
        ).first()
        
        if session and base_summary.get("applicable_questions", 0) > 0:
            # Aggiungi preview AI se ci sono dati applicabili
            sector = session.settore if session.settore else "Generico"
            overall_score = base_summary["overall_score"]
            
            # Preview raccomandazioni senza chiamata completa AI
            ai_preview = generate_quick_ai_preview(overall_score, sector, base_summary)
            
            # Arricchisci summary
            enhanced_summary = {
                **base_summary,
                "ai_preview": ai_preview,
                "company_info": {
                    "name": session.azienda_nome,
                    "sector": sector,
                    "size": session.dimensione
                },
                "recommendations_available": True,
                "next_steps": get_suggested_next_steps(overall_score, sector)
            }
            
            return enhanced_summary
        
        return base_summary
        
    except Exception as e:
        print(f"❌ Errore enhanced summary: {e}")
        # Fallback al summary base se AI non funziona
        return assessment_summary(session_id, db)

def generate_quick_ai_preview(overall_score: float, sector: str, summary_data: Dict) -> Dict:
    """Genera preview veloce raccomandazioni senza OpenAI"""
    
    # Identifica focus settoriale
    if any(keyword in sector.lower() for keyword in ["turismo", "hospitality", "hotel"]):
        sector_focus = {
            "primary_areas": ["Customer Experience", "Revenue Management", "Digital Booking"],
            "key_technologies": ["PMS Integration", "Channel Manager", "Mobile App"],
            "expected_roi": "6-15 mesi payback",
            "sector_icon": "🏨"
        }
    elif "automotive" in sector.lower():
        sector_focus = {
            "primary_areas": ["Manufacturing Excellence", "Quality Control", "Supply Chain"],
            "key_technologies": ["IoT Sensors", "Predictive Maintenance", "Digital Twin"],
            "expected_roi": "8-18 mesi payback", 
            "sector_icon": "🚗"
        }
    else:
        sector_focus = {
            "primary_areas": ["Process Optimization", "Quality Management", "Digital Integration"],
            "key_technologies": ["ERP Integration", "Data Analytics", "Automation"],
            "expected_roi": "12-18 mesi payback",
            "sector_icon": "🏭"
        }
    
    # Determina priorità basata su score
    if overall_score < 2.5:
        priority_level = "🔴 CRITICO - Azione immediata richiesta"
        investment_range = "€20,000 - €50,000"
    elif overall_score < 3.5:
        priority_level = "🟡 MEDIO - Miglioramenti necessari"
        investment_range = "€15,000 - €35,000"
    else:
        priority_level = "🟢 BUONO - Ottimizzazioni incrementali"
        investment_range = "€8,000 - €20,000"
    
    return {
        "sector_focus": sector_focus,
        "priority_level": priority_level,
        "investment_estimate": investment_range,
        "confidence": "PREVIEW" if overall_score > 0 else "LOW",
        "full_analysis_available": True
    }

def get_suggested_next_steps(overall_score: float, sector: str) -> List[str]:
    """Suggerisce prossimi step basati su score e settore"""
    
    base_steps = []
    
    if overall_score < 2.5:
        base_steps.extend([
            "🔥 Identificare e risolvere i punti critici più urgenti",
            "📊 Ottenere raccomandazioni AI dettagliate",
            "💰 Pianificare budget per interventi prioritari"
        ])
    elif overall_score < 3.5:
        base_steps.extend([
            "📈 Analizzare aree di miglioramento con maggiore impatto", 
            "🎯 Implementare roadmap di trasformazione digitale",
            "📊 Monitorare progressi con KPI specifici"
        ])
    else:
        base_steps.extend([
            "🚀 Ottimizzare processi già performanti",
            "🏆 Puntare all'eccellenza nel settore",
            "💡 Esplorare tecnologie innovative"
        ])
    
    # Step specifici per turismo
    if any(keyword in sector.lower() for keyword in ["turismo", "hospitality", "hotel"]):
        base_steps.append("🏨 Focus su Customer Experience e Revenue Optimization")
    
    return base_steps

# ============================================================================
# 📝 AGGIORNA ANCHE L'ENDPOINT ai-suggestions ESISTENTE
# ============================================================================

# Sostituisci l'endpoint ai-suggestions esistente con questa versione migliorata:

@router.get("/assessment/{session_id}/ai-suggestions-enhanced")
def ai_suggestions_enhanced(session_id: UUID, include_roadmap: bool = False, db: Session = Depends(database.get_db)):
    """Versione migliorata dell'endpoint ai-suggestions originale"""
    try:
        print(f"🤖 AI SUGGESTIONS ENHANCED: Per sessione {session_id}")
        
        # Carica risultati applicabili (come versione originale)
        results = db.query(models.AssessmentResult).filter(
            models.AssessmentResult.session_id == session_id,
            models.AssessmentResult.is_not_applicable.is_(False)
        ).all()

        if not results:
            raise HTTPException(status_code=404, detail="No applicable assessment results found")

        # Mantieni compatibilità con versione originale
        critical_areas = [
            {
                "process": r.process,
                "category": r.category,
                "dimension": r.dimension,
                "score": r.score,
                "note": r.note
            }
            for r in results if r.score < 3
        ]
        
        if not critical_areas:
            return {
                "message": "Nessuna area critica rilevata nelle domande applicabili",
                "critical_count": 0,
                "suggestions": "🎉 Ottimo lavoro! Tutti i punteggi applicabili sono accettabili.",
                "enhanced_available": True
            }

        # Se disponibile, usa il modulo AI avanzato
        try:
            session = db.query(models.AssessmentSession).filter(
                models.AssessmentSession.id == session_id
            ).first()
            
            if session and include_roadmap:
                session_data = {
                    "azienda_nome": session.azienda_nome,
                    "settore": session.settore,
                    "dimensione": session.dimensione
                }
                
                # Usa il modulo AI avanzato
                advanced_recommendations = get_ai_recommendations_advanced(
                    str(session_id), results, session_data
                )
                
                return {
                    "critical_count": len(critical_areas),
                    "suggestions": advanced_recommendations["ai_recommendations"]["content"],
                    "enhanced_mode": True,
                    "roadmap_included": True,
                    "priority_matrix": advanced_recommendations["priority_matrix"],
                    "roi_predictions": advanced_recommendations["roi_predictions"]
                }
        
        except Exception as e:
            print(f"⚠️ Fallback to basic AI: {e}")
        
        # Fallback alla versione originale migliorata
        if not openai.api_key:
            return {
                "critical_count": len(critical_areas),
                "suggestions": "⚠️ API OpenAI non configurata. Configurare OPENAI_API_KEY per suggerimenti personalizzati.",
                "enhanced_available": False
            }

        # Prompt migliorato rispetto all'originale
        prompt = f"""Sei un esperto di trasformazione digitale per aziende italiane.

AREE CRITICHE IDENTIFICATE ({len(critical_areas)} su {len(results)} domande applicabili):
"""
        
        for item in critical_areas:
            prompt += f"\n🔴 [{item['process']}] {item['category']} → {item['dimension']} (Punteggio: {item['score']}/5)\n"
            if item['note']:
                prompt += f"  💬 Nota: {item['note']}\n"

        prompt += """
Per ogni area critica, fornisci raccomandazioni specifiche e actionable.
Rispondi in italiano, tono professionale ma accessibile."""

        try:
            response = openai.chat.completions.create(
                model=os.getenv("OPENAI_MODEL", "gpt-4"),
                messages=[
                    {"role": "system", "content": "Sei un consulente di trasformazione digitale per PMI italiane."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=2000,
                temperature=0.7
            )
            
            return {
                "critical_count": len(critical_areas),
                "suggestions": response.choices[0].message.content,
                "enhanced_mode": False,
                "model_used": os.getenv("OPENAI_MODEL", "gpt-4")
            }
            
        except Exception as e:
            print(f"❌ Errore OpenAI enhanced: {e}")
            return {
                "critical_count": len(critical_areas),
                "suggestions": f"⚠️ Errore generazione AI: {str(e)}\n\n{len(critical_areas)} aree critiche identificate necessitano attenzione.",
                "enhanced_available": False
            }
            
    except Exception as e:
        print(f"❌ Errore ai_suggestions_enhanced: {e}")
        raise HTTPException(status_code=500, detail=f"Errore suggerimenti: {str(e)}")

print("✅ Modifiche radar.py con integrazione AI module completate!")
print("🏨 Supporto settore TURISMO attivato!")
print("🤖 Endpoints AI avanzati disponibili:")
print("   - /ai-recommendations-advanced")
print("   - /sector-insights-advanced") 
print("   - /smart-recommendations")
print("   - /enhanced-summary")
