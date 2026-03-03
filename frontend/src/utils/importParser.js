
/**
 * importParser.js — Parser asistat pentru fișe de pontaj (Excel/PDF)
 * Detectează: persoana, luna/an, SMIS-uri, blocuri candidate de ore
 * Returnează candidati pentru confirmare de user, NU importă automat.
 */

import * as XLSX from 'xlsx';

// ─── HELPERS ────────────────────────────────────────────────────────────────

const MONTHS_RO = {
    ianuarie: 1, februarie: 2, martie: 3, aprilie: 4,
    mai: 5, iunie: 6, iulie: 7, august: 8,
    septembrie: 9, octombrie: 10, noiembrie: 11, decembrie: 12
};

const SMIS_REGEX = /(?:cod\s+)?smis\s*[:#]?\s*(\d{5,7})/gi;
const CNP_REGEX = /\b([1-9]\d{12})\b/g;
const MONTH_REGEX = new RegExp(
    `(?:luna|month)?\\s*(${Object.keys(MONTHS_RO).join('|')})\\s*(\\d{4})`,
    'gi'
);

function extractSMIScodes(text) {
    const codes = new Set();
    let m;
    const rx = new RegExp(SMIS_REGEX.source, 'gi');
    while ((m = rx.exec(text)) !== null) {
        codes.add(m[1].trim());
    }
    return [...codes];
}

function extractCNP(text) {
    const m = CNP_REGEX.exec(text);
    return m ? m[1] : null;
}

function extractPeriod(text) {
    const rx = new RegExp(MONTH_REGEX.source, 'gi');
    const m = rx.exec(text);
    if (!m) return null;
    const monthName = m[1].toLowerCase();
    const year = parseInt(m[2]);
    const month = MONTHS_RO[monthName];
    if (!month || !year) return null;
    return { month, year, label: `${m[1].charAt(0).toUpperCase() + m[1].slice(1)} ${year}`, confidence: 'high' };
}

function extractName(rows) {
    // Look for rows that contain "Numele" / "Prenumele" / "Salariat"
    const namePatterns = [
        /(?:numele\s+(?:și\s+)?prenumele?|salariatul?|angajat)[:\s]+([A-ZĂÂÎȘȚ][a-zăâîșț]+(?:\s+[A-ZĂÂÎȘȚ][a-zăâîșț]+)+)/i,
        /^([A-ZĂÂÎȘȚ][a-zăâîșț]+([ \-][A-ZĂÂÎȘȚ][a-zăâîșț]+)+)$/
    ];
    for (const row of rows) {
        const cellText = String(row || '').trim();
        for (const pat of namePatterns) {
            const m = cellText.match(pat);
            if (m) return m[1].trim();
        }
    }
    return null;
}

// ─── EXCEL PARSER ──────────────────────────────────────────────────────────

export function parseExcelFile(arrayBuffer) {
    const wb = XLSX.read(arrayBuffer, { type: 'array', cellText: true });
    const sheets = wb.SheetNames;

    const result = {
        type: 'excel',
        sheets: [],
        allText: '',
        detectedSMIS: [],
        detectedPeriod: null,
        detectedCNP: null,
        detectedName: null,
        candidateBlocks: [],
        rawWorkbook: wb
    };

    let allText = '';

    for (const sheetName of sheets) {
        const ws = wb.Sheets[sheetName];
        const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        // Stringify all content for meta extraction
        const sheetText = aoa.flat().map(c => String(c)).join(' ');
        allText += ' ' + sheetText;

        result.sheets.push({
            name: sheetName,
            aoa,           // array of arrays for preview
            rows: aoa.length,
            cols: aoa[0]?.length || 0
        });
    }

    result.allText = allText;
    result.detectedSMIS = extractSMIScodes(allText);
    result.detectedPeriod = extractPeriod(allText);
    result.detectedCNP = extractCNP(allText);

    // Try to extract name from all rows (flat)
    const flatRows = result.sheets.flatMap(s => s.aoa.flat().map(c => String(c)));
    result.detectedName = extractName(result.sheets.flatMap(s => s.aoa.map(r => r.join(' '))));

    // Find candidate blocks per SMIS per sheet
    for (const sheet of result.sheets) {
        const blocks = findBlocksInSheet(sheet, result.detectedSMIS);
        result.candidateBlocks.push(...blocks);
    }

    return result;
}

/**
 * Identifies blocks in a sheet that correspond to each detected SMIS.
 *
 * Supports TWO formats:
 *
 * FORMAT A — Row-based (old format):
 *   Row: "SMIS 329264 | 1 | 2 | 3 | ... | 28"
 *   Row: (hours)      | 2 | 0 | 2 | ... | 0
 *
 * FORMAT B — Column-based (real fișă format used in screenshots):
 *   Row: "Ziua | SMIS 331874 / Nr. ore | Interval | SMIS 329264 / Nr. ore | ... | Total"
 *   Row: "1    | 0                     | ...      | 2                     | ..."
 *   Row: "2    | 2                     | ...      | 0                     | ..."
 *   ...
 */
function findBlocksInSheet(sheet, smisCodesList) {
    const { aoa, name: sheetName } = sheet;
    const blocks = [];

    // ── FORMAT B DETECTION ────────────────────────────────────────────────────
    // Step 1: Find the header row that contains "Ziua" AND at least one SMIS code
    for (let r = 0; r < Math.min(aoa.length, 30); r++) {
        const row = aoa[r];
        const rowText = row.map(c => String(c)).join(' ');

        // Must contain "Ziua" or "Ziua" equivalent and at least one SMIS
        const hasZiua = /\bziua\b/i.test(rowText);
        const hasSMIS = /smis\s*\d{5,7}/i.test(rowText);

        if (hasZiua || hasSMIS) {
            // Look at the next 1-2 rows too (sometimes SMIS codes span merged cells or sub-headers)
            const contextRows = aoa.slice(Math.max(0, r - 1), r + 3);
            const contextText = contextRows.flat().map(c => String(c)).join(' ');
            const smisInContext = extractSMIScodes(contextText);

            if (smisInContext.length > 0) {
                // This looks like a Format B header
                const blocks_b = extractColumnarBlocks(aoa, r, smisInContext, sheetName);
                if (blocks_b.length > 0) {
                    return blocks_b;
                }
            }
        }
    }

    // ── FORMAT A DETECTION ────────────────────────────────────────────────────
    // Old row-based format: look for a row with consecutive day numbers 1..28
    const rowTexts = aoa.map(row => row.map(c => String(c)).join(' '));
    for (let r = 0; r < rowTexts.length; r++) {
        const codes = extractSMIScodes(rowTexts[r]);
        for (const smis of codes) {
            if (!smisCodesList.includes(smis)) continue;
            const blockInfo = extractRowBasedBlock(aoa, r, smis);
            if (blockInfo) {
                blocks.push({
                    smis,
                    sheet: sheetName,
                    anchorRow: r,
                    ...blockInfo,
                    confidence: blockInfo.daysFound > 10 ? 'high' : 'medium',
                    notes: `[Format A] Rând ${r + 1} în "${sheetName}"`
                });
            }
        }
    }

    return blocks;
}

/**
 * FORMAT B: Extract per-column blocks.
 * Key insight: the "Nr. ore lucrate" column contains ONLY numbers (0,1,2...8).
 * "Interval orar" columns contain HH:MM strings → we REJECT those.
 * We score each candidate column and pick the highest scorer closest to the SMIS anchor.
 */
function extractColumnarBlocks(aoa, headerRow, smisCodesList, sheetName) {
    const blocks = [];
    const headerRowData = aoa[headerRow] || [];

    // Build smisColMap: smis => column index where it appears
    const smisColMap = {};
    for (let ri = Math.max(0, headerRow - 1); ri <= Math.min(aoa.length - 1, headerRow + 3); ri++) {
        const row = aoa[ri] || [];
        for (let ci = 0; ci < row.length; ci++) {
            const cell = String(row[ci] || '');
            const codes = extractSMIScodes(cell);
            for (const smis of codes) {
                if (!smisColMap[smis]) smisColMap[smis] = [];
                smisColMap[smis].push(ci);
            }
        }
    }

    // Find "Ziua" column (first column with day numbers 1, 2, 3...)
    let dayCol = -1;
    // First try: find "Ziua" label in header row
    for (let ci = 0; ci < headerRowData.length; ci++) {
        if (/\bziua\b/i.test(String(headerRowData[ci] || ''))) {
            dayCol = ci; break;
        }
    }
    // Fallback: scan below header for a column that has strictly consecutive integers starting at 1
    if (dayCol === -1) {
        for (let ci = 0; ci < Math.min(headerRowData.length, 6); ci++) {
            let seq = 0, prev = 0, valid = true;
            for (let ri = headerRow + 1; ri <= Math.min(aoa.length - 1, headerRow + 5); ri++) {
                const v = parseInt(String((aoa[ri] || [])[ci] || ''));
                if (!isNaN(v) && v === prev + 1) { prev = v; seq++; }
                else if (String((aoa[ri] || [])[ci] || '').trim() !== '') { valid = false; break; }
            }
            if (valid && seq >= 4) { dayCol = ci; break; }
        }
    }

    // Helper: check if a cell value looks like a time string (HH:MM or H:MM)
    const isTimeString = val => /^\d{1,2}:\d{2}/.test(val.trim());

    // Helper: extract hours for a given ore column
    const extractHoursForCol = (oreCol) => {
        const dayHours = {};
        let numericCells = 0;
        let timeCells = 0;
        let totalCells = 0;

        for (let ri = headerRow + 1; ri < aoa.length; ri++) {
            const row = aoa[ri] || [];
            let dayNum = null;
            if (dayCol >= 0) {
                dayNum = parseInt(String(row[dayCol] ?? ''));
            } else {
                dayNum = ri - headerRow;
            }
            if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) continue;

            const rawVal = String(row[oreCol] ?? '').trim();
            const upperVal = rawVal.toUpperCase();

            if (isTimeString(rawVal)) {
                timeCells++;
                totalCells++;
                // Don't add to dayHours — this is interval orar, not hours
            } else if (upperVal === 'CO' || upperVal === 'CM') {
                dayHours[dayNum] = upperVal;
                numericCells++;
                totalCells++;
            } else {
                const numVal = parseFloat(rawVal.replace(',', '.'));
                if (!isNaN(numVal) && numVal >= 0 && numVal <= 24) {
                    dayHours[dayNum] = numVal;
                    numericCells++;
                    totalCells++;
                } else if (rawVal === '') {
                    // Empty cell = 0 (day exists but no hours)
                    dayHours[dayNum] = 0;
                    totalCells++;
                }
                // Non-numeric, non-empty, non-time → ignore
            }

            // Stop when we've passed day 28 and have enough rows
            if (dayNum >= 28 && ri > headerRow + 30) break;
        }

        // Score: high for numeric cells, massive penalty for time cells
        // (a time-column should score near 0)
        const score = numericCells * 10 - timeCells * 50;
        const daysFound = Object.keys(dayHours).length;
        return { dayHours, numericCells, timeCells, totalCells, daysFound, score };
    };

    // For each SMIS, find the best column
    for (const smis of smisCodesList) {
        if (!smisColMap[smis] || smisColMap[smis].length === 0) continue;

        const anchorCols = [...new Set(smisColMap[smis])];
        const anchorCol = anchorCols[0]; // primary anchor

        // Build candidate columns: the SMIS anchor column and the next 5 columns
        // We cap at anchorCol+5 to avoid picking a completely different SMIS group
        const candidateCols = [];
        for (let ci = anchorCol; ci <= anchorCol + 5 && ci < headerRowData.length; ci++) {
            candidateCols.push(ci);
        }

        let bestCol = -1;
        let bestScore = -Infinity;
        let bestResult = null;

        for (const oreCol of candidateCols) {
            const result = extractHoursForCol(oreCol);
            // Penalty for distance from anchor (prefer closer columns)
            const distPenalty = (oreCol - anchorCol) * 3;
            const finalScore = result.score - distPenalty;

            if (result.daysFound >= 5 && finalScore > bestScore) {
                bestScore = finalScore;
                bestCol = oreCol;
                bestResult = result;
            }
        }

        if (bestResult && bestResult.daysFound >= 5 && bestScore > 0) {
            blocks.push({
                smis,
                sheet: sheetName,
                anchorRow: headerRow,
                dayCol,
                hoursCol: bestCol,
                dayRow: headerRow,
                hoursRow: headerRow + bestResult.daysFound,
                dayCount: bestResult.daysFound,
                daysFound: bestResult.daysFound,
                dayHours: bestResult.dayHours,
                confidence: bestResult.daysFound >= 25 ? 'high' : bestResult.daysFound >= 15 ? 'medium' : 'low',
                notes: `[Format B] Coloana ${bestCol + 1}, ${bestResult.daysFound} zile, ${bestResult.numericCells} valori numerice (score: ${bestScore})`
            });
        }
    }

    return blocks;
}


/**
 * FORMAT A: Row-based (original format). Searches from anchorRow outwards for a
 * row pattern like [1, 2, 3, ..., 28/31] (days header) followed by a row with hours.
 */
function extractRowBasedBlock(aoa, anchorRow, smis) {
    const searchWindow = 15;
    const start = Math.max(0, anchorRow - 2);
    const end = Math.min(aoa.length - 1, anchorRow + searchWindow);

    for (let r = start; r <= end; r++) {
        const row = aoa[r];
        const nums = row.map(c => {
            const n = parseInt(String(c).trim());
            return isNaN(n) ? null : n;
        }).filter(n => n !== null);

        if (nums.length >= 20 && nums[0] === 1 && nums[nums.length - 1] >= 28) {
            const dayStartCol = row.findIndex(c => parseInt(String(c).trim()) === 1);

            for (let hr = r + 1; hr <= Math.min(aoa.length - 1, r + 6); hr++) {
                const hRow = aoa[hr];
                const hNums = hRow.slice(dayStartCol, dayStartCol + nums.length)
                    .map(c => {
                        const s = String(c).trim().toUpperCase();
                        if (s === 'CO' || s === 'CM') return s;
                        const n = parseFloat(s);
                        return isNaN(n) ? null : n;
                    });

                const validEntries = hNums.filter(v => v !== null && v !== undefined);
                if (validEntries.length >= 15) {
                    const dayHours = {};
                    for (let i = 0; i < nums.length; i++) {
                        const day = nums[i];
                        const val = hNums[i];
                        if (val !== null && val !== undefined) dayHours[day] = val;
                    }
                    return {
                        dayRow: r,
                        hoursRow: hr,
                        dayStartCol,
                        dayCount: nums.length,
                        daysFound: validEntries.length,
                        dayHours
                    };
                }
            }
        }
    }

    return null;
}


// ─── PDF PARSER ─────────────────────────────────────────────────────────────

export async function parsePDFFile(arrayBuffer) {
    // Requires pdfjs-dist, loaded at build time
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
    ).toString();

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pageCount = pdf.numPages;

    let allText = '';
    const pages = [];
    for (let i = 1; i <= pageCount; i++) {
        const page = await pdf.getPage(i);
        const tc = await page.getTextContent();
        const pageText = tc.items.map(item => item.str).join(' ');
        allText += ' ' + pageText;
        pages.push({ page: i, text: pageText });
    }

    const detectedSMIS = extractSMIScodes(allText);
    const detectedPeriod = extractPeriod(allText);
    const detectedCNP = extractCNP(allText);
    const detectedName = extractName(allText.split('\n'));

    // Extract blocks from PDF text
    const candidateBlocks = [];
    for (const { page, text } of pages) {
        const smisInPage = extractSMIScodes(text);
        for (const smis of smisInPage) {
            const hours = extractHoursFromPDFText(text, smis);
            if (hours) {
                candidateBlocks.push({
                    smis,
                    sheet: `Pagina ${page}`,
                    page,
                    dayHours: hours.dayHours,
                    daysFound: Object.keys(hours.dayHours).length,
                    confidence: Object.keys(hours.dayHours).length > 15 ? 'high' : 'medium',
                    notes: `Detectat în pagina ${page}`
                });
            }
        }
    }

    return {
        type: 'pdf',
        pageCount,
        pages,
        allText,
        detectedSMIS,
        detectedPeriod,
        detectedCNP,
        detectedName,
        candidateBlocks
    };
}

/**
 * Extract day→hours from PDF text near a SMIS code mention
 */
function extractHoursFromPDFText(text, smisCode) {
    // Find position of SMIS code in text
    const rx = new RegExp(`smis\\s*${smisCode}`, 'i');
    const idx = text.search(rx);
    if (idx === -1) return null;

    // Extract text window after SMIS
    const window = text.slice(idx, idx + 2000);

    // Match sequences of numbers that could be hours for consecutive days
    const tokens = window.match(/\b(\d+(?:[.,]\d+)?|CO|CM)\b/g) || [];

    // Find day pattern: sequence starting with 1 (possibly 1..28/31)
    const dayHours = {};
    let dayMode = false;
    let curDay = 0;
    let lookingForDays = true;

    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i].replace(',', '.');
        const n = parseFloat(t);

        if (lookingForDays && n === 1 && tokens[i + 1] && parseFloat(tokens[i + 1]) === 2) {
            dayMode = true;
            lookingForDays = false;
            curDay = 1;
            continue;
        }

        if (dayMode) {
            if (tokens[i] === 'CO' || tokens[i] === 'CM') {
                dayHours[curDay] = tokens[i];
                curDay++;
            } else if (!isNaN(n) && n >= 0 && n <= 24) {
                if (n === curDay + 1 && Object.keys(dayHours).length === 0) {
                    // Still in day number row
                    curDay = n;
                } else if (n <= 12 || n === 0) {
                    dayHours[curDay] = n;
                    curDay++;
                }
            }
            if (curDay > 31) break;
        }
    }

    if (Object.keys(dayHours).length < 5) return null;
    return { dayHours };
}

// ─── MAIN ENTRY ─────────────────────────────────────────────────────────────

/**
 * Main parse function — auto-detects Excel vs PDF
 * @param {File} file — browser File object
 * @returns {Promise<ParseResult>}
 */
export async function parseImportFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    const name = file.name.toLowerCase();

    if (name.endsWith('.pdf')) {
        return await parsePDFFile(arrayBuffer);
    } else {
        return parseExcelFile(arrayBuffer);
    }
}

/**
 * Select the best candidate block for a given target SMIS
 */
export function selectBestBlock(candidateBlocks, targetSMIS) {
    const exact = candidateBlocks.filter(b => b.smis === targetSMIS);
    if (exact.length === 0) return null;
    // Prefer high confidence and most days
    return exact.sort((a, b) => {
        if (a.confidence === 'high' && b.confidence !== 'high') return -1;
        if (b.confidence === 'high' && a.confidence !== 'high') return 1;
        return (b.daysFound || 0) - (a.daysFound || 0);
    })[0];
}

/**
 * Validate a selected block before import
 */
export function validateBlock(block, year, month, existingData) {
    const hardErrors = [];
    const softWarnings = [];

    if (!block || !block.dayHours) {
        hardErrors.push('Blocul selectat nu conține date de ore.');
        return { hardErrors, softWarnings };
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    const hours = block.dayHours;
    const dayKeys = Object.keys(hours).map(Number).filter(d => d >= 1 && d <= daysInMonth);

    // Hard errors
    const numericVals = dayKeys.map(d => hours[d]).filter(v => typeof v === 'number');
    const allNumeric = dayKeys.every(d => {
        const v = hours[d];
        return typeof v === 'number' || v === 'CO' || v === 'CM';
    });
    if (!allNumeric) {
        hardErrors.push('Există valori ne-interpretabile în bloc (non-numerice).');
    }

    // Soft warnings
    const allZero = numericVals.every(v => v === 0);
    if (allZero && numericVals.length > 0) {
        softWarnings.push('Toate orele sunt 0 — posibil fișă incorectă sau SMIS listat dar neactiv.');
    }

    const overEight = dayKeys.filter(d => typeof hours[d] === 'number' && hours[d] > 8);
    if (overEight.length > 0) {
        softWarnings.push(`Zile cu ore > 8: ${overEight.join(', ')} (verificați corectitudinea).`);
    }

    const totalOreFisa = numericVals.reduce((s, v) => s + v, 0);

    // Anti-duplicat
    if (existingData && Object.keys(existingData).length > 0) {
        const existTotal = Object.values(existingData.days || {})
            .filter(v => typeof v === 'number')
            .reduce((s, v) => s + v, 0);
        if (existTotal > 0) {
            softWarnings.push(`DUPLICAT: Există deja date pentru această perioadă (${existTotal} ore). Va trebui să alegi: Replace sau Merge.`);
        }
    }

    return { hardErrors, softWarnings, totalOreFisa, daysInBlock: dayKeys.length };
}
