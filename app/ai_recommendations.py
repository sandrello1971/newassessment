from fastapi import HTTPException
# app/ai_recommendations.py - Sistema di Raccomandazioni AI Avanzato
"""
Sistema di raccomandazioni AI avanzato per Assessment Digitale 4.0
Modulo specializzato per analisi predittiva e raccomandazioni intelligenti
"""

import json
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import openai
from datetime import datetime
from sqlalchemy.orm import Session
from . import models
import os
import traceback

class PriorityLevel(Enum):
    CRITICAL = "critical"      # 0-1.5: Intervento immediato
    HIGH = "high"             # 1.5-2.5: Importante
    MEDIUM = "medium"         # 2.5-3.5: Miglioramento
    LOW = "low"              # 3.5+: Ottimizzazione

class RecommendationType(Enum):
    IMMEDIATE_ACTION = "immediate_action"
    STRATEGIC_PLAN = "strategic_plan"
    TECHNOLOGY_UPGRADE = "technology_upgrade"
    TRAINING = "training"
    PROCESS_OPTIMIZATION = "process_optimization"
    INVESTMENT = "investment"

@dataclass
class SmartRecommendation:
    id: str
    area: str
    dimension: str
    current_score: float
    target_score: float
    priority: PriorityLevel
    type: RecommendationType
    title: str
    description: str
    impact_prediction: float
    effort_required: str
    timeline: str
    estimated_cost: str
    success_metrics: List[str]
    roi_estimate: Dict[str, Any]

class AIRecommendationEngine:
    """Engine principale per raccomandazioni AI"""
    
    def __init__(self):
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.model = os.getenv("OPENAI_MODEL", "gpt-4")
        if self.openai_api_key:
            openai.api_key = self.openai_api_key
    
    def generate_advanced_recommendations(self, session_id: str, results: List, session_data: Dict) -> Dict:
        """Genera raccomandazioni avanzate complete - RICHIEDE OpenAI"""
        try:
            print(f"🤖 AI ENGINE: Iniziando analisi avanzata per sessione {session_id}")
            
            # ✅ CONTROLLO OBBLIGATORIO OpenAI
            if not self.openai_api_key:
                raise HTTPException(
                    status_code=503, 
                    detail="❌ Sistema AI non configurato. OPENAI_API_KEY richiesta per raccomandazioni."
                )
            
            company_context = self._extract_company_context(session_data)
            analysis = self._perform_advanced_analysis(results, company_context)
            
            # ✅ SEMPRE AI - nessun fallback automatico
            ai_recommendations = self._generate_smart_recommendations(analysis, company_context)
            
            # Verifica che AI abbia funzionato
            if ai_recommendations.get("error", False):
                raise HTTPException(
                    status_code=503,
                    detail="❌ Errore generazione AI. Verificare configurazione OPENAI_API_KEY e crediti disponibili."
                )
            
            return {
                "session_id": session_id,
                "company": company_context,
                "analysis_summary": analysis["summary"],
                "priority_matrix": analysis["priority_matrix"],
                "ai_recommendations": ai_recommendations,
                "implementation_roadmap": analysis["roadmap"],
                "roi_predictions": analysis["roi_predictions"],
                "benchmark_comparison": analysis["benchmark"],
                "sector_insights": self._generate_sector_insights(results, company_context),
                "ai_powered": True,  # ✅ Sempre AI
                "generated_at": datetime.now().isoformat()
            }
            
        except HTTPException:
            # Re-raise HTTP exceptions (API key missing, etc.)
            raise
        except Exception as e:
            print(f"❌ Errore AI Engine: {e}")
            print(f"❌ Traceback: {traceback.format_exc()}")
            raise HTTPException(
                status_code=500,
                detail=f"❌ Errore sistema AI: {str(e)}"
            )
    
    def _extract_company_context(self, session_data: Dict) -> Dict:
        """Estrae contesto aziendale dalla sessione"""
        return {
            "name": session_data.get("azienda_nome", "Azienda"),
            "sector": session_data.get("settore", "Non specificato"),
            "size": session_data.get("dimensione", "Non specificato"),
            "referente": session_data.get("referente"),
            "email": session_data.get("email")
        }
    
    def _extract_employee_count(self, size_string: str) -> Dict[str, Any]:
        """Estrae informazioni sui dipendenti dalla stringa dimensione"""
        size_map = {
            "Micro (1-9 dipendenti)": {"min": 1, "max": 9, "category": "MICRO", "label": "Microimpresa"},
            "Piccola (10-49 dipendenti)": {"min": 10, "max": 49, "category": "PICCOLA", "label": "Piccola Impresa"},
            "Media (50-249 dipendenti)": {"min": 50, "max": 249, "category": "MEDIA", "label": "Media Impresa"},
            "Grande (250+ dipendenti)": {"min": 250, "max": 1000, "category": "GRANDE", "label": "Grande Impresa"}
        }
        
        for key, value in size_map.items():
            if key.lower() in size_string.lower():
                employee_range = f"{value['min']}-{value['max']}" if value["max"] < 1000 else f"{value['min']}+"
                avg_count = (value["min"] + value["max"]) // 2 if value["max"] < 1000 else 500
                return {
                    "range": employee_range,
                    "avg_employees": avg_count,
                    "category": value["category"],
                    "label": value["label"]
                }
        
        return {
            "range": "Non specificato",
            "avg_employees": 25,
            "category": "PICCOLA",
            "label": "Piccola Impresa"
        }

    def _perform_advanced_analysis(self, results, company_context):
        """Esegue analisi multi-dimensionale avanzata"""
        print("🔍 Eseguendo analisi multi-dimensionale...")
        
        # Organizza dati per processo e categoria
        data_by_process = {}
        all_scores = []
        critical_areas = []      # score <= 1.0
        weak_areas = []          # 1.0 < score < 2.0
        strong_areas = []        # score > 3.0
        
        for result in results:
            process = result.process
            if process not in data_by_process:
                data_by_process[process] = {
                    "categories": {},
                    "scores": [],
                    "avg_score": 0
                }
            
            data_by_process[process]["categories"][result.category] = {
                "dimension": result.dimension,
                "score": result.score,
                "note": result.note
            }
            data_by_process[process]["scores"].append(result.score)
            all_scores.append(result.score)
            
            area_data = {
                "process": process,
                "category": result.category,
                "dimension": result.dimension,
                "score": result.score,
                "criticality": self._get_criticality_level(result.score),
                "impact_weight": self._calculate_impact_weight(process, result.category),
                "note": result.note
            }
            
            # Classifica in base allo score
            if result.score <= 1.0:
                critical_areas.append(area_data)
            elif result.score < 2.0:
                weak_areas.append(area_data)
            elif result.score > 3.0:
                strong_areas.append(area_data)
        
        # Calcola medie per processo
        for process in data_by_process:
            scores = data_by_process[process]["scores"]
            data_by_process[process]["avg_score"] = sum(scores) / len(scores) if scores else 0
        
        overall_avg = sum(all_scores) / len(all_scores) if all_scores else 0
        
        # Componenti analisi avanzata
        priority_matrix = self._create_priority_matrix(critical_areas, data_by_process)
        roadmap = self._create_implementation_roadmap(priority_matrix, company_context)
        roi_predictions = self._calculate_roi_predictions(priority_matrix, company_context)
        benchmark = self._create_sector_benchmark(overall_avg, company_context["sector"])
        
        return {
            "summary": {
                "overall_score": round(overall_avg, 2),
                "total_processes": len(data_by_process),
                "critical_areas_count": len(critical_areas),
                "weak_areas_count": len(weak_areas),
                "strong_areas_count": len(strong_areas),
                "maturity_level": self._get_maturity_level(overall_avg),
                "strongest_process": max(data_by_process.items(), key=lambda x: x[1]["avg_score"])[0] if data_by_process else None,
                "weakest_process": min(data_by_process.items(), key=lambda x: x[1]["avg_score"])[0] if data_by_process else None
            },
            "priority_matrix": priority_matrix,
            "roadmap": roadmap,
            "roi_predictions": roi_predictions,
            "benchmark": benchmark,
            "detailed_data": data_by_process,
            "weak_areas": weak_areas,
            "strong_areas": strong_areas,
        }
    
    def _get_criticality_level(self, score):
        """Determina livello di criticità sofisticato"""
        if score < 1.5:
            return {"level": "CRITICO", "urgency": "IMMEDIATA", "color": "#DC2626"}
        elif score < 2.0:
            return {"level": "ALTO", "urgency": "ALTA", "color": "#EA580C"}
        elif score < 2.5:
            return {"level": "MEDIO", "urgency": "MEDIA", "color": "#D97706"}
        elif score < 3.0:
            return {"level": "BASSO", "urgency": "BASSA", "color": "#65A30D"}
        else:
            return {"level": "OK", "urgency": "NESSUNA", "color": "#16A34A"}
    
    def _calculate_impact_weight(self, process, category):
        """Calcola peso impatto basato su processo e categoria"""
        # Pesi strategici per processi Industry 4.0
        process_weights = {
            "DESIGN & ENGINEERING": 0.9,
            "PROCUREMENT": 0.7,
            "PLANNING & SCHEDULING": 0.8,
            "MANUFACTURING": 0.95,  # Critico per Industry 4.0
            "QUALITY MANAGEMENT": 0.85,
            "LOGISTICS": 0.75,
            "SALES": 0.6,
            "CUSTOMER SERVICE": 0.65,
            "gestione customer satisfaction": 0.65,
            # ✅ TURISMO - AGGIUNTI PROCESSI SPECIFICI
            "GUEST EXPERIENCE": 0.9,           # Critico per turismo
            "BOOKING & RESERVATION": 0.85,     # Fondamentale
            "REVENUE MANAGEMENT": 0.8,         # Importante per ROI
            "FACILITY MANAGEMENT": 0.7,        # Gestione strutture
            "FOOD & BEVERAGE": 0.75,          # Se applicabile
            "EVENT MANAGEMENT": 0.7,           # Eventi e meeting
        }
        
        # Pesi per categoria
        category_weights = {
            "Technology": 0.9,     # Tecnologia è critica per 4.0  
            "ICT": 0.9,
            "Organization": 0.7,   # Organizzazione importante
            "Process": 0.8,        # Processi fondamentali
            "Governance": 0.75,    # Governance necessaria
            "Monitoring": 0.8,     # Controllo essenziale
            "Control": 0.8,
            # ✅ TURISMO - CATEGORIE SPECIFICHE
            "Digital Experience": 0.95,    # Esperienza digitale cliente
            "Customer Journey": 0.9,       # Percorso cliente
            "Revenue Optimization": 0.85,  # Ottimizzazione ricavi
            "Service Quality": 0.8,        # Qualità servizio
        }
        
        base_weight = process_weights.get(process, 0.5)
        
        # Trova peso categoria
        cat_weight = 0.5
        for key, weight in category_weights.items():
            if key.lower() in category.lower():
                cat_weight = weight
                break
        
        return (base_weight + cat_weight) / 2
    
    def _create_priority_matrix(self, critical_areas, data_by_process):
        """Crea matrice di priorità intelligente"""
        priority_items = []
        
        for area in critical_areas:
            # Calcola punteggio priorità composito
            urgency_score = (3 - area["score"]) * area["impact_weight"]
            
            # Fattori aggiuntivi
            process_health = data_by_process[area["process"]]["avg_score"]
            synergy_factor = 1.2 if urgency_score > 1.5 else 1.0
            
            final_priority = urgency_score * synergy_factor
            
            priority_items.append({
                "process": area["process"],
                "category": area["category"], 
                "dimension": area["dimension"],
                "current_score": area["score"],
                "target_score": min(5, area["score"] + 1.5),
                "priority_score": round(final_priority, 2),
                "criticality": area["criticality"],
                "effort_estimate": self._estimate_effort(area["score"], area["category"]),
                "impact_potential": self._calculate_impact_potential(area["score"], area["impact_weight"]),
                "note": area["note"]
            })
        
        priority_items.sort(key=lambda x: x["priority_score"], reverse=True)
        
        return {
            "high_priority": [item for item in priority_items if item["priority_score"] > 1.5],
            "medium_priority": [item for item in priority_items if 1.0 <= item["priority_score"] <= 1.5],
            "low_priority": [item for item in priority_items if item["priority_score"] < 1.0],
            "total_items": len(priority_items)
        }
    
    def _estimate_effort(self, score, category):
        """Stima sforzo necessario"""
        base_effort = 3 - score
        
        if "Technology" in category or "ICT" in category:
            multiplier = 1.3
        elif "Organization" in category:
            multiplier = 1.1
        elif "Digital Experience" in category:  # ✅ TURISMO
            multiplier = 1.2
        else:
            multiplier = 1.0
        
        effort_value = base_effort * multiplier
        
        if effort_value > 2.0:
            return {"level": "ALTO", "months": "6-12", "color": "#DC2626"}
        elif effort_value > 1.2:
            return {"level": "MEDIO", "months": "3-6", "color": "#D97706"}
        else:
            return {"level": "BASSO", "months": "1-3", "color": "#16A34A"}
    
    def _calculate_impact_potential(self, score, impact_weight):
        """Calcola potenziale impatto miglioramento"""
        improvement_potential = (5 - score) * impact_weight
        
        if improvement_potential > 2.5:
            return {"level": "ALTO", "description": "Trasformazione significativa", "color": "#16A34A"}
        elif improvement_potential > 1.5:
            return {"level": "MEDIO", "description": "Miglioramento sostanziale", "color": "#D97706"}
        else:
            return {"level": "BASSO", "description": "Ottimizzazione incrementale", "color": "#6B7280"}
    
    def _create_implementation_roadmap(self, priority_matrix, company_context):
        """Crea roadmap di implementazione intelligente"""
        high_priority = priority_matrix["high_priority"]
        medium_priority = priority_matrix["medium_priority"][:3]
        
        roadmap = {
            "phase_1": {
                "title": "Azioni Immediate (0-3 mesi)",
                "description": "Interventi critici per stabilizzare le aree più deboli",
                "actions": [],
                "expected_improvement": 0
            },
            "phase_2": {
                "title": "Consolidamento (3-6 mesi)", 
                "description": "Rafforzamento delle basi per trasformazione digitale",
                "actions": [],
                "expected_improvement": 0
            },
            "phase_3": {
                "title": "Ottimizzazione (6-12 mesi)",
                "description": "Raggiungimento eccellenza operativa",
                "actions": [],
                "expected_improvement": 0
            }
        }
        
        # Popolamento fasi
        total_improvement_1 = 0
        for item in high_priority:
            if item["effort_estimate"]["level"] in ["BASSO", "MEDIO"]:
                action = self._create_action_item(item, 1)
                roadmap["phase_1"]["actions"].append(action)
                total_improvement_1 += (item["target_score"] - item["current_score"])
        
        roadmap["phase_1"]["expected_improvement"] = round(total_improvement_1, 1)
        
        # Fase 2 e 3 simili...
        
        return roadmap
    
    def _create_action_item(self, priority_item, phase):
        """Crea item azione specifico"""
        return {
            "title": f"Migliorare {priority_item['dimension'][:50]}...",
            "process": priority_item["process"],
            "category": priority_item["category"],
            "current_score": priority_item["current_score"],
            "target_score": priority_item["target_score"],
            "effort": priority_item["effort_estimate"],
            "impact": priority_item["impact_potential"],
            "phase": phase
        }
    
    def _calculate_roi_predictions(self, priority_matrix, company_context):
        """Calcola predizioni ROI per settore"""
        company_size = company_context["size"].lower()
        sector = company_context["sector"].lower()
        
        # Moltiplicatori per dimensione
        size_multipliers = {
            "micro": 0.5, "piccola": 0.7, "media": 1.0, "grande": 1.5
        }
        
        # ✅ MOLTIPLICATORI SETTORIALI - INCLUSO TURISMO
        sector_multipliers = {
            "automotive": 1.3,
            "machinery": 1.2,
            "food": 1.0,
            "pharmaceutical": 1.4,
            "electronics": 1.3,
            "turismo": 0.8,        # ✅ Turismo: investimenti più contenuti ma ROI rapido
            "hospitality": 0.8,    # ✅ Sinonimo turismo
            "hotel": 0.8,          # ✅ Specifico hotel
            "restaurant": 0.7,     # ✅ Ristorazione
            "travel": 0.8,         # ✅ Viaggi
        }
        
        size_mult = size_multipliers.get(next((k for k in size_multipliers if k in company_size), "media"), 1.0)
        sector_mult = sector_multipliers.get(next((k for k in sector_multipliers if k in sector), "default"), 1.0)
        
        high_priority_items = len(priority_matrix["high_priority"])
        medium_priority_items = len(priority_matrix["medium_priority"])
        
        base_investment = (high_priority_items * 15000 + medium_priority_items * 8000)
        investment_estimate = base_investment * size_mult * sector_mult
        
        # ✅ BENEFICI SPECIFICI PER TURISMO
        if any(keyword in sector for keyword in ["turismo", "hospitality", "hotel", "travel"]):
            benefits = {
                "productivity_increase": f"{(high_priority_items * 0.12 + medium_priority_items * 0.08) * 100:.1f}%",
                "customer_satisfaction": f"{(high_priority_items * 0.18 + medium_priority_items * 0.12) * 100:.1f}%",
                "booking_conversion": f"{(high_priority_items * 0.15 + medium_priority_items * 0.10) * 100:.1f}%",
                "operational_efficiency": f"{(high_priority_items * 0.20 + medium_priority_items * 0.15) * 100:.1f}%"
            }
            payback = {"optimistic": "6-9 mesi", "realistic": "9-15 mesi", "pessimistic": "15-24 mesi"}
        else:
            benefits = {
                "productivity_increase": f"{(high_priority_items * 0.15 + medium_priority_items * 0.08) * 100:.1f}%",
                "error_reduction": f"{(high_priority_items * 0.2 + medium_priority_items * 0.1) * 100:.1f}%",
                "time_savings": f"{(high_priority_items * 0.25 + medium_priority_items * 0.15) * 100:.1f}%"
            }
            payback = {"optimistic": "8-12 mesi", "realistic": "12-18 mesi", "pessimistic": "18-24 mesi"}
        
        return {
            "investment_range": {
                "min": int(investment_estimate * 0.7),
                "max": int(investment_estimate * 1.3),
                "currency": "EUR"
            },
            "expected_benefits": benefits,
            "payback_period": payback,
            "sector_adjustment": f"Moltiplicatore {sector}: {sector_mult}x",
            "confidence_level": "MEDIO" if high_priority_items < 5 else "ALTO"
        }
    
    def _create_sector_benchmark(self, overall_score, sector):
        """Benchmark settoriale con turismo"""
        # ✅ BENCHMARK SETTORIALI - INCLUSO TURISMO
        sector_benchmarks = {
            "automotive": {"avg": 3.2, "excellence": 4.1},
            "aerospace": {"avg": 3.4, "excellence": 4.3},
            "machinery": {"avg": 2.9, "excellence": 3.8},
            "electronics": {"avg": 3.5, "excellence": 4.4},
            "food": {"avg": 2.7, "excellence": 3.6},
            "pharmaceutical": {"avg": 3.1, "excellence": 4.0},
            "textile": {"avg": 2.5, "excellence": 3.4},
            # ✅ TURISMO E SETTORI CORRELATI
            "turismo": {"avg": 2.8, "excellence": 3.9},
            "hospitality": {"avg": 2.8, "excellence": 3.9},
            "hotel": {"avg": 2.9, "excellence": 4.0},
            "restaurant": {"avg": 2.6, "excellence": 3.7},
            "travel": {"avg": 2.7, "excellence": 3.8},
            "entertainment": {"avg": 2.8, "excellence": 3.9},
            "default": {"avg": 3.0, "excellence": 3.9}
        }
        
        sector_key = "default"
        sector_lower = sector.lower()
        
        for key in sector_benchmarks.keys():
            if key in sector_lower:
                sector_key = key
                break
        
        benchmark_data = sector_benchmarks[sector_key]
        
        # Determina posizione
        if overall_score >= benchmark_data["excellence"]:
            position = "ECCELLENTE"
        elif overall_score >= benchmark_data["avg"] + 0.3:
            position = "SOPRA LA MEDIA"
        elif overall_score <= benchmark_data["avg"] - 0.3:
            position = "SOTTO LA MEDIA"
        else:
            position = "NELLA MEDIA"
        
        return {
            "sector": sector,
            "your_score": overall_score,
            "sector_average": benchmark_data["avg"],
            "excellence_threshold": benchmark_data["excellence"],
            "position": position,
            "gap_to_excellence": round(benchmark_data["excellence"] - overall_score, 2),
            "percentile_estimate": max(10, min(90, int((overall_score / 5) * 100)))
        }
    
    def _get_maturity_level(self, score):
        """Determina livello maturità digitale"""
        if score >= 4.0:
            return {"level": "LEADER DIGITALE", "description": "Eccellenza Industry 4.0", "color": "#059669"}
        elif score >= 3.5:
            return {"level": "AVANZATO", "description": "Solida base digitale", "color": "#0891B2"}
        elif score >= 3.0:
            return {"level": "INTERMEDIO", "description": "In crescita digitale", "color": "#0284C7"}
        elif score >= 2.5:
            return {"level": "BASE", "description": "Primi passi digitali", "color": "#EAB308"}
        else:
            return {"level": "PRINCIPIANTE", "description": "Trasformazione necessaria", "color": "#DC2626"}
    
    def _get_size_specific_context(self, size_category: str) -> str:
        """Restituisce contesto specifico per dimensione aziendale"""
        contexts = {
            "MICRO": """
- Budget limitato: privilegiare soluzioni low-cost e cloud
- Risorse umane ridotte: focus su automazione e outsourcing
- Investimenti: €2K-€15K, priorità ROI immediato
- Approccio: soluzioni plug&play, no personalizzazioni complesse
- Consiglia: SaaS, piattaforme integrate, formazione base""",
            "PICCOLA": """
- Budget contenuto: bilanciare costi e benefici
- Team snello: soluzioni user-friendly, formazione essenziale
- Investimenti: €10K-€50K, ROI entro 12-18 mesi
- Approccio: mix cloud/on-premise, integrazioni standard
- Consiglia: ERP leggeri, CRM essenziali, digitalizzazione graduale""",
            "MEDIA": """
- Budget strutturato: investimenti strategici pianificati
- Team dedicato: possibile specializzazione IT interna
- Investimenti: €40K-€200K, ROI 18-36 mesi accettabile
- Approccio: soluzioni enterprise, personalizzazioni mirate
- Consiglia: ERP completi, BI, automazione avanzata, consulenza""",
            "GRANDE": """
- Budget significativo: progetti transformation complessi
- Dipartimento IT: competenze interne, team dedicati
- Investimenti: €150K-€1M+, focus su innovazione e vantaggio competitivo
- Approccio: soluzioni custom, integrazioni complesse, AI/ML
- Consiglia: Digital Twin, IoT Platform, Advanced Analytics, Innovation Lab"""
        }
        return contexts.get(size_category, contexts["PICCOLA"])

    def _generate_smart_recommendations(self, analysis, company_context):
        """Genera raccomandazioni AI intelligenti"""
        try:
            high_priority = analysis["priority_matrix"]["high_priority"]
            
            # Estrai info dipendenti
            employee_info = self._extract_employee_count(company_context["size"])
            sector = company_context["sector"]
            
            # ✅ PROMPT SPECIFICO PER TURISMO
            if any(keyword in sector.lower() for keyword in ["turismo", "hospitality", "hotel", "travel", "restaurant"]):
                sector_context = f"""
SETTORE TURISMO - SPECIFICITÀ:
- Focus su Customer Experience e Digital Transformation
- Importanza Revenue Management e Dynamic Pricing  
- Centralità Booking Systems e Channel Management
- Necessità integrazione PMS/CRM/Revenue Management
- Obiettivo: Aumentare ADR, Occupancy, Guest Satisfaction
- KPI: RevPAR, ADR, Booking Conversion, NPS, Review Score
"""
            else:
                sector_context = f"""\nSETTORE MANIFATTURIERO - SPECIFICITÀ:\n- Focus su Efficienza Produttiva, Qualità, Industry 4.0\n- Importanza IoT, Automazione, Digitalizzazione Processi\n- Centralità MES, ERP, Supply Chain Management\n- Necessità integrazione Macchine/Sistemi Gestionali\n- Obiettivo: Ridurre Costi, Aumentare Produttività, Qualità\n- KPI: OEE, Lead Time, Difettosità, Costi Produzione, On-Time Delivery\n"""
            
            prompt = f"""Sei un consulente senior di trasformazione digitale specializzato in {sector}.

{sector_context}

CONTESTO AZIENDA:
- Nome: {company_context["name"]}
- Settore: {sector}  
- Dimensione: {employee_info["label"]} ({employee_info["range"]} dipendenti)
- Dipendenti (stima): ~{employee_info["avg_employees"]}
- Punteggio Digitale: {analysis["summary"]["overall_score"]}/5
- Maturità: {analysis["summary"]["maturity_level"]["level"]}

TOP 3 AREE CRITICHE (solo applicabili):
"""
            
            for i, item in enumerate(high_priority, 1):
                prompt += f"""
{i}. CRITICO: {item["process"]} - {item["category"]}
   • Punteggio: {item["current_score"]}/5 → Target: {item["target_score"]}/5
   • Priorità: {item["priority_score"]} ({item["criticality"]["level"]})
   • Sforzo: {item["effort_estimate"]["level"]} ({item["effort_estimate"]["months"]})
   • Impatto: {item["impact_potential"]["level"]}
   • Dettaglio: {item["dimension"]}
   {f"• Note: {item['note']}" if item["note"] else ""}
"""
            
            prompt += f"""

BUDGET: €{analysis["roi_predictions"]["investment_range"]["min"]:,} - €{analysis["roi_predictions"]["investment_range"]["max"]:,}
BENCHMARK: {analysis["benchmark"]["position"]} nel settore {sector}

CONTESTO DIMENSIONALE ({employee_info["category"]}):
{self._get_size_specific_context(employee_info["category"])}

Per OGNI area critica sopra elencata, fornisci RACCOMANDAZIONI OPERATIVE con focus su AI/Blockchain/Innovazione Digitale:

   - Ogni step con tempistiche e responsabilità
   - Risorse necessarie per ogni step
   - Possibili ostacoli e come superarli

DOPO tutte le aree critiche:

🏆 STRATEGIA SETTORIALE COMPLETA (come vincere nel {sector})
   - Piano strategico a 12-24 mesi
   - Priorità di investimento
   - Competitive advantages da sviluppare

⚠️ RISCHI SPECIFICI SETTORE (almeno 5)
   - Ogni rischio con strategia di mitigazione
   - Segnali di warning da monitorare

🚀 OPPORTUNITÀ UNICHE {sector} (almeno 5)
   - Ogni opportunità con piano di azione
   - Trend di mercato da sfruttare
   - Case study o esempi di successo italiani

Tono: Consulente senior esperto. Risposte LUNGHE e DETTAGLIATE. Fornisci nomi specifici di prodotti/servizi disponibili in Italia. Usa dati concreti. REGOLE: NON inventare vendor/prezzi, usa TBD se incerto. NON citare benchmark inesistenti. Focus su AI/Blockchain/Digital."""

            response = openai.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": f"Sei un consulente senior di trasformazione digitale con 15+ anni esperienza nel settore {sector} italiano."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=6000,
                temperature=0.6
            )
            
            return {
                "content": response.choices[0].message.content,
                "model_used": self.model,
                "sector_specific": True,
                "confidence": "HIGH" if len(high_priority) >= 2 else "MEDIUM",
                "customization_level": "SECTOR_EXPERT"
            }
            
        except Exception as e:
            print(f"❌ Errore OpenAI: {e}")
            return self._create_fallback_recommendations(analysis, company_context)
    
    def _create_fallback_recommendations(self, analysis, company_context):
        """Messaggio di errore quando OpenAI non è disponibile"""
        return {
            "content": "❌ ERRORE: Sistema di raccomandazioni AI non configurato.\n\n" +
                      "Per ottenere raccomandazioni personalizzate è necessario:\n" +
                      "1. Configurare OPENAI_API_KEY nel file .env\n" +
                      "2. Verificare che la chiave API sia valida\n" +
                      "3. Assicurarsi di avere crediti OpenAI disponibili\n\n" +
                      f"📊 Dati disponibili: {len(analysis['priority_matrix']['high_priority'])} aree critiche identificate\n" +
                      f"🏢 Azienda: {company_context['name']} - {company_context['sector']}\n" +
                      f"💡 Punteggio: {analysis['summary']['overall_score']}/5",
            "model_used": "ERROR_NO_AI",
            "error": True,
            "confidence": "NONE",
            "customization_level": "NONE"
        }
    
    def _generate_sector_insights(self, results, company_context):
        """Genera insights specifici per settore includendo turismo"""
        sector = company_context["sector"].lower()
        
        # ✅ CONFIGURAZIONI SETTORIALI - INCLUSO TURISMO
        sector_configs = {
            "turismo": {
                "title": "🏨 Turismo & Hospitality",
                "critical_processes": ["GUEST EXPERIENCE", "BOOKING & RESERVATION", "REVENUE MANAGEMENT"],
                "key_technologies": ["PMS Integration", "Channel Manager", "Revenue Management System", "CRM Automation", "Mobile App"],
                "compliance_focus": ["GDPR Privacy", "PCI DSS Payment", "Accessibility Standards", "Local Tourism Laws"],
                "investment_priorities": ["Customer Experience Platform", "Revenue Optimization", "Channel Integration"],
                "kpis": ["RevPAR", "ADR", "Occupancy Rate", "Booking Conversion", "Guest Satisfaction Score", "Review Rating"],
                "digital_trends": ["Contactless Check-in", "AI Chatbots", "Personalized Offers", "Smart Room Technology"]
            },
            "automotive": {
                "title": "🚗 Automotive & Mobilità",
                "critical_processes": ["MANUFACTURING", "QUALITY MANAGEMENT", "LOGISTICS"],
                "key_technologies": ["IoT Sensoristica", "Predictive Maintenance", "Digital Twin"],
                "compliance_focus": ["ISO/TS 16949", "Tracciabilità Prodotto", "Safety Standards"],
                "investment_priorities": ["Automazione", "Controllo Qualità"],
                "kpis": ["OEE", "First Pass Yield", "Defect Rate"],
                "digital_trends": ["Industry 4.0", "Smart Factory", "Autonomous Systems"]
            },
            "food": {
                "title": "🍕 Food & Beverage", 
                "critical_processes": ["QUALITY MANAGEMENT", "LOGISTICS", "PROCUREMENT"],
                "key_technologies": ["Track & Trace", "Cold Chain Monitoring", "Batch Control"],
                "compliance_focus": ["HACCP", "BRC/IFS Standards", "Allergen Management"],
                "investment_priorities": ["Tracciabilità", "Qualità"],
                "kpis": ["Quality Score", "Waste Reduction", "Compliance Rate"],
                "digital_trends": ["Blockchain Traceability", "Smart Packaging", "Automated Quality Control"]
            }
        }
        
        # Seleziona configurazione
        sector_config = sector_configs.get("default", {
            "title": "🏭 Manifatturiero Generale",
            "critical_processes": ["MANUFACTURING", "QUALITY MANAGEMENT", "LOGISTICS"],
            "key_technologies": ["ERP Integration", "Data Analytics", "Process Automation"],
            "compliance_focus": ["ISO 9001", "Environmental Standards", "Safety Compliance"],
            "investment_priorities": ["Efficienza Operativa"],
            "kpis": ["OEE", "Quality Rate", "Cost Reduction"],
            "digital_trends": ["Industry 4.0", "IoT", "AI Analytics"]
        })
        
        for key in sector_configs:
            if key in sector:
                sector_config = sector_configs[key]
                break
        
        return {
            "sector_profile": sector_config,
            "recommended_next_steps": [
                f"Implementare {tech}" for tech in sector_config.get("key_technologies", [])[:3]
            ],
            "sector_specific_opportunities": sector_config.get("digital_trends", []),
            "compliance_checklist": sector_config.get("compliance_focus", []),
            "key_metrics": sector_config.get("kpis", [])
        }


# ============================================================================
# 🎯 FUNZIONI HELPER PER INTEGRAZIONE
# ============================================================================

def get_ai_recommendations_advanced(session_id: str, results: List, session_data: Dict) -> Dict:
    """Funzione helper per integrazione in radar.py"""
    engine = AIRecommendationEngine()
    return engine.generate_advanced_recommendations(session_id, results, session_data)

def get_sector_insights(results: List, company_context: Dict) -> Dict:
    """Funzione helper per insights settoriali"""
    engine = AIRecommendationEngine()
    return engine._generate_sector_insights(results, company_context)

# ============================================================================
# 🧪 TESTING E DEBUG
# ============================================================================

def test_ai_engine():
    """Test funzionalità AI engine"""
    print("🧪 Testing AI Recommendation Engine...")
    
    # Test data simulati
    fake_results = [
        type('Result', (), {
            'process': 'GUEST EXPERIENCE',
            'category': 'Digital Experience', 
            'dimension': 'Mobile Check-in System',
            'score': 1.8,
            'note': 'Sistema obsoleto'
        })(),
        type('Result', (), {
            'process': 'REVENUE MANAGEMENT',
            'category': 'Technology',
            'dimension': 'Dynamic Pricing',
            'score': 2.2, 
            'note': 'Pricing manuale'
        })()
    ]
    
    fake_session = {
        'azienda_nome': 'Hotel Test',
        'settore': 'Turismo',
        'dimensione': 'Media'
    }
    
    engine = AIRecommendationEngine()
    result = engine.generate_advanced_recommendations("test-123", fake_results, fake_session)
    
    print("✅ Test completato!")
    print(f"📊 Analisi generata: {len(result)} sezioni")
    return result

if __name__ == "__main__":
    test_ai_engine()
