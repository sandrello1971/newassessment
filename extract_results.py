import re

with open('assessment_backup_20251121_192311.sql', 'r') as f:
    content = f.read()

# Trova sezione COPY assessment_result
match = re.search(
    r'COPY public\.assessment_result.*?FROM stdin;(.*?)\\\\\\.',
    content,
    re.DOTALL
)

if match:
    data = match.group(1).strip()
    
    # Scrivi file SQL per import diretto
    with open('import_results.sql', 'w') as out:
        out.write("COPY assessment_result (id, session_id, process, activity, category, dimension, score, note, is_not_applicable) FROM stdin;\n")
        out.write(data)
        out.write("\n\\.\n")
    
    count = len([l for l in data.split('\n') if l.strip() and not l.startswith('--')])
    print(f"✅ Estratti {count} risultati in import_results.sql")
else:
    print("❌ Sezione non trovata!")
