README – SISTEM DE DETECȚIE ȘI CLASIFICARE A ANOMALIILOR PRIN ANALIZA TRAFICULUI DIN REȚEA
Descriere:
Acest proiect detectează anomalii în traficul de rețea în timp real folosind un model de Machine Learning (Random Forest). Sistemul include un backend Flask, un frontend React și o logică de captură a traficului folosind PyShark.
Tehnologii:
- Python
- Flask, Flask-SocketIO
- PyShark
- PostgreSQL
- React + Vite
- WebSocket
- Joblib, scikit-learn
Structura Proiectului:

.
├── backend/
│   ├── model/
│   │   ├── model.py
|   |   ├── final_dataset.csv  <-- trebuie adaugat manual
│   ├── api_server.py
│   ├── capture_logic.py
│   └── anomaly_detector_model.pkl  <-- trebuie adăugat manual
├── dashboard/
│   └── detector-dashboard/
│       ├── components/
│       │   ├── AlertsTable.jsx
│       │   ├── Controls.jsx
│       │   ├── FilterControls.jsx
│       │   ├── Footer.jsx
│       │   ├── Header.jsx
│       │   ├── NotificationControl.jsx
│       │   ├── StatsCards.jsx
│       │   ├── SystemMessage.jsx
│       │   └── ThreatAlert.jsx
│       ├── hooks/
│       │   └── useWebSocket.jsx
│       ├── utils/
│       │   └── helpers.jsx
│       ├── App.css
│       ├── App.jsx
│       ├── index.css
│       ├── index.jsx
│       ├── main.jsx
│       ├── TrafficCharts.css
│       ├── traffic_chart.jsx
│       ├── vite.config.js
│       ├── package.json
│       ├── package-lock.json
│       ├── index.html
│       └── README.md
├── start_system.py
└── README.md

Instrucțiuni pentru rulare:
1. Clonare repository:
   git clone https://github.com/71ana/Licenta-upt.git

2. Adaugă manual următoarele fișiere (nu sunt în GitHub din cauza dimensiunii):
   - anomaly_detector_model.pkl → în folderul `backend/`
   - final_dataset.csv → în folderul `backend/` sau in alta locatie, existenta sau absenta lui nu afecteaza functionarea sistemului

   Link de descărcare: https://drive.google.com/drive/folders/1o1JIw-KNILAci-oDzCPOtmT6DS3WniKd?usp=sharing

3. Rulează scriptul `start_system.py`:
   - Acesta verifică automat dacă există dependințe și baza de date.
   - Pornește backendul, captura de trafic și interfața React automat.

4. Deschide în browser: http://localhost:5173/
Notă:
Este important să ruleze `start_system.py`, deoarece acesta gestionează toate componentele în mod automat.
Dacă întâmpinați probleme la rulare, verificați că PostgreSQL rulează, că baza de date `traffic` există sau este creată de script, și că fișierele lipsă sunt prezente.
Autor: Flavia Liana Stegaru – UPT, Facultatea AC
