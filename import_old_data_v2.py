import re

VERSION_ID = '33e6ecd4-99bf-41d4-89a8-9af6bc74c76d'

with open('assessment_backup_20251121_192311.sql', 'r') as f:
    lines = f.readlines()

output_lines = []
in_session_data = False

for i, line in enumerate(lines):
    # Trova il COPY statement
    if 'COPY public.assessment_session' in line:
        # Aggiungi template_version_id alle colonne
        line = line.replace(
            'model_name, risposte_json',
            'model_name, template_version_id, risposte_json'
        )
        in_session_data = True
        output_lines.append(line)
        continue
    
    # Fine dati sessione
    if in_session_data and line.strip() == '\\.':
        in_session_data = False
        output_lines.append(line)
        continue
    
    # Modifica righe dati sessione
    if in_session_data and line.strip() and not line.startswith('--'):
        # Trova posizione dopo agenzie_viaggio e aggiungi VERSION_ID
        if 'agenzie_viaggio' in line:
            line = line.replace(
                'agenzie_viaggio\t\\N\t\\N\t',
                f'agenzie_viaggio\t{VERSION_ID}\t\\N\t\\N\t'
            )
    
    output_lines.append(line)

# Salva
with open('assessment_backup_FIXED.sql', 'w') as f:
    f.writelines(output_lines)

print(f"✅ File modificato: assessment_backup_FIXED.sql")
print(f"✅ Version ID: {VERSION_ID}")
