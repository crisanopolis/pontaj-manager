import api from '../api/client';

export const generateFiseAll = async (
    { year, month, instName, intocmitName, aprobatName, targetPersonId },
    _projects,
    _persons,
    onLog
) => {
    onLog('Obținere date...');

    try {
        if (!_projects.length || !_persons.length) {
            onLog('Eroare: Nu sunt proiecte sau persoane valide.');
            return;
        }

        const allPontaje = {};
        await Promise.allSettled(
            _projects.map(async (proj) => {
                const res = await api.get(`/pontaj/${proj.id}/${year}/${month}`);
                if (res.data) allPontaje[proj.id] = res.data;
            })
        );

        const zip = new JSZip();
        let fileCount = 0;

        const personsToProcess = targetPersonId
            ? _persons.filter(p => p.id === targetPersonId)
            : _persons;

        const MONTHS_RO = ['IAN', 'FEB', 'MAR', 'APR', 'MAI', 'IUN', 'IUL', 'AUG', 'SEP', 'OCT', 'NOI', 'DEC'];

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
            onLog(`Se generează pentru ${person.name} ${person.fname}...`);

            for (let i = 0; i < pProjects.length; i++) {
                const mainProject = pProjects[i];
                const otherProjects = pProjects.filter((_, idx) => idx !== i);

                const wb = createWorkbookForProject(person, mainProject, otherProjects, year, month, instName, intocmitName, aprobatName, MONTHS_RO);

                const wbout = XLSXStyle.write(wb, { bookType: 'xlsx', type: 'binary' });
                const buf = s2ab(wbout);

                const safeName = `${person.name}_${person.fname}`.replace(/[^a-z0-9]/gi, '_');
                const smis = mainProject.projInfo.smis || 'NOSMIS';
                const filename = `FisaPontaj_${smis}_${safeName}_${year}-${String(month).padStart(2, '0')}.xlsx`
                    .replace(/[\\/:*?"<>|\r\n]/g, '_');

                const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

                if (targetPersonId) {
                    await triggerFileDownload(blob, filename);
                    onLog(`✅ Gata! S-a descărcat fișa de pontaj pentru ${person.name}.`);
                } else {
                    zip.file(filename, buf);
                }
                fileCount++;
            }

            if (targetPersonId) return;
        }

        if (fileCount === 0) {
            onLog('Nicio persoană nu are ore pontate în luna aleasă.');
            return;
        }

        if (!targetPersonId) {
            onLog('Se arhivează (ZIP)...');
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const zipFilename = `Fise_Pontaj_${MONTHS_RO[month - 1]}_${year}.zip`;
            await triggerFileDownload(zipBlob, zipFilename);
            onLog(`✅ Gata! S-au generat și descărcat ${fileCount} fișe de pontaj.`);
        }

    } catch (err) {
        onLog('❌ Eroare: ' + err.message);
        console.error('[generateFiseAll]', err);
    }
};

function getDaysInMonth(y, m) { return new Date(y, m, 0).getDate(); }

function s2ab(s) {
    const buf = new ArrayBuffer(s.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
    return buf;
}

function getBorders() {
    return {
        top: { style: 'thin', color: { auto: 1 } },
        bottom: { style: 'thin', color: { auto: 1 } },
        left: { style: 'thin', color: { auto: 1 } },
        right: { style: 'thin', color: { auto: 1 } },
    };
}

function createWorkbookForProject(person, mainProj, otherProjs, year, month, instName, intocmitName, aprobatName, MONTHS_RO) {
    const wb = XLSX.utils.book_new();
    const sheetData = [];
    const totalDays = getDaysInMonth(year, month);
    const mName = MONTHS_RO[month - 1];

    const styleTitle = { font: { bold: true, sz: 12 }, alignment: { horizontal: 'center' } };
    const styleBoldCenter = { font: { bold: true }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: getBorders() };
    const styleCenter = { alignment: { horizontal: 'center', vertical: 'center' }, border: getBorders() };
    const styleLeftBorder = { alignment: { horizontal: 'left', vertical: 'center', wrapText: true }, border: getBorders() };

    sheetData.push([{ v: instName, s: { font: { bold: true } } }]);
    sheetData.push([]);
    sheetData.push(['', '', { v: `Fișă individuală pontaj și de alocare a timpului de lucru\nLuna ${mName} Anul ${year}`, s: styleTitle }]);
    sheetData.push([]);

    const P1 = mainProj;
    const P2 = otherProjs[0] ?? null;
    const P1_Member = (P1.projInfo.members ?? []).find(m => m.personId === person.id);
    const P1_Role = P1_Member?.type ?? 'Expert / Management';
    const P1_Partner = P1_Member?.partner ?? P1.projInfo.partner ?? instName;

    sheetData.push([{ v: `Nr. contract de finanțare: ${P1.projInfo.contract ?? '-'}    SMIS ${P1.projInfo.smis}`, s: styleLeftBorder }]);
    sheetData.push([{ v: `Proiect: ${P1.projInfo.name}`, s: styleLeftBorder }]);
    sheetData.push([{ v: `Denumire partener: ${P1_Partner}`, s: styleLeftBorder }]);
    sheetData.push([{ v: `Nume și Prenume: ${person.name} ${person.fname}   |   CNP: ${person.cnp ?? '-'}`, s: styleLeftBorder }]);
    sheetData.push([{ v: `Rol / Funcție în proiect: ${P1_Role}`, s: styleLeftBorder }]);
    sheetData.push([]);

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

    const totalRow = [{ v: 'TOTAL', s: styleBoldCenter }, { v: totalP1, s: styleBoldCenter }, { v: '', s: styleBoldCenter }];
    let grandTotal = totalP1;
    if (P2) {
        totalRow.push({ v: totalP2, s: styleBoldCenter }, { v: '', s: styleBoldCenter });
        grandTotal += totalP2;
    }
    totalRow.push({ v: grandTotal, s: styleBoldCenter });
    sheetData.push(totalRow);
    sheetData.push([]);

    const signRow = [{ v: `Întocmit de:\n${intocmitName}`, s: { font: { bold: true }, alignment: { wrapText: true, vertical: 'top' } } }, ''];
    if (P2) signRow.push('', '');
    signRow.push({ v: `Aprobat:\n${aprobatName}`, s: { font: { bold: true }, alignment: { wrapText: true, vertical: 'top' } } });
    sheetData.push(signRow);

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const cols = [{ wch: 6 }, { wch: 10 }, { wch: 18 }];
    if (P2) cols.push({ wch: 10 }, { wch: 18 });
    cols.push({ wch: 15 });
    ws['!cols'] = cols;

    XLSX.utils.book_append_sheet(wb, ws, 'PONTAJ');
    return wb;
}

export const generateCentralizator = async (
    { year, month, instName },
    _projects,
    _persons,
    onLog
) => {
    onLog('Pregătire Centralizator Cumulativ...');

    try {
        const allPontaje = {};
        await Promise.allSettled(
            _projects.map(async (proj) => {
                const res = await api.get(`/pontaj/${proj.id}/${year}/${month}`);
                if (res.data) allPontaje[proj.id] = res.data;
            })
        );

        const totalDays = getDaysInMonth(year, month);
        const wb = XLSX.utils.book_new();
        const sheetData = [];

        const styleHeader = { font: { bold: true }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: getBorders(), fill: { fgColor: { rgb: "E9ECEF" } } };
        const styleCell = { alignment: { horizontal: 'center', vertical: 'center' }, border: getBorders() };
        const styleName = { font: { bold: true }, border: getBorders() };

        // Header rând 1
        const h1 = [
            { v: 'Nume și Prenume', s: styleHeader },
            { v: 'CNP', s: styleHeader },
            { v: 'Partener', s: styleHeader }
        ];
        for (let d = 1; d <= totalDays; d++) h1.push({ v: d, s: styleHeader });
        h1.push({ v: 'Total Ore', s: styleHeader }, { v: 'CO/CM', s: styleHeader });
        sheetData.push(h1);

        let addedCount = 0;
        for (const person of _persons) {
            const row = [
                { v: `${person.name} ${person.fname}`, s: styleName },
                { v: person.cnp || '-', s: styleCell },
                { v: person.partner || '-', s: styleCell }
            ];

            let persTotalOre = 0;
            let persTotalSpecial = 0;
            let hasAnyData = false;

            for (let d = 1; d <= totalDays; d++) {
                let daySum = 0;
                let isSpecial = false;

                for (const proj of _projects) {
                    const pData = allPontaje[proj.id]?.[person.id];
                    if (pData) {
                        const h = pData.days?.[d];
                        const n = pData.norma?.[d];

                        if (typeof h === 'number') {
                            daySum += h;
                            hasAnyData = true;
                        } else if (h === 'CO' || h === 'CM') {
                            isSpecial = h;
                            hasAnyData = true;
                        }

                        if (typeof n === 'number') {
                            daySum += n;
                            hasAnyData = true;
                        }
                    }
                }

                if (isSpecial) {
                    row.push({ v: isSpecial, s: { ...styleCell, font: { color: { rgb: "F5A623" }, bold: true } } });
                    persTotalSpecial++;
                } else if (daySum > 0) {
                    row.push({ v: daySum, s: { ...styleCell, font: { color: { rgb: "00C2FF" }, bold: true } } });
                    persTotalOre += daySum;
                } else {
                    row.push({ v: '', s: styleCell });
                }
            }

            if (hasAnyData) {
                row.push({ v: persTotalOre, s: { ...styleName, alignment: { horizontal: 'center' } } });
                row.push({ v: persTotalSpecial, s: { ...styleName, alignment: { horizontal: 'center' } } });
                sheetData.push(row);
                addedCount++;
            }
        }

        if (addedCount === 0) {
            onLog('⚠️ Nicio dată de pontaj găsită pentru perioada selectată.');
            return;
        }

        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        // Column widths
        const cols = [{ wch: 25 }, { wch: 15 }, { wch: 15 }];
        for (let d = 1; d <= totalDays; d++) cols.push({ wch: 4 });
        cols.push({ wch: 10 }, { wch: 8 });
        ws['!cols'] = cols;

        XLSX.utils.book_append_sheet(wb, ws, 'Centralizator');

        const wbout = XLSXStyle.write(wb, { bookType: 'xlsx', type: 'binary' });
        const buf = s2ab(wbout);
        const filename = `Centralizator_Pontaj_${year}_${String(month).padStart(2, '0')}.xlsx`;
        const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        await triggerFileDownload(blob, filename);
        onLog(`✅ Centralizator generat cu succes (${addedCount} persoane).`);

    } catch (err) {
        onLog('❌ Eroare la generare centralizator: ' + err.message);
        console.error(err);
    }
};

export const generateCentralizatorProject = async (
    { year, month, instName, intocmitName, aprobatName },
    project,
    _persons,
    onLog
) => {
    onLog(`Pregătire Centralizator Proiect: ${project.name}...`);

    try {
        // Fetch ALL projects and their pontaje for this month to calculate "Norma de baza"
        const allProjRes = await api.get('/projects');
        const allProjects = allProjRes.data || [];
        const monthlyPontaje = {};

        onLog('Agregare date globale pentru Norma de Bază...');
        await Promise.allSettled(
            allProjects.map(async (p) => {
                const pRes = await api.get(`/pontaj/${p.id}/${year}/${month}`);
                if (pRes.data) monthlyPontaje[p.id] = pRes.data;
            })
        );

        const targetPontaj = monthlyPontaje[project.id] || {};
        const totalDays = getDaysInMonth(year, month);
        const MONTHS_LOWER = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];
        const lunaRO = MONTHS_LOWER[month - 1].charAt(0).toUpperCase() + MONTHS_LOWER[month - 1].slice(1);

        const wb = XLSX.utils.book_new();

        const members = project.members || [];
        const cercetareMembers = members.filter(m => m.type === 'Cercetare');
        const managementMembers = members.filter(m => m.type === 'Management');

        const createSheet = (roleName, roleMembers) => {
            const sheetData = [];

            // ====================== STYLE DEFINITIONS ======================
            // Title style — horizontal text, NOT wrapText vertical
            const styleTitle = { font: { bold: true, sz: 11 }, alignment: { horizontal: 'center', vertical: 'center', wrapText: false } };
            const styleTitleSmall = { font: { bold: true, sz: 9 }, alignment: { horizontal: 'center', vertical: 'center', wrapText: false } };
            const styleInstitutie = { font: { bold: false, sz: 9 }, alignment: { horizontal: 'left', vertical: 'center' } };
            const styleInstitutieB = { font: { bold: true, sz: 10 }, alignment: { horizontal: 'left', vertical: 'center' } };

            // Header cells - yellow background, bold, bordered
            const styleHeader = {
                font: { bold: true, sz: 10 },
                alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                border: getBorders(),
                fill: { fgColor: { rgb: 'FFCC00' } }
            };

            // Normal day cell - white bg
            const styleCell = {
                alignment: { horizontal: 'center', vertical: 'center' },
                border: getBorders(),
                fill: { fgColor: { rgb: 'FFFFFF' } }
            };

            // Weekend day header cell - orange bg
            const styleWeekendHeader = {
                font: { bold: true, sz: 10 },
                alignment: { horizontal: 'center', vertical: 'center' },
                border: getBorders(),
                fill: { fgColor: { rgb: 'FF8C00' } }    // dark orange, like in screenshot
            };

            // Weekend day data cell - light orange/peach bg
            const styleWeekendCell = {
                alignment: { horizontal: 'center', vertical: 'center' },
                border: getBorders(),
                fill: { fgColor: { rgb: 'FFD580' } }    // light amber for weekend data cells
            };

            // Total row - green bg, bold
            const styleTotalCell = {
                font: { bold: true },
                alignment: { horizontal: 'center', vertical: 'center' },
                border: getBorders(),
                fill: { fgColor: { rgb: 'E2EFDA' } }    // light green
            };
            const styleTotalWeekendCell = {
                font: { bold: true },
                alignment: { horizontal: 'center', vertical: 'center' },
                border: getBorders(),
                fill: { fgColor: { rgb: 'C6EFCE' } }    // slightly darker green for weekend totals
            };

            // Normal text cells (name, partner etc.)
            const styleLeft = { alignment: { horizontal: 'left', vertical: 'center' }, border: getBorders(), fill: { fgColor: { rgb: 'FFFFFF' } } };
            const styleLeftBold = { font: { bold: true }, alignment: { horizontal: 'left', vertical: 'center' }, border: getBorders(), fill: { fgColor: { rgb: 'FFFFFF' } } };

            // SMIS label cell (light grey)
            const styleSmisLabel = {
                font: { sz: 9 },
                alignment: { horizontal: 'left', vertical: 'center' },
                border: getBorders(),
                fill: { fgColor: { rgb: 'F0F0F0' } }
            };
            // Norma de baza label (slightly different grey)
            const styleNormaLabel = {
                font: { italic: true, sz: 9 },
                alignment: { horizontal: 'left', vertical: 'center' },
                border: getBorders(),
                fill: { fgColor: { rgb: 'E8E8E8' } }
            };
            // Total label
            const styleTotalLabel = {
                font: { bold: true, sz: 9 },
                alignment: { horizontal: 'left', vertical: 'center' },
                border: getBorders(),
                fill: { fgColor: { rgb: 'E2EFDA' } }
            };

            // Header bold total cell
            const styleTotalHeaderCell = {
                font: { bold: true, sz: 10 },
                alignment: { horizontal: 'center', vertical: 'center' },
                border: getBorders(),
                fill: { fgColor: { rgb: 'FFCC00' } }
            };

            // Value totals at right side of each row
            const styleTotalVal = {
                font: { bold: true },
                alignment: { horizontal: 'center', vertical: 'center' },
                border: getBorders(),
                fill: { fgColor: { rgb: 'DDEBF7' } }    // light blue for "Total ore proiect" column
            };
            const styleTotalValGreen = {
                font: { bold: true },
                alignment: { horizontal: 'center', vertical: 'center' },
                border: getBorders(),
                fill: { fgColor: { rgb: 'E2EFDA' } }
            };

            // safeV for label fields (hide 0s)
            const safeV = (v) => (v === undefined || v === null || v === 0 || v === '0') ? '' : v;
            // dayV for day cells: always show numeric value (0 included), except CO/CM
            const dayV = (v) => {
                if (v === 'CO' || v === 'CM') return v;
                if (typeof v === 'number') return v;
                return 0;
            };

            // Helper: is a given day a weekend?
            const isWE = (d) => {
                const dow = new Date(year, month - 1, d).getDay(); // 0=Sun, 6=Sat
                return dow === 0 || dow === 6;
            };

            // ====================== HEADER SECTION ======================
            sheetData.push([
                { v: `ADRESA INSTITUȚIEI: Șos. Alexandriei nr. 82, Bragadiru, Ilfov`, s: styleInstitutie },
            ]);
            sheetData.push([
                { v: `NUMELE INSTITUȚIEI: ${instName}`, s: styleInstitutieB },
            ]);
            sheetData.push([]); // empty row

            // Title rows — centered starting from column G (index 6)
            sheetData.push([
                '', '', '', '', '', '',
                { v: 'Lista pontaj persoane implicate în Implementarea Proiectului', s: styleTitle }
            ]);
            sheetData.push([
                '', '', '', '', '', '',
                { v: `AFERENTE CONTRACTULUI DE FINANȚARE Nr. ${project.contract || '–'} Cod SMIS ${project.smis || '–'}`, s: styleTitleSmall }
            ]);
            sheetData.push([
                '', '', '', '', '', '',
                { v: `Luna ${lunaRO} ${year}`, s: styleTitleSmall }
            ]);
            sheetData.push([]); // empty row before table

            // ====================== TABLE HEADER ======================
            const headerRow = [
                { v: 'Nr. crt.', s: styleHeader },
                { v: 'Partener', s: styleHeader },
                { v: 'CNP', s: styleHeader },
                { v: 'Nume', s: styleHeader },
                { v: 'Prenume', s: styleHeader },
                { v: 'SMIS proiect', s: styleHeader }
            ];
            for (let d = 1; d <= totalDays; d++) {
                headerRow.push({ v: d, s: isWE(d) ? styleWeekendHeader : styleHeader });
            }
            headerRow.push({ v: 'Total ore proiect', s: styleTotalHeaderCell });
            sheetData.push(headerRow);

            // ====================== DATA ROWS ======================
            let rowIndex = 1;
            for (const member of roleMembers) {
                const person = _persons.find(p => p.id === member.personId);
                if (!person) continue;

                const pDataThisProj = targetPontaj[person.id] || { days: {}, norma: {} };

                // Aggregate hours from *other* projects for Norma de baza
                const otherProjData = {};
                for (let d = 1; d <= totalDays; d++) {
                    let sum = 0;
                    for (const pid of Object.keys(monthlyPontaje)) {
                        if (String(pid) === String(project.id)) continue;
                        const v = monthlyPontaje[pid][person.id]?.days?.[d];
                        if (typeof v === 'number') sum += v;
                    }
                    otherProjData[d] = sum;
                }

                // ---- ROW 1: Project SMIS hours ----
                const row1 = [
                    { v: rowIndex++, s: styleCell },
                    { v: member.partner || person.partner || '-', s: styleCell },
                    { v: person.cnp || '-', s: styleCell },
                    { v: person.name || '-', s: styleLeft },
                    { v: person.fname || '-', s: styleLeft },
                    { v: project.smis || '-', s: styleSmisLabel }
                ];
                let row1Total = 0;
                for (let d = 1; d <= totalDays; d++) {
                    const rawVal = pDataThisProj.days[d];
                    const isSpecial = rawVal === 'CO' || rawVal === 'CM';
                    const num = typeof rawVal === 'number' ? rawVal : 0;
                    if (!isSpecial) row1Total += num;

                    const cellStyle = isWE(d) ? styleWeekendCell : styleCell;
                    if (isSpecial) {
                        // CO/CM: bold orange text
                        row1.push({ v: rawVal, s: { ...cellStyle, font: { bold: true, color: { rgb: 'FF8C00' } } } });
                    } else {
                        // Always show numeric value (including 0 for working days)
                        row1.push({ v: dayV(rawVal), s: cellStyle });
                    }
                }
                row1.push({ v: row1Total, s: styleTotalVal });
                sheetData.push(row1);

                // ---- ROW 2: Norma de baza ----
                const row2 = [
                    { v: '', s: styleCell }, { v: '', s: styleCell }, { v: '', s: styleCell },
                    { v: '', s: styleCell }, { v: '', s: styleCell },
                    { v: 'Norma de baza', s: styleNormaLabel }
                ];
                let row2Total = 0;
                for (let d = 1; d <= totalDays; d++) {
                    const manualN = typeof pDataThisProj.norma?.[d] === 'number' ? pDataThisProj.norma[d] : 0;
                    const otherProjN = otherProjData[d] || 0;
                    const val = manualN + otherProjN;
                    row2Total += val;
                    // Always show numeric value including 0
                    row2.push({ v: val, s: isWE(d) ? styleWeekendCell : styleCell });
                }
                row2.push({ v: row2Total, s: styleTotalVal });
                sheetData.push(row2);

                // ---- ROW 3: Total (project + norma) ----
                const row3 = [
                    { v: '', s: styleTotalCell }, { v: '', s: styleTotalCell }, { v: '', s: styleTotalCell },
                    { v: '', s: styleTotalCell }, { v: '', s: styleTotalCell },
                    { v: 'Total', s: styleTotalLabel }
                ];
                let row3Total = 0;
                for (let d = 1; d <= totalDays; d++) {
                    const h1 = typeof pDataThisProj.days[d] === 'number' ? pDataThisProj.days[d] : 0;
                    const manualN = typeof pDataThisProj.norma?.[d] === 'number' ? pDataThisProj.norma[d] : 0;
                    const otherProjN = otherProjData[d] || 0;
                    const sum = h1 + manualN + otherProjN;
                    row3Total += sum;
                    // Total row always shows numeric value including 0
                    row3.push({ v: sum, s: isWE(d) ? styleTotalWeekendCell : styleTotalCell });
                }
                row3.push({ v: row3Total, s: styleTotalValGreen });
                sheetData.push(row3);
            }

            // ====================== FOOTER ======================
            sheetData.push([]);
            sheetData.push([
                { v: 'INTOCMIT,', s: { font: { bold: true } } }, '', '',
                { v: 'VERIFICAT,', s: { font: { bold: true } } }, '', '',
                '', '', '', '',
                { v: 'Responsabil proiect,', s: { font: { bold: true } } }
            ]);
            sheetData.push([
                { v: intocmitName || '-', s: { font: { sz: 9 } } }, '', '',
                { v: 'Responsabil proiect', s: { font: { sz: 9 } } }, '', '',
                '', '', '', '',
                { v: aprobatName || '-', s: { font: { sz: 9 } } }
            ]);

            const ws = XLSX.utils.aoa_to_sheet(sheetData);

            // ====================== COLUMN WIDTHS ======================
            const cols = [
                { wch: 5 },   // Nr.crt
                { wch: 8 },   // Partener
                { wch: 15 },  // CNP
                { wch: 14 },  // Nume
                { wch: 14 },  // Prenume
                { wch: 14 }   // SMIS/Label
            ];
            for (let d = 1; d <= totalDays; d++) cols.push({ wch: isWE(d) ? 3.5 : 3.5 });
            cols.push({ wch: 12 }); // Total ore proiect
            ws['!cols'] = cols;

            // ====================== ROW HEIGHTS ======================
            const headerRowIndex = 7; // 0-indexed: rows 0-6 are title rows
            ws['!rows'] = [];
            ws['!rows'][headerRowIndex] = { hpx: 32 }; // taller header row

            const sheetName = `${String(month).padStart(2, '0')}.${year} ${roleName}`;
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        };

        createSheet('Cercetare', cercetareMembers);
        createSheet('Management', managementMembers);

        const wbout = XLSXStyle.write(wb, { bookType: 'xlsx', type: 'binary' });
        const buf = s2ab(wbout);
        const filename = `Centralizator_${project.smis || 'PROJ'}_${year}_${String(month).padStart(2, '0')}.xlsx`;
        const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        await triggerFileDownload(blob, filename);
        onLog(`✅ Centralizator Proiect generat cu succes.`);

    } catch (err) {
        onLog('❌ Eroare: ' + err.message);
        console.error(err);
    }
};

async function triggerFileDownload(blob, filename) {
    if ('showSaveFilePicker' in window) {
        try {
            const ext = filename.split('.').pop().toLowerCase();
            const mimes = {
                xlsx: { description: 'Fișier Excel', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } },
                zip: { description: 'Arhivă ZIP', accept: { 'application/zip': ['.zip'] } }
            };
            const types = mimes[ext] ? [mimes[ext]] : [];
            const handle = await window.showSaveFilePicker({ suggestedName: filename, ...(types.length && { types }) });
            const writer = await handle.createWritable();
            await writer.write(blob);
            await writer.close();
            return;
        } catch (err) {
            if (err.name === 'AbortError') return;
        }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
