from pydantic import BaseModel, validator
from typing import Optional
from uuid import UUID
from datetime import datetime

# 🔒 Token
class Token(BaseModel):
    access_token: str
    token_type: str

# 👤 User
class User(BaseModel):
    email: str
    role: str

    class Config:
        from_attributes = True

# 📝 Assessment Result
class AssessmentResultCreate(BaseModel):
    process: str
    activity: str
    category: str
    dimension: str
    score: int = 0
    note: Optional[str] = None
    is_not_applicable: Optional[bool] = False  # ✅ NUOVO CAMPO
    
    @validator('score')
    def validate_score(cls, v, values):
        # Se è "non applicabile", score può essere qualsiasi valore (sarà ignorato)
        if values.get('is_not_applicable'):
            return v
        
        # Altrimenti deve essere tra 0 e 5
        if not (0 <= v <= 5):
            raise ValueError('Score deve essere tra 0 e 5')
        return v

class AssessmentResultOut(AssessmentResultCreate):
    id: UUID
    session_id: UUID
    processRating: Optional[float] = 0.0

    class Config:
        from_attributes = True

# 📆 Assessment Session
class AssessmentSessionCreate(BaseModel):
    user_id: Optional[str] = None
    company_id: Optional[int] = None
    azienda_nome: str
    settore: Optional[str] = None
    dimensione: Optional[str] = None
    referente: Optional[str] = None
    email: Optional[str] = None
    effettuato_da: Optional[str] = None
    model_name: Optional[str] = 'i40_assessment_fto'
    risposte_json: Optional[str] = None
    punteggi_json: Optional[str] = None
    raccomandazioni: Optional[str] = None
    logo_path: Optional[str] = None

class AssessmentSessionOut(AssessmentSessionCreate):
    id: UUID
    data_chiusura: Optional[datetime] = None
    creato_il: Optional[datetime] = None

    class Config:
        from_attributes = True

# 🏢 Company
class CompanyCreate(BaseModel):
    name: str

class CompanyOut(CompanyCreate):
    id: int

    class Config:
        from_attributes = True
