from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
import io
from datetime import datetime
from typing import Dict, List, Any

class PDFReportGenerator:
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self.setup_custom_styles()
    
    def setup_custom_styles(self):
        """Definisce stili personalizzati per il PDF"""
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            textColor=colors.HexColor('#1e40af'),
            alignment=1  # Center
        ))
        
        self.styles.add(ParagraphStyle(
            name='ProcessTitle',
            parent=self.styles['Heading2'],
            fontSize=18,
            spaceAfter=20,
            textColor=colors.HexColor('#7c3aed'),
            borderWidth=1,
            borderColor=colors.HexColor('#7c3aed'),
            borderPadding=10
        ))
        
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading3'],
            fontSize=14,
            spaceAfter=15,
            textColor=colors.HexColor('#374151'),
            fontName='Helvetica-Bold'
        ))

    def generate_assessment_report(self, session_data: Dict, results_data: List[Dict], 
                                 stats_data: Dict) -> bytes:
        """Genera il report PDF completo"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, 
                              rightMargin=72, leftMargin=72,
                              topMargin=72, bottomMargin=36)
        
        story = []
        
        # Pagina 1: Executive Summary
        story.extend(self._build_executive_summary(session_data, stats_data))
        story.append(PageBreak())
        
        # Pagine 2+: Analisi per processo
        processes_data = stats_data.get('by_process', {})
        if processes_data:
            for process_name, process_stats in processes_data.items():
                story.extend(self._build_process_analysis(process_name, process_stats, results_data))
                story.append(PageBreak())
        
        # Ultima pagina: Raccomandazioni
        story.extend(self._build_recommendations(stats_data, session_data))
        
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()

    def _build_executive_summary(self, session_data: Dict, stats_data: Dict) -> List:
        """Costruisce la pagina Executive Summary"""
        elements = []
        
        # Header principale
        elements.append(Paragraph("Assessment Digitale 4.0", self.styles['CustomTitle']))
        elements.append(Paragraph("Report di Valutazione della Maturità Digitale", 
                                self.styles['Normal']))
        elements.append(Paragraph(f"Generato il: {datetime.now().strftime('%d/%m/%Y alle %H:%M')}", 
                                self.styles['Normal']))
        elements.append(Spacer(1, 30))
        
        # Dati Azienda
        elements.append(Paragraph("INFORMAZIONI AZIENDA", self.styles['SectionHeader']))
        
        company_data = [
            ['Azienda:', session_data.get('azienda_nome', 'N/A')],
            ['Settore:', session_data.get('settore', 'N/A') or 'Non specificato'],
            ['Dimensione:', session_data.get('dimensione', 'N/A') or 'Non specificata'],
            ['Referente:', session_data.get('referente', 'N/A') or 'Non specificato'],
            ['Email:', session_data.get('email', 'N/A') or 'Non specificata']
        ]
        
        company_table = Table(company_data, colWidths=[2*inch, 4*inch])
        company_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(company_table)
        elements.append(Spacer(1, 30))
        
        # Metriche Generali
        elements.append(Paragraph("METRICHE GENERALI", self.styles['SectionHeader']))
        
        metrics_data = [
            ['Domande Totali:', str(stats_data.get('total_questions', 0))],
            ['Domande Applicabili:', str(stats_data.get('applicable_questions', 0))],
            ['Domande Non Applicabili:', str(stats_data.get('not_applicable_questions', 0))],
            ['Percentuale Applicabilità:', f"{(stats_data.get('applicable_questions', 0) / max(stats_data.get('total_questions', 1), 1) * 100):.1f}%"],
        ]
        
        metrics_table = Table(metrics_data, colWidths=[3*inch, 2*inch])
        metrics_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ]))
        elements.append(metrics_table)
        elements.append(Spacer(1, 40))
        
        # Punteggio Complessivo - BOX PROMINENTE
        overall_score = stats_data.get('overall_average', 0)
        score_color = self._get_score_color(overall_score)
        score_description = self._get_score_description(overall_score)
        
        elements.append(Paragraph("PUNTEGGIO COMPLESSIVO", self.styles['SectionHeader']))
        
        # Tabella per il punteggio prominente
        score_data = [
            [f"{overall_score:.1f}/5.0", score_description],
        ]
        
        score_table = Table(score_data, colWidths=[2*inch, 4*inch])
        score_table.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (0, 0), 36),
            ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
            ('TEXTCOLOR', (0, 0), (0, 0), colors.HexColor(score_color)),
            ('FONTSIZE', (1, 0), (1, 0), 14),
            ('FONTNAME', (1, 0), (1, 0), 'Helvetica-Bold'),
            ('ALIGN', (0, 0), (0, 0), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f0f9ff')),
            ('BOX', (0, 0), (-1, -1), 2, colors.HexColor('#3b82f6')),
            ('TOPPADDING', (0, 0), (-1, -1), 15),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 15),
        ]))
        elements.append(score_table)
        elements.append(Spacer(1, 30))
        
        # Top/Bottom Processes
        processes_data = stats_data.get('by_process', {})
        if processes_data:
            elements.append(Paragraph("PANORAMICA PROCESSI", self.styles['SectionHeader']))
            
            # Ordina processi per punteggio
            sorted_processes = sorted(processes_data.items(), 
                                    key=lambda x: x[1].get('average_score', 0), 
                                    reverse=True)
            
            process_summary_data = [['Processo', 'Punteggio Medio', 'Domande Applicabili', 'Livello']]
            
            for process_name, process_stats in sorted_processes:
                avg_score = process_stats.get('average_score', 0)
                applicable_count = process_stats.get('applicable_count', 0)
                level = self._get_score_description(avg_score)
                
                process_summary_data.append([
                    process_name[:35] + '...' if len(process_name) > 35 else process_name,
                    f"{avg_score:.2f}",
                    str(applicable_count),
                    level
                ])
            
            process_table = Table(process_summary_data, colWidths=[3*inch, 1*inch, 1*inch, 1.5*inch])
            process_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e0e7ff')),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (1, 1), (2, -1), 'CENTER'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
            ]))
            elements.append(process_table)
        
        return elements

    def _build_process_analysis(self, process_name: str, process_stats: Dict, 
                              results_data: List[Dict]) -> List:
        """Costruisce l'analisi dettagliata per un processo"""
        elements = []
        
        # Titolo Processo  
        elements.append(Paragraph(f"ANALISI PROCESSO", self.styles['SectionHeader']))
        elements.append(Paragraph(f"{process_name.upper()}", self.styles['ProcessTitle']))
        elements.append(Spacer(1, 20))
        
        # Statistiche Processo in formato più leggibile
        avg_score = process_stats.get('average_score', 0)
        applicable_count = process_stats.get('applicable_count', 0)
        min_score = process_stats.get('min_score', 0)
        max_score = process_stats.get('max_score', 0)
        
        stats_data = [
            ['Metriche del Processo', ''],
            ['Domande Applicabili:', str(applicable_count)],
            ['Punteggio Medio:', f"{avg_score:.2f}/5.00"],
            ['Punteggio Minimo:', str(min_score)],
            ['Punteggio Massimo:', str(max_score)],
            ['Livello Generale:', self._get_score_description(avg_score)]
        ]
        
        stats_table = Table(stats_data, colWidths=[3*inch, 2.5*inch])
        stats_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3e8ff')),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('FONTSIZE', (0, 1), (-1, -1), 11),
        ]))
        elements.append(stats_table)
        elements.append(Spacer(1, 30))
        
        # Tabella Dettagliata
        elements.append(Paragraph("Dettaglio Valutazioni per Categoria e Dimensione", 
                                self.styles['SectionHeader']))
        
        # Filtra risultati per questo processo
        process_results = [r for r in results_data if r['process'] == process_name]
        
        if process_results:
            detail_data = [['Categoria', 'Dimensione', 'Punteggio', 'Note']]
            
            for result in process_results:
                category_p = Paragraph(result['category'], self.styles['Normal'])
                dimension_p = Paragraph(result['dimension'], self.styles['Normal'])
                
                if result.get('is_not_applicable'):
                    score_p = Paragraph("N/A", self.styles['Normal'])
                else:
                    score_p = Paragraph(str(result['score']), self.styles['Normal'])
                
                note = result.get('note', '') or ''
                note_p = Paragraph(note if note else '-', self.styles['Normal'])
                
                detail_data.append([
                    category_p,
                    dimension_p,
                    score_p,
                    note_p
                ])
            
            detail_table = Table(detail_data, colWidths=[2.2*inch, 2.5*inch, 0.7*inch, 1.8*inch])
            detail_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#ddd6fe')),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (2, 1), (2, -1), 'CENTER'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
            ]))
            elements.append(detail_table)
        else:
            elements.append(Paragraph("Nessun dato disponibile per questo processo.", 
                                    self.styles['Normal']))
        
        return elements

    def _build_recommendations(self, stats_data: Dict, session_data: Dict) -> List:
        """Costruisce la pagina delle raccomandazioni"""
        elements = []
        
        elements.append(Paragraph("RACCOMANDAZIONI STRATEGICHE", self.styles['CustomTitle']))
        elements.append(Spacer(1, 20))
        
        # Analisi per livelli di priorità
        low_processes = []
        medium_processes = []
        high_processes = []
        
        processes_data = stats_data.get('by_process', {})
        for process_name, process_stats in processes_data.items():
            avg_score = process_stats.get('average_score', 0)
            applicable_count = process_stats.get('applicable_count', 0)
            
            if applicable_count > 0:  # Solo processi con dati applicabili
                if avg_score < 2.5:
                    low_processes.append((process_name, avg_score))
                elif avg_score < 3.5:
                    medium_processes.append((process_name, avg_score))
                else:
                    high_processes.append((process_name, avg_score))
        
        # Sezione Priorità Alta
        if low_processes:
            elements.append(Paragraph("🚨 PRIORITÀ ALTA - Intervento Urgente", 
                                    self.styles['SectionHeader']))
            elements.append(Paragraph("I seguenti processi richiedono attenzione immediata:", 
                                    self.styles['Normal']))
            elements.append(Spacer(1, 10))
            
            priority_data = [['Processo', 'Punteggio', 'Azione Raccomandata']]
            for process_name, score in sorted(low_processes, key=lambda x: x[1]):
                priority_data.append([
                    process_name[:35] + '...' if len(process_name) > 35 else process_name,
                    f"{score:.1f}/5.0",
                    "Implementazione processi digitalizzati di base"
                ])
            
            priority_table = Table(priority_data, colWidths=[2.5*inch, 1*inch, 3*inch])
            priority_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#fee2e2')),
                ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#fef2f2')),
                ('GRID', (0, 0), (-1, -1), 1, colors.red),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
            ]))
            elements.append(priority_table)
            elements.append(Spacer(1, 20))
        
        # Sezione Priorità Media
        if medium_processes:
            elements.append(Paragraph("⚠️ PRIORITÀ MEDIA - Ottimizzazione", 
                                    self.styles['SectionHeader']))
            elements.append(Paragraph("Processi con potenziale di miglioramento:", 
                                    self.styles['Normal']))
            elements.append(Spacer(1, 10))
            
            medium_data = [['Processo', 'Punteggio', 'Azione Raccomandata']]
            for process_name, score in sorted(medium_processes, key=lambda x: x[1]):
                medium_data.append([
                    process_name[:35] + '...' if len(process_name) > 35 else process_name,
                    f"{score:.1f}/5.0",
                    "Ottimizzazione e integrazione"
                ])
            
            medium_table = Table(medium_data, colWidths=[2.5*inch, 1*inch, 3*inch])
            medium_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#fef3c7')),
                ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#fffbeb')),
                ('GRID', (0, 0), (-1, -1), 1, colors.orange),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
            ]))
            elements.append(medium_table)
            elements.append(Spacer(1, 20))
        
        # Sezione Punti di Forza
        if high_processes:
            elements.append(Paragraph("✅ PUNTI DI FORZA - Mantenere Standards", 
                                    self.styles['SectionHeader']))
            elements.append(Paragraph("Processi con eccellenti performance:", 
                                    self.styles['Normal']))
            elements.append(Spacer(1, 10))
            
            strength_data = [['Processo', 'Punteggio', 'Raccomandazione']]
            for process_name, score in sorted(high_processes, key=lambda x: x[1], reverse=True):
                strength_data.append([
                    process_name[:35] + '...' if len(process_name) > 35 else process_name,
                    f"{score:.1f}/5.0",
                    "Condividere best practices"
                ])
            
            strength_table = Table(strength_data, colWidths=[2.5*inch, 1*inch, 3*inch])
            strength_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#dcfce7')),
                ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f0fdf4')),
                ('GRID', (0, 0), (-1, -1), 1, colors.green),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
            ]))
            elements.append(strength_table)
            elements.append(Spacer(1, 30))
        
        # Piano d'Azione
        elements.append(Paragraph("📋 PIANO D'AZIONE CONSIGLIATO", self.styles['SectionHeader']))
        
        action_plan = [
            "1. **Analisi Gap Dettagliata**: Approfondire i processi con punteggio < 3.0",
            "2. **Benchmark Settoriali**: Confronto con standard del settore " + 
            (session_data.get('settore', 'di riferimento')),
            "3. **Roadmap Implementazione**: Piano trimestrale con milestone specifiche",
            "4. **Team Training**: Formazione su strumenti digitali identificati come critici",
            "5. **Monitoraggio Progress**: Nuovo assessment tra 6 mesi per misurare miglioramenti",
            "6. **Change Management**: Supporto organizzativo per l'adozione delle nuove tecnologie"
        ]
        
        for step in action_plan:
            elements.append(Paragraph(step, self.styles['Normal']))
            elements.append(Spacer(1, 8))
        
        elements.append(Spacer(1, 40))
        
        # Footer con metadati
        elements.append(Paragraph("─" * 100, self.styles['Normal']))
        elements.append(Spacer(1, 10))
        elements.append(Paragraph(f"Report generato il {datetime.now().strftime('%d/%m/%Y alle %H:%M')}", 
                                self.styles['Normal']))
        elements.append(Paragraph(f"ID Sessione: {stats_data.get('session_id', 'N/A')}", 
                                self.styles['Normal']))
        elements.append(Paragraph("Sistema: Assessment Digitale 4.0 - Versione 1.0", 
                                self.styles['Normal']))
        elements.append(Paragraph("© 2024 - Tutti i diritti riservati", self.styles['Normal']))
        
        return elements

    def _get_score_color(self, score: float) -> str:
        """Restituisce il colore HEX basato sul punteggio"""
        if score >= 4.5:
            return '#3b82f6'  # Blu - Eccellente
        elif score >= 3.5:
            return '#10b981'  # Verde - Buono
        elif score >= 2.5:
            return '#eab308'  # Giallo - Sufficiente
        elif score >= 1.5:
            return '#f97316'  # Arancione - Carente
        else:
            return '#ef4444'  # Rosso - Totale Assenza

    def _get_score_description(self, score: float) -> str:
        """Restituisce la descrizione testuale del punteggio"""
        if score >= 4.5:
            return "Eccellente"
        elif score >= 3.5:
            return "Buono"
        elif score >= 2.5:
            return "Sufficiente"
        elif score >= 1.5:
            return "Carente"
        else:
            return "Totale Assenza"
