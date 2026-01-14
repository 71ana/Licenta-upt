# SISTEM DE DETECȚIE ȘI CLASIFICARE A ANOMALIILOR PRIN ANALIZA TRAFICULUI DIN REȚEA

## Descriere

Acest proiect detectează anomalii în traficul de rețea în timp real folosind un model de Machine Learning (Random Forest). Sistemul include un backend Flask, un frontend React și o logică de captură a traficului folosind PyShark.

## Tehnologii

- **Python**
- **Flask, Flask-SocketIO**
- **PyShark**
- **PostgreSQL**
- **React + Vite**
- **WebSocket**
- **Joblib, scikit-learn**

## Structura Proiectului

```
.
├── backend/
│   ├── model/
│   │   ├── model.py
│   │   └── final_dataset.csv                    <-- trebuie adaugat manual
│   ├── anomaly_detector_model.pkl           <-- trebuie adaugat manual   
│   ├── api_server.py
│   └── capture_logic.py
│
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
│
├── start_system.py
└── README.md
```

## Instrucțiuni pentru rulare

### 1. Clonare repository
```bash
git clone https://github.com/71ana/Licenta-upt.git
```

### 2. Adăugare fișiere manuale
Adăugați manual următoarele fișiere (nu sunt în GitHub din cauza dimensiunii):

- `anomaly_detector_model.pkl` → în folderul `backend/`
- `final_dataset.csv` → în folderul `backend/` sau în altă locație (existența sau absența lui nu afectează funcționarea sistemului)

**Link de descărcare:** [Google Drive](https://drive.google.com/drive/folders/1o1JIw-KNILAci-oDzCPOtmT6DS3WniKd?usp=sharing)

### 3. Rulare sistem
```bash
python start_system.py
```

- Acesta verifică automat dacă există dependințe și baza de date
- Pornește backend-ul, captura de trafic și interfața React automat

### 4. Accesare aplicație
Deschideți în browser: [http://localhost:5173/](http://localhost:5173/)

## Notă importantă

Este important să rulați `start_system.py`, deoarece acesta gestionează toate componentele în mod automat.

Dacă întâmpinați probleme la rulare, verificați că:
- PostgreSQL rulează
- Baza de date `traffic` există sau este creată de script
- Fișierele lipsă sunt prezente

---

**Autor:** Flavia Liana Stegaru – UPT, Facultatea AC
