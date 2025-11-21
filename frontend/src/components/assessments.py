
@router.get("/{assessment_id}/results")
async def get_assessment_results(
    assessment_id: str,
    db: Session = Depends(get_db)
):
    """
    Carica tutti i risultati di un assessment dal DB
    """
    results = db.query(AssessmentResult).filter(
        AssessmentResult.session_id == assessment_id
    ).all()
    
    return [
        {
            "id": str(r.id),
            "process": r.process,
            "activity": r.activity,
            "dimension": r.dimension,
            "category": r.category,
            "score": r.score,
            "note": r.note,
            "is_not_applicable": r.is_not_applicable
        }
        for r in results
    ]



@router.get("/{assessment_id}/results")
async def get_assessment_results(
    assessment_id: str,
    db: Session = Depends(get_db)
):
    """
    Carica tutti i risultati di un assessment dal DB
    """
    from app.models import AssessmentResult
    
    results = db.query(AssessmentResult).filter(
        AssessmentResult.session_id == assessment_id
    ).all()
    
    return [
        {
            "id": str(r.id),
            "process": r.process,
            "activity": r.activity,
            "dimension": r.dimension,
            "category": r.category,
            "score": r.score,
            "note": r.note,
            "is_not_applicable": r.is_not_applicable
        }
        for r in results
    ]
