# Assessment Platform - Industria 4.0

Piattaforma professionale per l'erogazione di assessment digitali basata sul modello del Politecnico di Milano per la valutazione della maturità digitale delle aziende manifatturiere.

## 🎯 Obiettivo

Sistema di assessment per valutare il livello di digitalizzazione delle imprese secondo 4 dimensioni chiave:
- **Governance**: Best practices, standardizzazione, integrazione processi
- **Monitoring & Control**: Miglioramento continuo, feedback, decision making
- **Technology**: Automazione, sistemi integrati, digitalizzazione dati
- **Organization**: Responsabilità, collaborazione tra processi

## 🏗️ Architettura

### Backend
- **Framework**: FastAPI (Python 3.10)
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy
- **Autenticazione**: JWT + bcrypt
- **Server**: Uvicorn (systemd service)

### Frontend
- **Framework**: React + TypeScript
- **Styling**: Tailwind CSS
- **Build**: Vite

### Infrastruttura
- **Server**: VPS Ubuntu 22.04 LTS
- **Web Server**: Nginx (reverse proxy + HTTPS)
- **SSL**: Let's Encrypt
- **Dominio**: newassessment.noscite.it

## 📊 Modello Dati

### Template System (Versionato)
```
assessment_templates
├── id (UUID)
├── code (unique)
├── name
├── description
├── sector
└── is_active

template_versions
├── id (UUID)
├── template_id → assessment_templates
├── version (integer)
├── is_active
└── is_deprecated

domains
├── id (UUID)
├── code (unique)
├── name
└── description

template_domains (junction)
├── id (UUID)
├── version_id → template_versions
├── domain_id → domains
├── order
└── weight

questions
├── id (UUID)
├── version_id → template_versions
├── domain_id → domains
├── code (unique per version)
├── text
├── help_text
├── process
├── activity
├── category
├── dimension
├── order
└── max_score
```

### Assessment Session
```
assessment_session
├── id (UUID)
├── user_id
├── company info (azienda_nome, settore, dimensione, referente)
├── model_name
├── risposte_json
├── punteggi_json
├── raccomandazioni (AI generated)
└── pareto_recommendations
```

## 🚀 Setup & Deploy

### Prerequisiti
```bash
# Python 3.10+
python3 --version

# PostgreSQL
sudo apt install postgresql postgresql-contrib

# Node.js (per frontend)
node --version
npm --version
```

### Installazione Backend
```bash
# Clone repository
cd /var/www
git clone https://github.com/sandrello1971/newassessment.git assessment_ai
cd assessment_ai

# Crea virtualenv
python3 -m venv .venv
source .venv/bin/activate

# Installa dipendenze
pip install --upgrade pip
pip install -r requirements.txt
```

### Configurazione Database
```bash
# Crea database e utente
sudo -u postgres psql
CREATE DATABASE assessment_ai;
CREATE USER assessment_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE assessment_ai TO assessment_user;
\q

# Configura .env
cat > .env << 'ENVEOF'
DATABASE_URL=postgresql://assessment_user:your_password@localhost:5432/assessment_ai
SECRET_KEY=your-secret-key-here
OPENAI_API_KEY=your-openai-key-here
ENVEOF
```

### Migration Database
```bash
# Esegui migrations con Alembic
alembic upgrade head
```

### Import Template Base
```bash
# Assicurati che base_model.json sia presente
ls -lh base_model.json

# Esegui import
python3 import_base_model.py
```

Output atteso:
```
✅ Template creato: Base Model I4.0
✅ Versione 1 creata
✅ 4 Domini creati
✅ 770 Domande importate
```

### Service Systemd
```bash
# Crea service file
sudo tee /etc/systemd/system/assessment_ai.service > /dev/null << 'SERVICEEOF'
[Unit]
Description=Assessment AI FastAPI Service
After=network.target

[Service]
User=aiapp
Group=aiapp
WorkingDirectory=/var/www/assessment_ai
Environment="PATH=/var/www/assessment_ai/.venv/bin"
ExecStart=/var/www/assessment_ai/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
SERVICEEOF

# Abilita e avvia service
sudo systemctl daemon-reload
sudo systemctl enable assessment_ai
sudo systemctl start assessment_ai
sudo systemctl status assessment_ai
```

### Nginx Configuration
```bash
# Configura nginx per reverse proxy
sudo nano /etc/nginx/sites-available/assessment

# Esempio configurazione:
server {
    listen 80;
    server_name newassessment.noscite.it;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Abilita site
sudo ln -s /etc/nginx/sites-available/assessment /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Setup HTTPS con Let's Encrypt
sudo certbot --nginx -d newassessment.noscite.it
```

## 📡 API Endpoints

### Templates Management
```
GET    /admin/templates/                           # Lista tutti i template
POST   /admin/templates/                           # Crea nuovo template
GET    /admin/templates/{template_id}              # Dettaglio template
GET    /admin/templates/{template_id}/versions     # Lista versioni
POST   /admin/templates/{template_id}/versions     # Crea versione
GET    /admin/templates/versions/{version_id}      # Dettaglio versione
```

### Assessment
```
POST   /api/assessment                             # Crea nuova sessione
GET    /api/assessment/{session_id}                # Dettaglio sessione
PUT    /api/assessment/{session_id}                # Aggiorna risposte
POST   /api/assessment/{session_id}/finalize       # Finalizza assessment
```

### Reports
```
GET    /api/pdf/{session_id}                       # Genera PDF report
GET    /api/excel/{session_id}                     # Export Excel
GET    /api/radar/{session_id}                     # Dati radar chart
```

### AI Recommendations
```
POST   /api/ai-recommendations/{session_id}        # Genera raccomandazioni AI
POST   /api/pareto-analysis/{session_id}           # Analisi Pareto gap
```

## 🧪 Testing API
```bash
# Test 1: Lista template
curl http://localhost:8000/admin/templates/ | python3 -m json.tool

# Test 2: Versioni template
curl http://localhost:8000/admin/templates/07827d8a-9811-45a3-81bb-9477f83a9005/versions | python3 -m json.tool

# Test 3: Dettaglio versione (con domini e domande)
curl http://localhost:8000/admin/templates/versions/08cbdbf5-6d33-49fa-99d5-773846e26dbb | python3 -m json.tool
```

## 📊 Template Base Importato

**Template**: `base_model` (Base Model I4.0)  
**ID**: `07827d8a-9811-45a3-81bb-9477f83a9005`

**Versione**: 1  
**ID**: `08cbdbf5-6d33-49fa-99d5-773846e26dbb`

**Domini** (4):
- Governance (5 domande)
- Monitoring & Control (4 domande)
- Technology (3 domande)
- Organization (2 domande)

**Statistiche**:
- 7 Processi (MKTG, DESIGN & ENGINEERING, EXECUTION, QUALITY MANAGEMENT, CUSTOMER CARE, DIGITAL MKTG, ADMINISTRATION)
- 55 Attività
- 770 Domande totali (14 domande × 55 attività)

## 🔧 Manutenzione

### Log Backend
```bash
# Visualizza log in tempo reale
sudo journalctl -u assessment_ai -f

# Ultimi 100 log
sudo journalctl -u assessment_ai -n 100 --no-pager

# Log con errori
sudo journalctl -u assessment_ai | grep ERROR
```

### Backup Database
```bash
# Backup completo
sudo -u postgres pg_dump assessment_ai > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
sudo -u postgres psql assessment_ai < backup_file.sql
```

### Riavvio Servizi
```bash
# Riavvio backend
sudo systemctl restart assessment_ai

# Riavvio nginx
sudo systemctl restart nginx

# Verifica status
sudo systemctl status assessment_ai
sudo systemctl status nginx
```

## 🛠️ Troubleshooting

### Backend non parte
```bash
# Verifica log
sudo journalctl -u assessment_ai -n 50

# Verifica permessi
ls -la /var/www/assessment_ai
# User: aiapp, Group: aiapp

# Test manuale
cd /var/www/assessment_ai
source .venv/bin/activate
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Database connection error
```bash
# Verifica PostgreSQL attivo
sudo systemctl status postgresql

# Test connessione
psql -U assessment_user -d assessment_ai -h localhost

# Verifica .env
cat .env | grep DATABASE_URL
```

### Nginx 502 Bad Gateway
```bash
# Verifica backend attivo
curl http://127.0.0.1:8000/admin/templates/

# Verifica nginx config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

## 📚 Struttura Progetto
```
assessment_ai/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application
│   ├── database.py             # DB connection & session
│   ├── models.py               # SQLAlchemy models
│   ├── schemas.py              # Pydantic schemas
│   ├── auth.py                 # Authentication logic
│   ├── routers/
│   │   ├── templates.py        # Template management API
│   │   ├── assessment.py       # Assessment API
│   │   ├── pdf.py             # PDF generation
│   │   ├── radar.py           # Radar charts
│   │   └── admin.py           # Admin endpoints
│   └── services/
│       ├── template_service.py # Template CRUD logic
│       ├── pdf_generator.py   # PDF generation service
│       └── excel_parser.py    # Excel utilities
├── alembic/                   # Database migrations
│   ├── versions/
│   └── env.py
├── frontend/                  # React frontend
│   ├── src/
│   ├── public/
│   └── package.json
├── base_model.json           # Template source data
├── import_base_model.py      # Import script
├── requirements.txt          # Python dependencies
├── alembic.ini              # Alembic config
└── README.md                # This file
```

## 🚦 Status Attuale

- ✅ Backend API funzionante
- ✅ Database configurato
- ✅ Template base importato
- ✅ Sistema di template versionati attivo
- ✅ Endpoint admin templates operativi
- ⏳ Frontend da aggiornare per nuovi template
- ⏳ Integrazione assessment con template versionati
- ⏳ Migrazione PDF/Excel generation a nuovi template

## 🎯 Prossimi Step

1. **Backend Integration**
   - [ ] Collegare `AssessmentSession` a `template_version_id`
   - [ ] Aggiornare calcolo punteggi per template dinamici
   - [ ] Adattare generazione PDF/Excel

2. **Frontend Update**
   - [ ] Admin UI per gestione template
   - [ ] Form assessment dinamico da template
   - [ ] Selezione template/versione in creazione assessment

3. **SaaS Architecture**
   - [ ] Multi-tenant support (tenant_id)
   - [ ] Refactoring micro-modules
   - [ ] File storage per tenant

## 📞 Contatti & Repository

- **Repository**: https://github.com/sandrello1971/newassessment
- **Dominio**: newassessment.noscite.it
- **Server**: VPS Aruba - Ubuntu 22.04 LTS

## 📄 License

Proprietary - All rights reserved

---

**Versione**: 1.0.0  
**Ultimo aggiornamento**: 20 Novembre 2025  
**Stato**: Development / Refactoring in corso
