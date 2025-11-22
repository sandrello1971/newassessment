import csv
import sys
from sqlalchemy import create_engine, text
from datetime import datetime

# Database connection
DATABASE_URL = "postgresql://assessment_user:N0sc1t3_2025!@localhost/assessment_ai"
engine = create_engine(DATABASE_URL)

def import_session():
    print("📥 Importando sessione...")
    with open('/tmp/mondovela_session.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            with engine.connect() as conn:
                conn.execute(text("""
                    INSERT INTO assessment_session 
                    (id, azienda_nome, settore, dimensione, referente, email, model_name, 
                     pareto_recommendations, creato_il, data_chiusura, effettuato_da)
                    VALUES 
                    (:id, :azienda_nome, :settore, :dimensione, :referente, :email, :model_name,
                     :pareto_recommendations, NOW(), NOW(), :effettuato_da)
                    ON CONFLICT (id) DO UPDATE SET
                        azienda_nome = EXCLUDED.azienda_nome,
                        settore = EXCLUDED.settore,
                        dimensione = EXCLUDED.dimensione
                """), {
                    'id': row['id'],
                    'azienda_nome': row['azienda_nome'],
                    'settore': row['settore'],
                    'dimensione': row['dimensione'],
                    'referente': row['referente'] or None,
                    'email': row['email'] or None,
                    'model_name': row['model_name'] or 'i40_assessment_fto',
                    'pareto_recommendations': row['pareto_recommendations'] or None,
                    'effettuato_da': row['effettuato_da'] or None
                })
                conn.commit()
    print("✅ Sessione importata!")

def import_results():
    print("📥 Importando risultati...")
    count = 0
    with open('/tmp/mondovela_results.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        with engine.connect() as conn:
            for row in reader:
                conn.execute(text("""
                    INSERT INTO assessment_result 
                    (id, session_id, process, activity, category, dimension, score, note, is_not_applicable)
                    VALUES 
                    (:id, :session_id, :process, :activity, :category, :dimension, :score, :note, :is_not_applicable)
                    ON CONFLICT (id) DO UPDATE SET
                        score = EXCLUDED.score,
                        note = EXCLUDED.note,
                        is_not_applicable = EXCLUDED.is_not_applicable
                """), {
                    'id': row['id'],
                    'session_id': row['session_id'],
                    'process': row['process'],
                    'activity': row['activity'],
                    'category': row['category'],
                    'dimension': row['dimension'],
                    'score': int(row['score']) if row['score'] else 0,
                    'note': row['note'] or '',
                    'is_not_applicable': row['is_not_applicable'].lower() == 't'
                })
                count += 1
                if count % 100 == 0:
                    print(f"  ✓ {count} risultati importati...")
            conn.commit()
    print(f"✅ {count} risultati importati!")

if __name__ == '__main__':
    try:
        import_session()
        import_results()
        print("\n🎉 IMPORT COMPLETATO!")
    except Exception as e:
        print(f"\n❌ ERRORE: {e}")
        sys.exit(1)
