import pandas as pd
import json
from typing import Dict, List, Any, Tuple
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class ExcelAssessmentParser:
    """Parser per convertire file Excel di assessment in formato JSON strutturato"""
    
    def __init__(self):
        # Mapping standard delle dimensioni (colonne Excel)
        self.dimension_mapping = {
            "Governance": {"start": 1, "end": 6, "questions": []},
            "Monitoring & Control": {"start": 8, "end": 11, "questions": []},
            "Technology": {"start": 14, "end": 16, "questions": []}, 
            "Organization": {"start": 19, "end": 20, "questions": []}
        }
    
    def parse_excel_file(self, file_path: str) -> Dict[str, Any]:
        """
        Parsa un file Excel di assessment e restituisce struttura JSON
        
        Args:
            file_path: Path al file Excel
            
        Returns:
            Dict con struttura del modello di assessment
        """
        try:
            # Leggi il file Excel
            df = pd.read_excel(file_path, sheet_name=0, header=None)
            
            # Estrai metadata del modello
            model_info = self._extract_model_info(df)
            
            # Estrai le domande per ogni dimensione
            questions = self._extract_questions(df)
            
            # Estrai i processi con le loro valutazioni
            processes = self._extract_processes(df)
            
            # Costruisci la struttura finale
            result = {
                "model_info": model_info,
                "dimensions": list(self.dimension_mapping.keys()),
                "questions": questions,
                "processes": processes,
                "metadata": {
                    "total_processes": len(processes),
                    "total_dimensions": len(self.dimension_mapping),
                    "parser_version": "1.0"
                }
            }
            
            logger.info(f"Excel parsing completato: {len(processes)} processi, {len(questions)} dimensioni")
            return result
            
        except Exception as e:
            logger.error(f"Errore parsing Excel: {str(e)}")
            raise ValueError(f"Errore nel parsing del file Excel: {str(e)}")
    
    def _extract_model_info(self, df: pd.DataFrame) -> Dict[str, str]:
        """Estrae informazioni sul modello dalla prima riga"""
        try:
            model_name = str(df.iloc[0, 0]) if not pd.isna(df.iloc[0, 0]) else "Unknown Model"
            return {
                "name": model_name,
                "description": f"Modello importato da Excel",
                "version": "1.0"
            }
        except:
            return {
                "name": "Assessment Model",
                "description": "Modello importato da Excel",
                "version": "1.0"
            }
    
    def _extract_questions(self, df: pd.DataFrame) -> Dict[str, List[str]]:
        """Estrae le domande per ogni dimensione dalla riga 3 (indice 2)"""
        questions = {}
        missing_dimensions = []
        
        try:
            question_row = df.iloc[2]  # Riga 3 contiene le domande
            
            for dimension, mapping in self.dimension_mapping.items():
                dim_questions = []
                for col_idx in range(mapping["start"], mapping["end"] + 1):
                    if col_idx < len(question_row):
                        question = question_row.iloc[col_idx]
                        if not pd.isna(question) and str(question).strip():
                            dim_questions.append(str(question).strip())
                
                if len(dim_questions) == 0:
                    missing_dimensions.append(dimension)
                else:
                    questions[dimension] = dim_questions
            
            # Se mancano dimensioni critiche, errore
            if missing_dimensions:
                error_msg = f"Domande mancanti per le dimensioni: {', '.join(missing_dimensions)}. "
                error_msg += "Verificare che il file Excel abbia la struttura corretta con domande nella riga 3."
                raise ValueError(error_msg)
                
        except Exception as e:
            if "Domande mancanti" in str(e):
                raise  # Rilancia errore di dimensioni mancanti
            else:
                # Errore generico di parsing
                raise ValueError(f"Errore nel parsing delle domande dal file Excel: {str(e)}. "
                               "Verificare che il file abbia la struttura corretta.")
        
        return questions
    
    def _extract_processes(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Estrae tutti i processi con le loro valutazioni"""
        processes = []
        
        try:
            for idx in range(3, len(df)):  # Inizia dalla riga 4 (indice 3)
                row = df.iloc[idx]
                
                # Nome del processo (colonna A)
                process_name = row.iloc[0] if not pd.isna(row.iloc[0]) else None
                
                if not process_name or str(process_name).strip() == "":
                    continue
                
                process_name = str(process_name).strip()
                
                # Estrai valutazioni per ogni dimensione
                process_data = {
                    "name": process_name,
                    "categories": {}
                }
                
                for dimension, mapping in self.dimension_mapping.items():
                    scores = []
                    for col_idx in range(mapping["start"], mapping["end"] + 1):
                        if col_idx < len(row):
                            value = row.iloc[col_idx]
                            if pd.isna(value):
                                scores.append(None)
                            else:
                                try:
                                    # Converte in numero se possibile
                                    numeric_value = float(value)
                                    scores.append(numeric_value)
                                except:
                                    scores.append(None)
                    
                    # Aggiungi solo se ha almeno un valore numerico
                    if any(score is not None for score in scores):
                        process_data["categories"][dimension] = scores
                
                # Aggiungi il processo solo se ha almeno una dimensione con dati
                if process_data["categories"]:
                    processes.append(process_data)
                    
        except Exception as e:
            logger.error(f"Errore estrazione processi: {e}")
            
        return processes
    
    def validate_parsed_data(self, data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """Valida i dati parsati"""
        errors = []
        
        # Verifica struttura base
        required_keys = ["model_info", "dimensions", "questions", "processes"]
        for key in required_keys:
            if key not in data:
                errors.append(f"Chiave mancante: {key}")
        
        # Verifica che ci siano processi
        if "processes" in data and len(data["processes"]) == 0:
            errors.append("Nessun processo con dati numerici trovato nel file Excel")
        
        # Verifica che ci siano domande per ogni dimensione
        if "questions" in data:
            for dimension in self.dimension_mapping.keys():
                if dimension not in data["questions"] or len(data["questions"][dimension]) == 0:
                    errors.append(f"Nessuna domanda trovata per la dimensione: {dimension}")
        
        # Verifica coerenza processi-dimensioni
        if "processes" in data and "questions" in data:
            available_dimensions = set(data["questions"].keys())
            for process in data["processes"]:
                process_dimensions = set(process.get("categories", {}).keys())
                invalid_dims = process_dimensions - available_dimensions
                if invalid_dims:
                    errors.append(f"Processo '{process['name']}' ha dimensioni non definite: {', '.join(invalid_dims)}")
        
        return len(errors) == 0, errors


# UTILITY FUNCTIONS
def parse_excel_to_assessment_model(file_path: str) -> Dict[str, Any]:
    """Funzione helper per parsing rapido"""
    parser = ExcelAssessmentParser()
    return parser.parse_excel_file(file_path)

def validate_excel_file(file_path: str) -> Tuple[bool, List[str]]:
    """Valida un file Excel prima del parsing"""
    try:
        parser = ExcelAssessmentParser()
        data = parser.parse_excel_file(file_path)
        return parser.validate_parsed_data(data)
    except ValueError as e:
        return False, [str(e)]
    except Exception as e:
        return False, [f"Errore generico nel parsing del file Excel: {str(e)}"]
