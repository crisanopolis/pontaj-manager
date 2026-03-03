# Pontaj Manager v2.1

Sistem modern de gestiune a pontajului pentru proiecte CD (Cercetare-Dezvoltare), optimizat pentru multi-finanțare și reguli complexe de alocare a personalului.

## 🚀 Caracteristici Cheie

- **Gestiune Multi-Contract**: O persoană poate fi asociată cu mai mulți angajatori (firme), fiecare cu propria normă și ore de bază.
- **Echipă Proiect**: Posibilitatea de a defini roluri (Cercetare/Management) și contracte specifice pentru fiecare membru, în funcție de proiect.
- **Dashboard Global**: Vizualizare agregată a orelor și a forței de muncă pe toate proiectele active dintr-o perioadă aleasă.
- **Import Smart**: Algoritm avansat care extrage automat datele de pontaj din fișiere PDF și Excel (chiar și cu layout-uri complexe sau dublă finanțare).
- **Export Excel Automat**: Generare instantanee a fișelor de pontaj (ZIP) și a **Centralizatorului Cumulativ** (tabel unic pentru toți angajații) conform modelelor oficiale de audit.
- **Design Cyberpunk-Lite**: Interfață ultra-vibrantă, dark-mode, optimizată pentru productivitate și utilizare pe mobil.
- **Offline Ready**: Funcționalitate de bază disponibilă chiar și fără conexiune la internet.

## 📁 Structură Proiect

Proiectul este organizat ca un mono-repo:

- `/app`: Backend REST API (Node.js + Express + SQLite/JSON).
- `/frontend`: Aplicație Single Page (React + Vite + Material UI).
- `/data`: Directorul de stocare al bazei de date și fișierelor de sistem.

## 🛠️ Instalare și Pornire

### Cerințe:
- Node.js v22+

### Backend (app)
```bash
cd app
npm install
npm start
```
*Notă: Pentru a folosi SQLite în loc de fișiere JSON, porniți cu `USE_SQLITE=true npm start`.*

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 📡 API Reference (Sumar)

- `GET /api/projects`: Listă proiecte.
- `POST /api/projects`: Creare proiect nou.
- `PUT /api/projects/:id`: Update proiect (inclusiv echipa).
- `GET /api/persons`: Listă personal.
- `POST /api/persons`: Adăugare persoană (cu lista de contracte).
- `GET /api/pontaj/:projectId/:year/:month`: Recuperare date pontaj.
- `POST /api/pontaj/:projectId/:year/:month`: Salvare date pontaj.
- `GET /api/dashboard/:year/:month`: Statistici globale.

## 🧪 Testare

Rulează testele din directorul corespunzător:
- **Backend**: `npm test` (Jest + Supertest)
- **Frontend**: `npm test` (Vitest)

## 📄 Licență
Proprietate Bluespace Technology. Toate drepturile rezervate.
