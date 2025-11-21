import re

# Leggi backup
with open('assessment_backup_20251121_192311.sql', 'r') as f:
    content = f.read()

# Template version ID per agenzie_viaggio
VERSION_ID = '33e6ecd4-99bf-41d4-89a8-9af6bc74c76d'

# Trova il COPY di assessment_session
session_pattern = r'COPY public\.assessment_session \([^)]+\) FROM stdin;'
match = re.search(session_pattern, content)

if match:
    # Sostituisci aggiungendo template_version_id alla lista colonne
    old_copy = match.group(0)
    # Aggiungi template_version_id nelle colonne
    new_copy = old_copy.replace(
        'model_name, risposte_json',
        'model_name, template_version_id, risposte_json'
    )
    content = content.replace(old_copy, new_copy)
    
    # Ora modifica le righe dati: aggiungi VERSION_ID dopo model_name
    # Trova tutte le righe di dati (tra FROM stdin; e \.)
    data_section = re.search(
        r'COPY public\.assessment_session.*?FROM stdin;(.*?)\\\\\.', 
        content, 
        re.DOTALL
    )
    
    if data_section:
        old_data = data_section.group(1)
        new_data = old_data.replace(
            '\tagenzie_viaggio\t',
            f'\tagenzie_viaggio\t{VERSION_ID}\t'
        )
        content = content.replace(old_data, new_data)
        print("✅ Modificato COPY assessment_session")

# Salva nuovo file
with open('assessment_backup_MODIFIED.sql', 'w') as f:
    f.write(content)

print("✅ File modificato salvato: assessment_backup_MODIFIED.sql")
print(f"✅ template_version_id usato: {VERSION_ID}")
