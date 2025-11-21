import re
from datetime import datetime

VERSION_ID = '33e6ecd4-99bf-41d4-89a8-9af6bc74c76d'

with open('assessment_backup_20251121_192311.sql', 'r') as f:
    lines = f.readlines()

output_lines = []
in_session_data = False

for line in lines:
    # Trova COPY statement
    if 'COPY public.assessment_session' in line:
        line = line.replace(
            'model_name, risposte_json',
            'model_name, template_version_id, risposte_json'
        )
        in_session_data = True
        output_lines.append(line)
        continue
    
    if in_session_data and line.strip() == '\\.':
        in_session_data = False
        output_lines.append(line)
        continue
    
    if in_session_data and line.strip() and not line.startswith('--'):
        if 'agenzie_viaggio' in line:
            # Aggiungi template_version_id
            line = line.replace(
                'agenzie_viaggio\t\\N\t\\N\t',
                f'agenzie_viaggio\t{VERSION_ID}\t\\N\t\\N\t'
            )
            
            # Fix formato data: rimuovi millisecondi se presenti
            # Da: 2025-11-19 16:39:09.232037
            # A:  2025-11-19 16:39:09
            line = re.sub(
                r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\.\d+',
                r'\1',
                line
            )
    
    output_lines.append(line)

with open('assessment_backup_CLEAN.sql', 'w') as f:
    f.writelines(output_lines)

print("✅ Backup pulito salvato!")
