README – Aplicație Practică Licență
1. Adresa repository
https://github.com/71ana/Licenta-upt.git
2. Descriere generală
Sistem de detecție a anomaliilor în trafic de rețea, cu captură live, analiză machine learning și afișare interactivă printr-o interfață web React. Proiectul permite monitorizarea în timp real și alertarea utilizatorului în caz de amenințări detectate.
3. Tehnologii utilizate
- Backend: Python Flask, PyShark, PostgreSQL
- Frontend: React, WebSocket
- Machine Learning: Random Forest
- Notificări: WebSocket + Notificări Desktop
4. Pași de compilare și rulare
1. Clonare repository:
git clone https://github.com/71ana/Licenta-upt.git
2. Instalare backend:
cd backend
pip install -r requirements.txt
3. Instalare frontend:
cd ../dashboard
npm install
4. Creare baza de date:
createdb traffic
5. Pornire sistem:
python start_system.py
5. Observații finale
Sistemul este funcțional pe Windows 10/11 cu interfață Wi-Fi activă și PostgreSQL configurat local. Datele de trafic sunt procesate în timp real și prezentate vizual în dashboard.

Notă: Din motive legate de dimensiunea fișierelor, modelul antrenat (.pkl) și setul de date utilizat pentru antrenare/testare nu au fost încărcate în repository.
