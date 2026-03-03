import api from '../api/client';

// Helper intern pentru a grupa textul din PDF pe "rânduri" comparabile cu Excel
function groupPdfItemsIntoRows(items) {
    let rows = [];
    let currentRow = [];
    let lastY = null;

    const sortedItems = [...items].sort((a, b) => b.transform[5] - a.transform[5]);

    for (const item of sortedItems) {
        const y = Math.round(item.transform[5]);
        if (lastY !== null && Math.abs(lastY - y) > 2) {
            if (currentRow.length) {
                currentRow.sort((a, b) => a.x - b.x);
                rows.push(currentRow.map(i => i.str));
            }
            currentRow = [];
        }
        currentRow.push({ str: item.str.trim(), x: item.transform[4] });
        lastY = y;
    }
    if (currentRow.length) {
        currentRow.sort((a, b) => a.x - b.x);
        rows.push(currentRow.map(i => i.str));
    }
    return rows;
}

export const handleSmartImport = async (files, _projects, _persons, forcedProjectId, onLog, onComplete) => {
    if (!files || !files.length) return;

    ononLog(`<i>Începe procesarea pentru ${files.length} fișier(e)...</i><br>`);

    if (!_projects || !_projects.length || !_persons || !_persons.length) {
        ononLog('<span style="color:var(--red)">❌ Eroare: Nu sunt proiecte sau persoane în baza de date!</span>');
        return;
    }

    let forcedProject = null;
    if (forcedProjectId) {
        forcedProject = _projects.find(p => p.id === forcedProjectId);
        ononLog(`<span style="color:var(--accent2)">ℹ️ Mod de import forțat pt: <b>${forcedProject.name} (SMIS ${forcedProject.smis})</b></span>`);
    }

    let successCount = 0;
    const MONTH_DICT = ["IANUARIE", "FEBRUARIE", "MARTIE", "APRILIE", "MAI", "IUNIE", "IULIE", "AUGUST", "SEPTEMBRIE", "OCTOMBRIE", "NOIEMBRIE", "DECEMBRIE"];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isPdf = file.name.toLowerCase().endsWith('.pdf');
        onLog(`<br><span style="color:#fff; border-top: 1px solid #333; display: block; padding-top: 8px;"><b>📄 [${file.name}]</b> Analiză...</span>`);

        let sheetsRows = {}; // A map of sheetName/pageIndex to Array of Rows
        let fullWorkbookText = "";

        try {
            const buffer = await file.arrayBuffer();

            // EXTRAGEM DATELE IN FORMAT "Tabelar" FIE CA E EXCEL, FIE CA E PDF
            if (!isPdf) {
                const wb = XLSX.read(buffer, { type: 'array' });
                for (const sn of wb.SheetNames) {
                    const sheet = wb.Sheets[sn];
                    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
                    sheetsRows[sn] = rows;
                    fullWorkbookText += JSON.stringify(rows).toUpperCase() + " ";
                }
            } else {
                if (typeof pdfjsLib === 'undefined') {
                    throw new Error("Librăria PDF.js nu a fost încărcată.");
                }
                const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
                for (let pNum = 1; pNum <= pdf.numPages; pNum++) {
                    const page = await pdf.getPage(pNum);
                    const content = await page.getTextContent();
                    const rawText = content.items.map(i => i.str).join(" ").toUpperCase();
                    fullWorkbookText += rawText + " ";

                    const rows = groupPdfItemsIntoRows(content.items);
                    // Denumim foile la fel ca sa detectam RA vs Pontaj din conținut
                    sheetsRows[`PAGE_${pNum}`] = rows;
                }
            }

            // --- IDENTIFICARE GLOBALĂ: SMIS, An, Lună, Persoană ---
            let foundSmis = forcedProject ? forcedProject.smis : null;
            let foundYear = null;
            let foundMonth = null;
            let foundPersonId = null;
            let foundPersonName = null;

            if (!forcedProject) {
                const smisMatch = fullWorkbookText.match(/SMIS[^\w]*(\d{5,})/);
                if (smisMatch) foundSmis = smisMatch[1];
            }

            const yearMatch = fullWorkbookText.match(/\b(202[4-9])\b/);
            if (yearMatch) foundYear = parseInt(yearMatch[1]);

            for (let m = 0; m < MONTH_DICT.length; m++) {
                if (fullWorkbookText.includes(MONTH_DICT[m])) {
                    foundMonth = m + 1; break;
                }
            }

            // An: cautam LANGA luna detectata (nu primul din document, care poate fi din date CIM/contract)
            if (foundMonth !== null) {
                const mName = MONTH_DICT[foundMonth - 1];
                const mIdx = fullWorkbookText.indexOf(mName);
                // Fereastra de cautare: 60 caractere inainte si 60 dupa luna
                const window60 = fullWorkbookText.substring(Math.max(0, mIdx - 60), mIdx + mName.length + 60);
                const yearNearMonth = window60.match(/\b(202[4-9])\b/);
                if (yearNearMonth) foundYear = parseInt(yearNearMonth[1]);
            }
            // Fallback la primul an din document daca nu l-am gasit langa luna
            if (!foundYear) {
                const yearMatch = fullWorkbookText.match(/\b(202[4-9])\b/);
                if (yearMatch) foundYear = parseInt(yearMatch[1]);
            }

            // Smart Person Identifier:
            // Căutăm cine pe lângă cine se află zona "Numele...". Așa evităm Responsabilii (Pintilie)
            const candidates = [];
            for (const p of _persons) {
                const n1 = (p.name + " " + p.fname).toUpperCase();
                const n2 = (p.fname + " " + p.name).toUpperCase();

                const idx1 = fullWorkbookText.indexOf(n1);
                const idx2 = fullWorkbookText.indexOf(n2);

                if (idx1 !== -1) candidates.push({ p, index: idx1, text: n1 });
                if (idx2 !== -1) candidates.push({ p, index: idx2, text: n2 });
            }

            const numeleIdx1 = fullWorkbookText.indexOf("NUMELE M"); // "Numele si prenumele" (M din "si" poate fi stricat)
            const numeleIdx2 = fullWorkbookText.indexOf("NUMELE");
            const bestNumeIdx = numeleIdx1 !== -1 ? numeleIdx1 : numeleIdx2;

            if (bestNumeIdx !== -1 && candidates.length > 0) {
                let closest = null;
                let minDiff = Infinity;

                for (const c of candidates) {
                    let diff = Math.abs(c.index - bestNumeIdx);
                    if (diff < minDiff) {
                        minDiff = diff;
                        closest = c;
                    }
                }

                // Dacă distanța e mai mare de 300 litere, poate a ratat
                if (closest && minDiff < 400) {
                    foundPersonId = closest.p.id;
                    foundPersonName = closest.p.name + " " + closest.p.fname;
                }
            }

            // Fallback (daca nu a mers faza cu "NUMELE", luam prima)
            if (!foundPersonId && candidates.length > 0) {
                foundPersonId = candidates[0].p.id;
                foundPersonName = candidates[0].p.name + " " + candidates[0].p.fname;
            }

            // Validare finală minime
            if (!foundPersonId) {
                onLog(`<span style="color:var(--text-muted)">• Ignorat: Nu am găsit numele niciunei persoane cunoscute.</span>`);
                continue;
            }
            if (!foundYear || !foundMonth) {
                onLog(`<span style="color:var(--text-muted)">• Ignorat (${foundPersonName}): Nu am putut detecta luna (${foundMonth})/anul (${foundYear}).</span>`);
                continue;
            }
            if (!foundSmis) {
                onLog(`<span style="color:var(--text-muted)">• Ignorat (${foundPersonName}): Nu am găsit cod SMIS, te rog selectează manual Proiectul Țintă.</span>`);
                continue;
            }

            const proj = forcedProject || _projects.find(px => String(px.smis) === String(foundSmis));
            if (!proj) {
                onLog(`<span style="color:var(--gold)">⚠️ Lipsă proiect: SMIS ${foundSmis} nu e creat!</span>`);
                continue;
            }

            // --- EXTRAGERE PE RÂNDURI ---
            let finalDays = {};
            let finalIntervals = {};
            let finalActivities = {};
            let totalHoursFound = 0;

            for (const sheetName in sheetsRows) {
                const rows = sheetsRows[sheetName];
                const upSheetName = sheetName.toUpperCase();

                // Detectare tip foaie: PRIORITATE la NUMELE tabului din Excel (mult mai sigur)!
                // Daca e tab PDF (PAGE_1 etc.), recurgem la analiza continutului
                const nameIsActivity = upSheetName.includes('RA_') || upSheetName.startsWith('RA') ||
                    upSheetName.includes('ACTIV') || upSheetName.includes('RAPORT');
                const nameIsPontaj = upSheetName.includes('PONTAJ');

                // Daca nu putem determina din nume, facem fallback la continut
                const sheetText = (!nameIsActivity && !nameIsPontaj) ? JSON.stringify(rows).toUpperCase() : '';
                const isActivitySheet = nameIsActivity || (!nameIsPontaj &&
                    (sheetText.includes('ACTIVITATI') || sheetText.includes('DESCRIERE ACTIVITATE')));

                // === REGULA PDF specifica ===
                // Paginile PDF care NU contin niciun interval orar sunt pagini RA/Norma → nu extragem ore din ele
                // (Intervalele sunt specifice foii de pontaj; foile RA au text narativ, nu timpi)
                let extractHoursFromThisSheet = true;
                if (sheetName.startsWith('PAGE_')) {
                    let pageHasAnyInterval = false;
                    for (const row of rows) {
                        for (const cell of (row || [])) {
                            const s = String(cell || '').trim();
                            if (/\d{1,2}[.:]\d{2}\s*-\s*\d{1,2}[.:]\d{2}/.test(s) ||
                                /^\d{1,2}\s*-\s*\d{1,2}$/.test(s)) {
                                pageHasAnyInterval = true;
                                break;
                            }
                        }
                        if (pageHasAnyInterval) break;
                    }
                    if (!pageHasAnyInterval) {
                        // Pagina PDF fara intervale = pagina de RA/Activitate → ore NU se extrag
                        extractHoursFromThisSheet = false;
                        onLog(`<span style="color:#6a7a96;font-size:11px">  ⏭ ${sheetName}: fara intervale detectate → tratat ca pagina RA (ore ignorate)</span>`);
                    }
                }

                // =========================================================
                // AUTO-BOUNDING: pt Excel-uri cu mai multe proiecte/SMIS
                // Incercam sa gasim pe ce coloana e codul SMIS vizat.
                // =========================================================
                let colFilterStart = 0;
                let colFilterEnd = 999;

                if (!isPdf && foundSmis) {
                    let targetCol = -1;
                    let otherCols = [];
                    let maxHeaderRow = Math.min(30, rows.length);

                    // --- DUAL SHEET DETECTION (Bulletproof) ---
                    let intervalCols = [];
                    for (let r = 0; r < maxHeaderRow; r++) {
                        const hr = rows[r] || [];
                        for (let c = 0; c < hr.length; c++) {
                            const val = String(hr[c] || '').toUpperCase();
                            // Ne bazam pe "Interval orar", care apare de atatea ori cate proiecte sunt!
                            if (val.includes('INTERVAL') && val.includes('ORAR')) {
                                if (!intervalCols.includes(c)) intervalCols.push(c);
                            }
                        }
                    }
                    intervalCols.sort((a, b) => a - b);

                    // Daca am gasit 2 coloane de "Interval orar", stim sigur ca e tabelul cu dubla finantare
                    if (intervalCols.length >= 2 && proj) {
                        const isLaserFo = String(proj.name).toUpperCase().includes('LASER');
                        const isAirNavy = String(proj.name).toUpperCase().includes('AIR');

                        if (isLaserFo) {
                            colFilterStart = Math.max(1, intervalCols[0] - 1);
                            colFilterEnd = intervalCols[1] - 1;
                            targetCol = -2; // Stop normal logic
                            onLog(`<span style="color:var(--text-muted);font-size:11px">🔍 Tabel Multi-Proiect: Extrag doar ${proj.name} din stânga (col ${colFilterStart} la ${colFilterEnd - 1}).</span>`);
                        } else if (isAirNavy) {
                            colFilterStart = Math.max(1, intervalCols[1] - 1);
                            colFilterEnd = 999;
                            targetCol = -2; // Stop normal logic
                            onLog(`<span style="color:var(--text-muted);font-size:11px">🔍 Tabel Multi-Proiect: Extrag doar ${proj.name} din dreapta (col ${colFilterStart} la final).</span>`);
                        }
                    }

                    // --- DACA NU E DUAL SHEET, RECURGE LA CAUTAREA TEXTULUI SMIS ---
                    if (targetCol === -1) {
                        for (let r = 0; r < maxHeaderRow; r++) {
                            const hr = rows[r] || [];
                            for (let c = 0; c < hr.length; c++) {
                                const val = String(hr[c] || '').toUpperCase();
                                if (val.includes(String(foundSmis))) {
                                    if (targetCol === -1) targetCol = c;
                                } else {
                                    _projects.forEach(px => {
                                        if (px.smis && px.smis !== foundSmis && val.includes(String(px.smis))) {
                                            otherCols.push(c);
                                        }
                                    });
                                }
                                if (val.includes('TOTAL') && val.includes('ORE') && !val.includes('ZI') && c > 1) {
                                    otherCols.push(c);
                                }
                            }
                        }

                        if (targetCol !== -1) {
                            // Conform formatului oficial Pontaj AIR NAVY/LASER,
                            // orele pontate (si intervalul) sunt situate pe primele coloane! 
                            // Norma e aflata la coloana de dupa. 
                            // Fara dubla-finantare detectata, restrictionam strict pe coloanele din stanga:
                            colFilterStart = 0;
                            colFilterEnd = 3;
                            onLog(`<span style="color:var(--text-muted);font-size:11px">🔍 Auto-Bound: Găsit ${foundSmis} la col=${targetCol} -> Limite forțate la [0, 3) (se ignoră coloanele de după)</span>`);
                        } else {
                            colFilterStart = 0;
                            colFilterEnd = 999;
                            onLog(`<span style="color:var(--text-muted);font-size:11px">🔍 Avertisment: Nu am găsit codul ${foundSmis} pe nicio coloană. Citesc orele automat.</span>`);
                        }
                    }
                }

                for (let r = 0; r < rows.length; r++) {
                    const row = rows[r] || [];

                    let dayNum = null;
                    let dayColIdx = -1;

                    // Oprim scanarea la semnaturi sau Totaluri
                    if (JSON.stringify(row).toUpperCase().includes("TOTAL") && !JSON.stringify(row).toUpperCase().includes("ZI")) continue;

                    for (let c = 0; c < 3 && c < row.length; c++) {
                        const cellTrimmed = String(row[c] || '').trim();
                        const cellNum = parseInt(cellTrimmed);
                        if (!isNaN(cellNum) && cellNum >= 1 && cellNum <= 31 && String(cellNum) === cellTrimmed) {
                            dayNum = cellNum;
                            dayColIdx = c;
                            break;
                        }
                    }

                    if (dayNum !== null) {
                        let dayHours = null;
                        let foundInterval = null;
                        let foundText = null;

                        for (let c = dayColIdx + 1; c < row.length; c++) {
                            if (c < colFilterStart) continue;
                            if (c >= colFilterEnd) continue;

                            const str = String(row[c] || '').trim();
                            if (!str) continue;
                            const upStr = str.toUpperCase();

                            // 1. Căutăm interval — acceptăm și format fără minute: "18-19", plus formatul cu punct: "17.30-19.30"
                            if (/\d{1,2}[.:]\d{2}\s*-\s*\d{1,2}[.:]\d{2}/.test(str) ||
                                /^\d{1,2}\s*-\s*\d{1,2}$/.test(str)) {
                                foundInterval = str;
                                continue; // skip, nu e o ora
                            }

                            // 2. Căutăm ore — comparație lenientă (acceptăm "2", "2.0", "2,0")
                            // ATENTIE: ore se extrag DOAR din pagini cu intervale (foile RA sunt excluse)
                            const asFloat = parseFloat(str.replace(/,/g, '.'));
                            if (extractHoursFromThisSheet && !isNaN(asFloat) && asFloat >= 0.5 && asFloat <= 16 && !/[a-zA-Z]/.test(str)) {
                                if (dayHours === null) dayHours = asFloat;
                            }

                            // Excepții CO — valide pe orice pagina
                            if (extractHoursFromThisSheet && ['CO', 'CM', 'CED', 'CFP', 'ABS', 'CIC'].includes(upStr)) {
                                dayHours = upStr;
                            }

                            // 3. Activitate
                            if (str.length > 20 && /[a-zA-ZăîâșțĂÎÂȘȚ]/.test(str)) {
                                // PDF-urile impart coloana de text pe mai multe celule uneori
                                if (foundText) foundText += " " + str;
                                else foundText = str;
                            }
                        }

                        if (dayHours !== null) {
                            // Deduplicare: daca ziua a fost deja inregistrata din alt sheet, nu o suprascriem cu valori din alte sheet-uri
                            if (!finalDays.hasOwnProperty(dayNum)) {
                                finalDays[dayNum] = dayHours;
                                if (typeof dayHours === 'number') {
                                    onLog(`<span style="color:#6a7a96;font-size:11px">  → Zi ${dayNum}: ${dayHours}h (${sheetName})</span>`);
                                }
                            }
                        }
                        if (foundInterval !== null) finalIntervals[dayNum] = foundInterval;
                        if (foundText !== null && isActivitySheet) finalActivities[dayNum] = foundText;
                    }
                }
            }

            // ================================================================
            // CROSS-VALIDARE: Ore pontaj vs. Raport Activitate (double-check)
            // ================================================================
            // Calculam "modul" (valoarea cea mai frecventa) din zilele care au
            // SI ore SI interval confirmat — acestea sunt date de incredere.
            // Zilele fara interval care deviaza semnificativ fata de mod → corectate automat.
            const confirmedHours = Object.entries(finalDays)
                .filter(([d, h]) => typeof h === 'number' && finalIntervals[d])
                .map(([_, h]) => h);

            if (confirmedHours.length >= 3) { // avem suficiente zile confirmate pentru a calcula modul
                const freq = {};
                confirmedHours.forEach(h => freq[h] = (freq[h] || 0) + 1);
                const modeHours = parseFloat(Object.keys(freq).reduce((a, b) => freq[a] > freq[b] ? a : b));

                let correctedCount = 0;
                Object.keys(finalDays).forEach(d => {
                    const h = finalDays[d];
                    if (typeof h === 'number' && !finalIntervals[d]) {
                        // Ziua nu are interval confirmat si are valoare diferita de mod → suspicious
                        if (Math.abs(h - modeHours) > modeHours * 0.5) {
                            onLog(`<span style="color:var(--gold);font-size:11px">⚠️ Zi ${d}: ${h}h (fara interval, deviere fata de mod ${modeHours}h) → corectat la ${modeHours}h</span>`);
                            finalDays[d] = modeHours;
                            correctedCount++;
                        }
                    }
                });
                if (correctedCount > 0) {
                    onLog(`<span style="color:var(--gold)">🔁 Cross-validare: ${correctedCount} zi(le) corectate automat (mod = ${modeHours}h/zi)</span>`);
                }
            }

            // totalHoursFound calculat din finalDays (nu acumulat per iteratie) pentru afisaj corect in log
            totalHoursFound = Object.values(finalDays).reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0);


            if (Object.keys(finalDays).length === 0 && Object.keys(finalActivities).length === 0) {
                onLog(`<span style="color:var(--gold)">⚠️ N-am extras nimic pentru ${foundPersonName}. Poate formatul intern e prea modificat.</span>`);
                continue;
            }

            // --- SALVARE IN DB ---
            const txtCnt = Object.keys(finalActivities).length;
            const intCnt = Object.keys(finalIntervals).length;
            onLog(`<span style="color:var(--green)">✅ <b>[SMIS ${proj.smis}] ${MONTH_DICT[foundMonth - 1]} ${foundYear}</b> pt <b>${foundPersonName}</b>. Găsit: ${totalHoursFound}h pontate, ${intCnt} intervale, ${txtCnt} descrieri.</span>`);

            try {
                let mData = {};
                try {
                    const existingRes = await api.get(`/pontaj/${proj.id}/${foundYear}/${foundMonth}`);
                    mData = existingRes.data || {};
                } catch (e) { }

                if (!mData[foundPersonId]) mData[foundPersonId] = { days: {}, norma: {}, intervals: {}, activities: {} };
                if (!mData[foundPersonId].intervals) mData[foundPersonId].intervals = {};
                if (!mData[foundPersonId].activities) mData[foundPersonId].activities = {};

                for (let d = 1; d <= 31; d++) {
                    if (finalDays[d]) mData[foundPersonId].days[d] = finalDays[d];
                    if (finalIntervals[d]) mData[foundPersonId].intervals[d] = finalIntervals[d];
                    if (finalActivities[d]) mData[foundPersonId].activities[d] = finalActivities[d];
                }

                // Adaugam persoana la proj.members daca nu e deja acolo
                try {
                    const projFresh = _projects.find(px => px.id === proj.id);
                    if (projFresh && !projFresh.members) projFresh.members = [];
                    if (projFresh && !projFresh.members.find(m => m.personId === foundPersonId)) {
                        const pObj = _persons.find(px => px.id === foundPersonId);

                        // Incercam sa gasim contractul care se potriveste cu partenerul proiectului
                        const specificEmp = (pObj.employers || []).find(e => e.partner === projFresh.partner) || {};

                        projFresh.members.push({
                            personId: foundPersonId,
                            partner: specificEmp.partner || pObj.partner || projFresh.partner || 'LP-BST',
                            type: pObj.type || 'Cercetare',
                            defaultOre: specificEmp.ore || pObj.defaultOre || 8,
                            defaultNorma: specificEmp.norma || pObj.defaultNorma || 0
                        });
                        await api.put(`/projects/${projFresh.id}`, projFresh);
                        onLog(`<span style="color:var(--accent2);font-size:11px">  👤 Membru nou adăugat automat în proiect pe contractul: ${specificEmp.partner || 'Implicit'}</span>`);
                    }
                } catch (e) { /* silent */ }

                await api.post(`/pontaj/${proj.id}/${foundYear}/${foundMonth}`, mData);
                successCount++;
            } catch (e) {
                onLog(`<span style="color:var(--red)">Eroare rețea salvard: ${e.message}</span>`);
            }

        } catch (err) {
            onLog(`<span style="color:var(--red)">Eroare la citirea fișierului ${file.name}: ${err.message}</span>`);
        }
    }

    onLog(`<br><span style="color:var(--accent2);font-weight:700">🚀 IMPORT COMPLET! Baza de date este actualizată.</span>`);
    onLog(`<span style="color:var(--text-muted)">Au fost înregistrate cu succes ${successCount} seturi de date.</span>`);
    event.target.value = '';
    if (typeof renderHistoryTable === 'function') setTimeout(() => renderHistoryTable(), 500);
}


