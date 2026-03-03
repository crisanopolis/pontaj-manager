// generator.js - Logica pentru generarea fiselor de pontaj duale model nou (Feb 2026)
// Requires: XLSXStyle (loaded FIRST as alias before SheetJS 0.20 overwrites window.XLSX),
//           JSZip, triggerFileDownload() from app.js, _projects/_persons globals from app.js

window.generateFiseAll = async function (targetPersonId = null) {
    const year = parseInt(document.getElementById(targetPersonId ? 'indiv-year' : 'gen-year').value, 10);
    const month = parseInt(document.getElementById(targetPersonId ? 'indiv-month' : 'gen-month').value, 10);

    const getValSafe = (id, def) => { const el = document.getElementById(id); return el?.value ?? def; };
    const instName = getValSafe('gen-inst', 'BlueSpace Technology SA');
    const intocmitName = getValSafe('gen-intocmit', 'Adrian Dragomir');
    const aprobatName = getValSafe('gen-aprobat', 'Ion Doe');

    const logEl = document.getElementById('gen-log');
    const log = (msg) => { if (logEl) logEl.textContent = msg; };

    log('Obținere date...');

    try {
        if (!_projects.length || !_persons.length) await loadAll();

        // Fetch pontaj pentru toate proiectele in luna/an data
        const allPontaje = {}; // projId -> { personId -> pontajData }
        await Promise.allSettled(
            _projects.map(async (proj) => {
                const res = await fetch(`${API}/pontaj/${proj.id}/${year}/${month}`);
                if (res.ok) allPontaje[proj.id] = await res.json();
            })
        );

        const zip = new JSZip();
        let fileCount = 0;

        const personsToProcess = targetPersonId
            ? _persons.filter(p => p.id === targetPersonId)
            : _persons;

        for (const person of personsToProcess) {
            const pProjects = [];

            for (const proj of _projects) {
                const pontajMap = allPontaje[proj.id];
                if (!pontajMap?.[person.id]?.days) continue;

                const days = pontajMap[person.id].days;
                const totalOre = Object.values(days).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
                const hasSpecial = Object.values(days).some(v => v === 'CO' || v === 'CM');

                if (totalOre > 0 || hasSpecial) {
                    pProjects.push({ projInfo: proj, pontaj: pontajMap[person.id] });
                }
            }

            if (pProjects.length === 0) continue;
            log(`Se generează pentru ${person.name} ${person.fname}...`);

            for (let i = 0; i < pProjects.length; i++) {
                const mainProject = pProjects[i];
                const otherProjects = pProjects.filter((_, idx) => idx !== i);

                const wb = createWorkbookForProject(person, mainProject, otherProjects, year, month, instName, intocmitName, aprobatName);
                // XLSXStyle (v0.8 fork) is the only one that supports cell styling on write.
                // It requires type:'binary'; we then convert to ArrayBuffer via s2ab().
                const wbout = XLSXStyle.write(wb, { bookType: 'xlsx', type: 'binary' });
                const buf = s2ab(wbout);

                const safeName = `${person.name}_${person.fname}`.replace(/[^a-z0-9]/gi, '_');
                const smis = mainProject.projInfo.smis || 'NOSMIS';
                const filename = `FisaPontaj_${smis}_${safeName}_${year}-${String(month).padStart(2, '0')}.xlsx`
                    .replace(/[\\/:*?"<>|\r\n]/g, '_');

                const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

                if (targetPersonId) {
                    // Use the modern File System Access API with fallback (defined in app.js)
                    await triggerFileDownload(blob, filename);
                    log(`✅ Gata! S-a descărcat fișa de pontaj pentru ${person.name}.`);
                } else {
                    zip.file(filename, buf);
                }
                fileCount++;
            }

            if (targetPersonId) return; // single-person: stop after first match
        }

        if (fileCount === 0) {
            log('Nicio persoană nu are ore pontate în luna aleasă.');
            if (targetPersonId) toast('⚠️', 'Această persoană nu are ore pontate în luna respectivă.');
            return;
        }

        log('Se arhivează (ZIP)...');
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipFilename = `Fise_Pontaj_${MONTHS_RO[month - 1]}_${year}.zip`;
        await triggerFileDownload(zipBlob, zipFilename);
        log(`✅ Gata! S-au generat și descărcat ${fileCount} fișe de pontaj.`);

    } catch (err) {
        log('❌ Eroare: ' + err.message);
        console.error('[generateFiseAll]', err);
    }
};

// ---------------------------------------------------------------------------
//  Utility helpers
// ---------------------------------------------------------------------------

/** Days in month (1-indexed month). */
function getDaysInMonth(y, m) { return new Date(y, m, 0).getDate(); }

/** Day-of-week index (0=Sun) for a given date. */
function getDayOfWeek(y, m, d) { return new Date(y, m - 1, d).getDay(); }

const DOW_SHORT = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

/**
 * Convert a binary string (from XLSXStyle.write type:'binary') to an ArrayBuffer.
 * This is the standard interop pattern for xlsx-style 0.8.
 */
function s2ab(s) {
    const buf = new ArrayBuffer(s.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
    return buf;
}

/** Thin border descriptor for xlsx-style. */
function getBorders() {
    return {
        top: { style: 'thin', color: { auto: 1 } },
        bottom: { style: 'thin', color: { auto: 1 } },
        left: { style: 'thin', color: { auto: 1 } },
        right: { style: 'thin', color: { auto: 1 } },
    };
}

// ---------------------------------------------------------------------------
//  Workbook builder
// ---------------------------------------------------------------------------

/**
 * Build an XLSXStyle workbook for a single project sheet.
 * NOTE: XLSX.utils (SheetJS 0.20) is used for book_new / aoa_to_sheet / book_append_sheet
 * because XLSXStyle 0.8 does not reliably expose these on its utils object.
 * XLSXStyle.write() is used exclusively for the final serialisation (it applies cell styles).
 */
function createWorkbookForProject(person, mainProj, otherProjs, year, month, instName, intocmitName, aprobatName) {
    const wb = XLSX.utils.book_new();
    const sheetData = [];
    const totalDays = getDaysInMonth(year, month);
    const mName = MONTHS_RO[month - 1];

    // ── Styles ──────────────────────────────────────────────────────────────
    const styleTitle = { font: { bold: true, sz: 12 }, alignment: { horizontal: 'center' } };
    const styleBoldCenter = { font: { bold: true }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: getBorders() };
    const styleCenter = { alignment: { horizontal: 'center', vertical: 'center' }, border: getBorders() };
    const styleLeftBorder = { alignment: { horizontal: 'left', vertical: 'center', wrapText: true }, border: getBorders() };

    // ── Header ──────────────────────────────────────────────────────────────
    sheetData.push([{ v: instName, s: { font: { bold: true } } }]);
    sheetData.push([]);
    sheetData.push(['', '', { v: `Fișă individuală pontaj și de alocare a timpului de lucru\nLuna ${mName} Anul ${year}`, s: styleTitle }]);
    sheetData.push([]);

    const P1 = mainProj;
    const P2 = otherProjs[0] ?? null; // only first secondary project used for dual-column layout
    const P1_Role = (P1.projInfo.members ?? []).find(m => m.personId === person.id)?.type ?? 'Expert / Management';
    const P2_Role = P2 ? ((P2.projInfo.members ?? []).find(m => m.personId === person.id)?.type ?? 'Expert / Management') : '';

    sheetData.push([{ v: `Nr. contract de finanțare: ${P1.projInfo.contract ?? '-'}    SMIS ${P1.projInfo.smis}`, s: styleLeftBorder }]);
    sheetData.push([{ v: `Proiect: ${P1.projInfo.name}`, s: styleLeftBorder }]);
    sheetData.push([{ v: `Denumire partener: ${P1.projInfo.partner ?? instName}`, s: styleLeftBorder }]);
    sheetData.push([{ v: `Nume și Prenume: ${person.name} ${person.fname}   |   CNP: ${person.cnp ?? '-'}`, s: styleLeftBorder }]);
    sheetData.push([{ v: `Rol / Funcție în proiect: ${P1_Role}`, s: styleLeftBorder }]);
    sheetData.push([]);

    // ── Column headers ───────────────────────────────────────────────────────
    const header1 = [{ v: 'Ziua', s: styleBoldCenter }, { v: 'Nr. ore\nlucrate', s: styleBoldCenter }, { v: 'Interval orar', s: styleBoldCenter }];
    const emptyRow = [{ v: 'D/Z', s: styleBoldCenter }, { v: 'PR 1', s: styleBoldCenter }, { v: '', s: styleBoldCenter }];

    if (P2) {
        header1.push({ v: 'Nr. ore\nlucrate', s: styleBoldCenter }, { v: 'Interval orar', s: styleBoldCenter });
        emptyRow.push({ v: 'PR 2', s: styleBoldCenter }, { v: '', s: styleBoldCenter });
    }
    header1.push({ v: 'Total ore/zi', s: styleBoldCenter });
    emptyRow.push({ v: '', s: styleBoldCenter });

    sheetData.push(header1);
    sheetData.push(emptyRow);

    // ── Day rows ─────────────────────────────────────────────────────────────
    let totalP1 = 0;
    let totalP2 = 0;

    for (let d = 1; d <= totalDays; d++) {
        const h1 = P1.pontaj.days[d] ?? 0;
        const int1 = P1.pontaj.intervals?.[d] ?? '';
        if (typeof h1 === 'number') totalP1 += h1;

        const row = [
            { v: d, s: styleCenter },
            { v: h1 === 0 ? '' : h1, s: styleCenter },
            { v: typeof h1 === 'number' ? int1 : '', s: styleCenter },
        ];

        let dayTotal = typeof h1 === 'number' ? h1 : 0;

        if (P2) {
            const h2 = P2.pontaj.days[d] ?? 0;
            const int2 = P2.pontaj.intervals?.[d] ?? '';
            if (typeof h2 === 'number') { totalP2 += h2; dayTotal += h2; }
            row.push({ v: h2 === 0 ? '' : h2, s: styleCenter }, { v: typeof h2 === 'number' ? int2 : '', s: styleCenter });
        }

        row.push({ v: dayTotal > 0 ? dayTotal : '', s: styleCenter });
        sheetData.push(row);
    }

    // ── Totals row ───────────────────────────────────────────────────────────
    const totalRow = [{ v: 'TOTAL', s: styleBoldCenter }, { v: totalP1, s: styleBoldCenter }, { v: '', s: styleBoldCenter }];
    let grandTotal = totalP1;
    if (P2) {
        totalRow.push({ v: totalP2, s: styleBoldCenter }, { v: '', s: styleBoldCenter });
        grandTotal += totalP2;
    }
    totalRow.push({ v: grandTotal, s: styleBoldCenter });
    sheetData.push(totalRow);
    sheetData.push([]);

    // ── Signatures ───────────────────────────────────────────────────────────
    const signRow = [{ v: `Întocmit de:\n${intocmitName}`, s: { font: { bold: true }, alignment: { wrapText: true, vertical: 'top' } } }, ''];
    if (P2) signRow.push('', '');
    signRow.push({ v: `Aprobat:\n${aprobatName}`, s: { font: { bold: true }, alignment: { wrapText: true, vertical: 'top' } } });
    sheetData.push(signRow);

    // ── Sheet assembly (XLSX.utils for book ops, XLSXStyle later for write) ──
    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    const cols = [{ wch: 6 }, { wch: 10 }, { wch: 18 }];
    if (P2) cols.push({ wch: 10 }, { wch: 18 });
    cols.push({ wch: 15 });
    ws['!cols'] = cols;

    XLSX.utils.book_append_sheet(wb, ws, 'PONTAJ');
    return wb;
}
