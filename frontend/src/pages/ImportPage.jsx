import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Typography, Button, MenuItem, Select, FormControl,
    Paper, Chip, Alert, AlertTitle, LinearProgress,
    Tooltip, TextField, Autocomplete, InputLabel, Tab, Tabs, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';

import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PreviewIcon from '@mui/icons-material/Preview';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import TableChartIcon from '@mui/icons-material/TableChart';
import HistoryIcon from '@mui/icons-material/History';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

import { useSnackbar } from 'notistack';
import api from '../api/client';
import { parseImportFile, selectBestBlock, validateBlock } from '../utils/importParser';

const MONTHS_RO = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
    'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];

// ─── STEP INDICATOR ───────────────────────────────────────────────────────

function StepIndicator({ step }) {
    const steps = ['Selectare', 'Detectare', 'Confirmare', 'Import'];
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0, mb: 4 }}>
            {steps.map((label, i) => {
                const idx = i + 1;
                const active = step === idx;
                const done = step > idx;
                return (
                    <React.Fragment key={label}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 80 }}>
                            <Box sx={{
                                width: 32, height: 32, borderRadius: '50%',
                                bgcolor: done ? '#2ecc71' : active ? '#3b6fff' : 'rgba(255,255,255,0.08)',
                                border: `2px solid ${done ? '#2ecc71' : active ? '#3b6fff' : '#222c42'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '13px', fontWeight: 700,
                                color: done || active ? '#fff' : '#6a7a96',
                                transition: 'all .3s'
                            }}>
                                {done ? '✓' : idx}
                            </Box>
                            <Typography sx={{ fontSize: '10px', mt: '4px', color: active ? '#00c2ff' : '#6a7a96', fontWeight: active ? 700 : 400 }}>
                                {label}
                            </Typography>
                        </Box>
                        {i < steps.length - 1 && (
                            <Box sx={{ flex: 1, height: '2px', bgcolor: done ? '#2ecc71' : '#222c42', mb: '18px', transition: 'all .3s' }} />
                        )}
                    </React.Fragment>
                );
            })}
        </Box>
    );
}

function ConfidenceBadge({ value }) {
    const map = { high: ['#2ecc71', 'Ridicată'], medium: ['#f5a623', 'Medie'], low: ['#e74c3c', 'Scăzută'] };
    const [color, label] = map[value] || ['#6a7a96', '?'];
    return (
        <Chip label={label} size="small"
            sx={{ bgcolor: `${color}22`, color, borderColor: color, border: '1px solid', fontSize: '10px', height: 20 }} />
    );
}

// ─── STEP 1: INPUT ────────────────────────────────────────────────────────

function Step1Input({ projects, selectedProject, onProjectChange, onFileSelect }) {
    const [dragging, setDragging] = useState(false);
    const fileRef = useRef();

    const handleDrop = useCallback(e => {
        e.preventDefault(); setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) onFileSelect(file);
    }, [onFileSelect]);

    return (
        <Box>
            <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 700 }}>Pas 1 — Selectează Proiect și Fișă</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                Selectează proiectul (SMIS target) apoi încarcă fișa de pontaj (Excel sau PDF).
            </Typography>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                <Paper sx={{ p: 3, flex: 1, minWidth: 280, border: '1px solid #222c42' }}>
                    <Typography sx={{ fontSize: '12px', fontWeight: 700, mb: 2, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'text.secondary' }}>
                        📋 Proiect Target
                    </Typography>
                    <FormControl fullWidth size="small">
                        <Select value={selectedProject?.id || ''} onChange={e => onProjectChange(projects.find(x => x.id === e.target.value))} displayEmpty sx={{ bgcolor: 'rgba(0,0,0,0.2)' }}>
                            <MenuItem value="" disabled>Alege proiectul...</MenuItem>
                            {projects.map(p => <MenuItem key={p.id} value={p.id}>{p.name} (SMIS {p.smis})</MenuItem>)}
                        </Select>
                    </FormControl>
                    {selectedProject && (
                        <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(59,111,255,0.05)', borderRadius: '8px', border: '1px solid rgba(59,111,255,0.15)' }}>
                            <Typography sx={{ fontSize: '11px', color: '#6a7a96' }}>SMIS Target</Typography>
                            <Typography sx={{ fontSize: '20px', fontWeight: 900, color: '#00c2ff' }}>{selectedProject.smis}</Typography>
                            <Typography sx={{ fontSize: '11px', color: 'text.secondary', mt: 0.5 }}>{selectedProject.name}</Typography>
                        </Box>
                    )}
                </Paper>
                <Paper sx={{ p: 3, flex: 2, minWidth: 300, border: '1px solid #222c42' }}>
                    <Typography sx={{ fontSize: '12px', fontWeight: 700, mb: 2, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'text.secondary' }}>
                        📂 Fișă de Pontaj
                    </Typography>
                    <Box onDrop={handleDrop} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
                        onClick={() => fileRef.current?.click()}
                        sx={{ border: `2px dashed ${dragging ? '#3b6fff' : '#222c42'}`, borderRadius: '12px', p: 4, textAlign: 'center', cursor: 'pointer', bgcolor: dragging ? 'rgba(59,111,255,0.05)' : 'rgba(0,0,0,0.1)', transition: 'all .2s', '&:hover': { borderColor: '#3b6fff', bgcolor: 'rgba(59,111,255,0.05)' } }}>
                        <input ref={fileRef} type="file" accept=".xlsx,.xls,.pdf" hidden onChange={e => { if (e.target.files[0]) onFileSelect(e.target.files[0]); }} />
                        <UploadFileIcon sx={{ fontSize: 48, color: dragging ? '#3b6fff' : '#6a7a96', mb: 1 }} />
                        <Typography sx={{ fontSize: '14px', fontWeight: 600, mb: 0.5 }}>{dragging ? 'Eliberează fișierul' : 'Trage fișierul aici sau click'}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>Acceptă: .xlsx, .xls, .pdf</Typography>
                    </Box>
                </Paper>
            </Box>
            {!selectedProject && <Alert severity="info" sx={{ mt: 3, borderRadius: '8px' }}>Selectează mai întâi un proiect pentru a activa importul.</Alert>}
        </Box>
    );
}

// ─── EXCEL PREVIEW — with cell click & column highlight ──────────────────

function ExcelPreviewInteractive({ sheet, highlightBlock, manualHoursCol, onCellClick, onColClick, clickMode, dayRangeStart, dayRangeEnd, zeroStrings }) {
    const { aoa } = sheet;
    const rows = aoa.slice(0, 55);
    const maxCols = Math.max(...rows.map(r => r.length), 0);
    const numCols = Math.min(maxCols, 50);

    const hlStart = highlightBlock?.anchorRow ?? highlightBlock?.dayRow ?? -1;
    const hlEnd = highlightBlock?.hoursRow ?? -1;
    const hlCol = manualHoursCol ?? highlightBlock?.hoursCol ?? -1;

    // Helper: is this cell value within the selected day range?
    const getCellDayHighlight = (val) => {
        if (!dayRangeStart) return null;
        const numVal = parseInt(String(val || '').trim(), 10);
        if (isNaN(numVal) || numVal < 1 || numVal > 31) return null;
        if (numVal === dayRangeStart) return 'start';
        if (numVal === dayRangeEnd) return 'end';
        if (dayRangeEnd && numVal > dayRangeStart && numVal < dayRangeEnd) return 'in';
        return null;
    };

    return (
        <Box sx={{ overflow: 'auto' }}>
            {clickMode === 'col' && (
                <Box sx={{ p: '6px 10px', bgcolor: 'rgba(245,166,35,0.1)', borderBottom: '1px solid rgba(245,166,35,0.3)', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TableChartIcon sx={{ fontSize: 14, color: '#f5a623' }} />
                    <Typography sx={{ fontSize: '10px', color: '#f5a623', fontWeight: 600 }}>Click pe headerul coloanei pentru a selecta coloana cu ore</Typography>
                </Box>
            )}
            {clickMode === 'cell' && (
                <Box sx={{ p: '6px 10px', bgcolor: 'rgba(59,111,255,0.08)', borderBottom: '1px solid rgba(59,111,255,0.2)', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonSearchIcon sx={{ fontSize: 14, color: '#3b6fff' }} />
                    <Typography sx={{ fontSize: '10px', color: '#3b6fff', fontWeight: 600 }}>Click pe celula cu numele persoanei</Typography>
                </Box>
            )}
            {clickMode === 'range' && (
                <Box sx={{ p: '6px 10px', bgcolor: 'rgba(46,204,113,0.1)', borderBottom: '1px solid rgba(46,204,113,0.3)', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: '10px', color: '#2ecc71', fontWeight: 700 }}>
                        📅 {!dayRangeStart ? 'Click pe celula cu PRIMA zi de lucru (ex: 13)' : `✅ Prima zi: ${dayRangeStart} — acum click pe celula cu ULTIMA zi (ex: 27)`}
                    </Typography>
                </Box>
            )}
            {clickMode === 'zeroStr' && (
                <Box sx={{ p: '6px 10px', bgcolor: 'rgba(231,76,60,0.1)', borderBottom: '1px solid rgba(231,76,60,0.3)', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: '10px', color: '#e74c3c', fontWeight: 700 }}>
                        0️⃣ Click pe o celulă care înseamnă <strong>ZERO ORE</strong> (ex: celulă goală, "-", "x", "0")
                    </Typography>
                </Box>
            )}
            {zeroStrings && zeroStrings.length > 0 && clickMode !== 'zeroStr' && (
                <Box sx={{ p: '4px 10px', bgcolor: 'rgba(231,76,60,0.06)', borderBottom: '1px solid rgba(231,76,60,0.2)', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: '10px', color: '#e74c3c', fontWeight: 600 }}>
                        0️⃣ Valori zero: {zeroStrings.map(s => s === '' ? '"" (gol)' : `"${s}"`).join(', ')}
                    </Typography>
                </Box>
            )}
            {dayRangeStart && dayRangeEnd && clickMode !== 'range' && (
                <Box sx={{ p: '4px 10px', bgcolor: 'rgba(46,204,113,0.06)', borderBottom: '1px solid rgba(46,204,113,0.2)', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: '10px', color: '#2ecc71', fontWeight: 600 }}>
                        📅 Interval selectat: Ziua {dayRangeStart} → Ziua {dayRangeEnd} ({dayRangeEnd - dayRangeStart + 1} zile)
                    </Typography>
                </Box>
            )}
            <table style={{ borderCollapse: 'collapse', fontSize: '10px', minWidth: '100%' }}>
                {/* Column headers for clicking */}
                <thead>
                    <tr>
                        <th style={{ padding: '2px 4px', color: '#6a7a96', fontSize: '9px', borderRight: '1px solid #222c42', minWidth: 22 }}>#</th>
                        {Array.from({ length: numCols }, (_, ci) => (
                            <th key={ci}
                                onClick={() => onColClick && onColClick(ci)}
                                style={{
                                    padding: '3px 4px', fontSize: '9px', cursor: onColClick ? 'pointer' : 'default',
                                    background: ci === hlCol ? 'rgba(245,166,35,0.25)' : clickMode === 'col' ? 'rgba(59,111,255,0.05)' : 'transparent',
                                    color: ci === hlCol ? '#f5a623' : '#6a7a96',
                                    border: ci === hlCol ? '1px solid rgba(245,166,35,0.5)' : '1px solid rgba(255,255,255,0.04)',
                                    userSelect: 'none', minWidth: 28,
                                    transition: 'background .1s'
                                }}
                                title={`Coloana ${ci + 1}`}
                            >
                                {ci + 1}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, ri) => {
                        const isHL = ri >= hlStart && ri <= hlEnd && hlStart >= 0;
                        return (
                            <tr key={ri} style={{ background: isHL ? 'rgba(59,111,255,0.07)' : ri % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                                <td style={{ padding: '2px 4px', color: '#6a7a96', fontSize: '9px', borderRight: '1px solid #222c42', userSelect: 'none' }}>{ri + 1}</td>
                                {Array.from({ length: numCols }, (_, ci) => {
                                    const val = row[ci] ?? '';
                                    const isHlCol = ci === hlCol;
                                    const dayHL = getCellDayHighlight(val);
                                    const isStart = dayHL === 'start';
                                    const isEnd = dayHL === 'end';
                                    const isIn = dayHL === 'in';
                                    const isZero = zeroStrings && zeroStrings.includes(String(val));
                                    return (
                                        <td key={ci}
                                            onClick={() => onCellClick && onCellClick(ri, ci, String(val))}
                                            style={{
                                                padding: '2px 5px',
                                                border: `1px solid ${isStart || isEnd ? 'rgba(46,204,113,0.7)' : isIn ? 'rgba(46,204,113,0.2)' : isZero ? 'rgba(231,76,60,0.5)' : isHlCol ? 'rgba(245,166,35,0.3)' : 'rgba(255,255,255,0.04)'}`,
                                                whiteSpace: 'nowrap', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis',
                                                background: isStart ? 'rgba(46,204,113,0.35)' : isEnd ? 'rgba(46,204,113,0.35)' : isIn ? 'rgba(46,204,113,0.1)' : isZero ? 'rgba(231,76,60,0.18)' : isHlCol ? 'rgba(245,166,35,0.1)' : isHL ? 'rgba(59,111,255,0.08)' : 'transparent',
                                                color: isStart || isEnd ? '#2ecc71' : isIn ? 'rgba(46,204,113,0.8)' : isZero ? '#e74c3c' : isHL ? '#00c2ff' : '#e8eaf0',
                                                fontWeight: isStart || isEnd ? 800 : isZero ? 700 : isHL || isHlCol ? 600 : 400,
                                                cursor: onCellClick ? 'pointer' : 'default',
                                                transition: 'background .1s',
                                                outline: (isStart || isEnd) ? '2px solid rgba(46,204,113,0.6)' : isZero ? '1px solid rgba(231,76,60,0.5)' : 'none'
                                            }}
                                            title={isStart ? `▶ Prima zi: ${val}` : isEnd ? `◀ Ultima zi: ${val}` : isIn ? `Ziua ${val} (în interval)` : isZero ? `0️⃣ Valoare zero: "${val}"` : `R${ri + 1}C${ci + 1}: ${val}`}
                                        >
                                            {String(val).slice(0, 22)}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </Box>
    );
}

// ─── STEP 2: DETECTION + MANUAL OVERRIDES ──────────────────────────────────

function Step2Detection({ parseResult, file, selectedProject, allPersons, selectedPerson, onPersonChange, onConfirmBlock, onBack }) {
    const [chosenBlock, setChosenBlock] = useState(() =>
        selectBestBlock(parseResult?.candidateBlocks || [], selectedProject?.smis)
    );
    const [sheetIdx, setSheetIdx] = useState(0);
    const [clickMode, setClickMode] = useState(null); // null | 'cell' | 'col'
    const [manualHoursCol, setManualHoursCol] = useState(null);
    const [manualNameOverride, setManualNameOverride] = useState('');
    // Manual period override
    const [manualMonth, setManualMonth] = useState(parseResult?.detectedPeriod?.month || new Date().getMonth() + 1);
    const [manualYear, setManualYear] = useState(parseResult?.detectedPeriod?.year || new Date().getFullYear());
    const periodOverride = { month: manualMonth, year: manualYear };
    // Day range selection
    const [dayRangeStart, setDayRangeStart] = useState(null);
    const [dayRangeEnd, setDayRangeEnd] = useState(null);
    const [rangeStep, setRangeStep] = useState(null); // null | 'start' | 'end'
    const clearRange = () => { setDayRangeStart(null); setDayRangeEnd(null); setRangeStep(null); };
    // Zero-string selection: user picks cell values that mean "0 hours"
    const [zeroStrings, setZeroStrings] = useState([]);
    const addZeroString = (val) => {
        const s = String(val); // keep raw (may be empty string)
        if (!zeroStrings.includes(s)) setZeroStrings(prev => [...prev, s]);
    };
    const clearZeroStrings = () => setZeroStrings([]);

    if (!parseResult) return null;

    const targetFound = parseResult.candidateBlocks.some(b => b.smis === selectedProject?.smis);
    const smisTargetBlocks = parseResult.candidateBlocks.filter(b => b.smis === selectedProject?.smis);
    const otherBlocks = parseResult.candidateBlocks.filter(b => b.smis !== selectedProject?.smis);
    const currentSheet = parseResult.sheets?.[sheetIdx];

    // When user clicks a column, rebuild the block with hours from that column
    const handleColClick = (ci) => {
        if (clickMode !== 'col' || !currentSheet) return;
        setManualHoursCol(ci);

        // Rebuild dayHours from this column
        const aoa = currentSheet.aoa;
        const dayHours = {};
        let daysFound = 0;

        // Find day column (first col or col 0 usually)
        const anchorRow = chosenBlock?.anchorRow ?? 0;
        for (let ri = anchorRow + 1; ri < aoa.length; ri++) {
            const row = aoa[ri] || [];
            // Try to get day number from first column or the day col of the block
            let dayNum = null;
            const dayCol = chosenBlock?.dayCol ?? 0;
            dayNum = parseInt(String(row[dayCol] || ''));
            if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) continue;

            const cellVal = String(row[ci] ?? '').trim().toUpperCase();
            const cellRaw = String(row[ci] ?? '');
            // Check if this cell value is in the user-defined zero-strings
            if (zeroStrings.length > 0 && zeroStrings.includes(cellRaw)) {
                dayHours[dayNum] = 0; daysFound++;
            } else if (cellVal === 'CO' || cellVal === 'CM') {
                dayHours[dayNum] = cellVal; daysFound++;
            } else {
                const nv = parseFloat(cellVal.replace(',', '.'));
                if (!isNaN(nv)) { dayHours[dayNum] = nv; daysFound++; }
                else { dayHours[dayNum] = 0; daysFound++; }
            }
            if (dayNum >= 28 && ri > anchorRow + 20) break;
        }

        if (daysFound > 0 && chosenBlock) {
            setChosenBlock({
                ...chosenBlock,
                hoursCol: ci,
                dayHours,
                daysFound,
                confidence: daysFound >= 20 ? 'high' : 'medium',
                notes: `[Manual] Coloana ${ci + 1} selectată de utilizator`
            });
        }
        setClickMode(null);
    };

    const handleCellClick = (ri, ci, val) => {
        if (clickMode === 'cell') {
            if (val && val.trim().length > 2) {
                setManualNameOverride(val.trim());
                setClickMode(null);
            }
            return;
        }
        if (clickMode === 'range') {
            // Try to parse a day number from the clicked cell
            const numVal = parseInt(String(val || '').trim(), 10);
            if (isNaN(numVal) || numVal < 1 || numVal > 31) return;
            if (rangeStep === 'start' || rangeStep === null) {
                setDayRangeStart(numVal);
                setDayRangeEnd(null);
                setRangeStep('end');
            } else {
                // second click = end
                const start = dayRangeStart;
                if (numVal < start) {
                    setDayRangeStart(numVal);
                    setDayRangeEnd(start);
                } else {
                    setDayRangeEnd(numVal);
                }
                setRangeStep(null);
                setClickMode(null);
            }
            return;
        }
        if (clickMode === 'zeroStr') {
            // Register the raw cell value as a zero-equivalent
            addZeroString(val);
            // Don't close the mode — allow picking multiple zero values
            return;
        }
    };

    const effectiveName = manualNameOverride || parseResult.detectedName;
    const effectivePerson = selectedPerson;

    return (
        <Box>
            <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 700 }}>Pas 2 — Verificare Detectări</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                Verifică și corectează manual datele detectate. Poți click pe celule/coloane direct în preview.
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '3fr 2fr' }, gap: 2 }}>
                {/* LEFT: Excel Preview */}
                <Box>
                    <Paper sx={{ p: 0, border: '1px solid #222c42', overflow: 'hidden' }}>
                        {/* Sheet tabs */}
                        <Box sx={{ p: '10px 14px', borderBottom: '1px solid #222c42', bgcolor: 'rgba(0,0,0,0.2)', display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                            <PreviewIcon sx={{ fontSize: 16, color: '#6a7a96' }} />
                            <Typography sx={{ fontSize: '12px', fontWeight: 600 }}>Preview</Typography>
                            {parseResult.type === 'excel' && parseResult.sheets?.length > 1 && (
                                <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                                    {parseResult.sheets.map((s, i) => (
                                        <Chip key={i} label={s.name} size="small" onClick={() => setSheetIdx(i)}
                                            sx={{ bgcolor: sheetIdx === i ? 'rgba(59,111,255,0.25)' : 'transparent', cursor: 'pointer', fontSize: '10px', borderColor: sheetIdx === i ? '#3b6fff' : '#333', border: '1px solid' }} />
                                    ))}
                                </Box>
                            )}
                            <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                                <Tooltip title="Click pe o celulă cu numele persoanei">
                                    <Chip
                                        label="📌 Selectează Nume" size="small" clickable
                                        onClick={() => setClickMode(clickMode === 'cell' ? null : 'cell')}
                                        sx={{ bgcolor: clickMode === 'cell' ? 'rgba(59,111,255,0.25)' : 'transparent', border: `1px solid ${clickMode === 'cell' ? '#3b6fff' : '#333'}`, fontSize: '10px', cursor: 'pointer' }}
                                    />
                                </Tooltip>
                                <Tooltip title="Click pe headerul coloanei cu orele">
                                    <Chip
                                        label="📊 Selectează Coloană Ore" size="small" clickable
                                        onClick={() => setClickMode(clickMode === 'col' ? null : 'col')}
                                        sx={{ bgcolor: clickMode === 'col' ? 'rgba(245,166,35,0.2)' : 'transparent', border: `1px solid ${clickMode === 'col' ? '#f5a623' : '#333'}`, fontSize: '10px', cursor: 'pointer' }}
                                    />
                                </Tooltip>
                                <Tooltip title={rangeStep === 'start' || rangeStep === null && clickMode === 'range' ? 'Click pe ziua de START din tabel' : rangeStep === 'end' ? 'Click pe ziua de FINAL din tabel' : 'Selectează intervalul de zile (prima → ultima zi) direct din tabel'}>
                                    <Chip
                                        label={clickMode === 'range' ? (rangeStep === 'end' ? '📅 Click pe ULTIMA zi...' : '📅 Click pe PRIMA zi...') : '📅 Interval Zile'} size="small" clickable
                                        onClick={() => {
                                            if (clickMode === 'range') { setClickMode(null); setRangeStep(null); }
                                            else { setClickMode('range'); setRangeStep('start'); setDayRangeStart(null); setDayRangeEnd(null); }
                                        }}
                                        sx={{ bgcolor: clickMode === 'range' ? 'rgba(46,204,113,0.25)' : 'transparent', border: `1px solid ${clickMode === 'range' ? '#2ecc71' : '#333'}`, fontSize: '10px', cursor: 'pointer', color: clickMode === 'range' ? '#2ecc71' : 'inherit' }}
                                    />
                                </Tooltip>
                                <Tooltip title="Click pe o celulă goală sau cu valoarea care înseamnă ZERO ore (ex: '-', 'x', gol). Poți selecta mai multe.">
                                    <Chip
                                        label={clickMode === 'zeroStr' ? '0️⃣ Click pe celula zero...' : `0️⃣ Zero String${zeroStrings.length > 0 ? ` (${zeroStrings.length})` : ''}`}
                                        size="small" clickable
                                        onClick={() => setClickMode(clickMode === 'zeroStr' ? null : 'zeroStr')}
                                        sx={{
                                            bgcolor: clickMode === 'zeroStr' ? 'rgba(231,76,60,0.25)' : zeroStrings.length > 0 ? 'rgba(231,76,60,0.1)' : 'transparent',
                                            border: `1px solid ${clickMode === 'zeroStr' ? '#e74c3c' : zeroStrings.length > 0 ? 'rgba(231,76,60,0.5)' : '#333'}`,
                                            fontSize: '10px', cursor: 'pointer',
                                            color: clickMode === 'zeroStr' || zeroStrings.length > 0 ? '#e74c3c' : 'inherit'
                                        }}
                                    />
                                </Tooltip>
                            </Box>
                        </Box>
                        <Box sx={{ overflow: 'auto', maxHeight: 420 }}>
                            {parseResult.type === 'excel' && currentSheet ? (
                                <ExcelPreviewInteractive
                                    sheet={currentSheet}
                                    highlightBlock={chosenBlock}
                                    manualHoursCol={manualHoursCol}
                                    onCellClick={handleCellClick}
                                    onColClick={handleColClick}
                                    clickMode={clickMode}
                                    dayRangeStart={dayRangeStart}
                                    dayRangeEnd={dayRangeEnd}
                                    zeroStrings={zeroStrings}
                                />
                            ) : (
                                <Box sx={{ p: 3, fontSize: '12px', color: 'text.secondary', fontFamily: 'monospace' }}>
                                    {parseResult.pages?.[0]?.text?.slice(0, 2000)}
                                </Box>
                            )}
                        </Box>
                    </Paper>
                </Box>

                {/* RIGHT: Detections + overrides */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

                    {/* 1. Person identification */}
                    <Paper sx={{ p: 2, border: '1px solid #222c42' }}>
                        <Typography sx={{ fontSize: '11px', fontWeight: 700, mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'text.secondary' }}>
                            👤 Persoana
                        </Typography>

                        {/* Name from document */}
                        <Box sx={{ mb: 1.5 }}>
                            <Typography sx={{ fontSize: '9px', color: 'text.secondary', mb: 0.5, textTransform: 'uppercase' }}>
                                Nume detectat din document
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <Box sx={{ flex: 1, p: '6px 10px', bgcolor: effectiveName ? 'rgba(46,204,113,0.08)' : 'rgba(231,76,60,0.08)', borderRadius: '6px', border: `1px solid ${effectiveName ? 'rgba(46,204,113,0.25)' : 'rgba(231,76,60,0.25)'}` }}>
                                    <Typography sx={{ fontSize: '12px', fontWeight: 600, color: effectiveName ? '#fff' : '#e74c3c' }}>
                                        {effectiveName || '— Nedetectat (click în preview pe celula cu numele)'}
                                    </Typography>
                                </Box>
                                {manualNameOverride && (
                                    <Chip label="Manual" size="small" sx={{ bgcolor: 'rgba(59,111,255,0.15)', color: '#3b6fff', border: '1px solid #3b6fff', fontSize: '9px' }} />
                                )}
                            </Box>
                        </Box>

                        {/* Person selector from DB */}
                        <Typography sx={{ fontSize: '9px', color: 'text.secondary', mb: 0.5, textTransform: 'uppercase' }}>
                            Persoana în baza de date (obligatoriu pentru import)
                        </Typography>
                        <Autocomplete
                            size="small"
                            options={allPersons}
                            value={effectivePerson}
                            onChange={(_, v) => onPersonChange(v)}
                            getOptionLabel={p => p ? `${p.name} ${p.fname}${p.cnp ? ` (${p.cnp})` : ''}` : ''}
                            isOptionEqualToValue={(a, b) => a?.id === b?.id}
                            renderInput={params => (
                                <TextField {...params} placeholder="Caută nume sau CNP..." size="small"
                                    sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.2)', fontSize: '12px' } }}
                                />
                            )}
                            renderOption={(props, p) => (
                                <Box component="li" {...props} sx={{ fontSize: '12px' }}>
                                    <Box>
                                        <Typography sx={{ fontSize: '12px', fontWeight: 600 }}>{p.name} {p.fname}</Typography>
                                        <Typography sx={{ fontSize: '10px', color: 'text.secondary' }}>{p.cnp}</Typography>
                                    </Box>
                                </Box>
                            )}
                            noOptionsText="Nicio persoană găsită"
                        />

                        {!effectivePerson && (
                            <Alert severity="warning" sx={{ mt: 1, py: 0.5, fontSize: '11px' }}>
                                Selectează persoana din baza de date pentru a putea importa.
                            </Alert>
                        )}
                        {effectivePerson && (
                            <Box sx={{ mt: 1, p: 1, bgcolor: 'rgba(46,204,113,0.06)', borderRadius: '6px', border: '1px solid rgba(46,204,113,0.2)', display: 'flex', gap: 1 }}>
                                <CheckCircleIcon sx={{ fontSize: 14, color: '#2ecc71', mt: '2px' }} />
                                <Box>
                                    <Typography sx={{ fontSize: '11px', fontWeight: 700 }}>{effectivePerson.name} {effectivePerson.fname}</Typography>
                                    <Typography sx={{ fontSize: '10px', color: 'text.secondary' }}>CNP: {effectivePerson.cnp}</Typography>
                                </Box>
                            </Box>
                        )}
                    </Paper>

                    {/* 2. Period selector */}
                    <Paper sx={{ p: 2, border: `1px solid ${parseResult.detectedPeriod ? '#222c42' : '#f5a62366'}` }}>
                        <Typography sx={{ fontSize: '11px', fontWeight: 700, mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'text.secondary' }}>
                            📅 Perioadă (Lună / An)
                        </Typography>
                        {parseResult.detectedPeriod ? (
                            <Box sx={{ p: 1.5, bgcolor: 'rgba(46,204,113,0.06)', borderRadius: '6px', border: '1px solid rgba(46,204,113,0.2)', mb: 1 }}>
                                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#2ecc71' }}>
                                    ✓ Auto-detectat: {MONTHS_RO[parseResult.detectedPeriod.month - 1]} {parseResult.detectedPeriod.year}
                                </Typography>
                            </Box>
                        ) : (
                            <Alert severity="warning" sx={{ mb: 1, py: 0.5, fontSize: '11px' }}>Luna/Anul nu au putut fi detectate automat — selectează manual mai jos.</Alert>
                        )}
                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                            <Box sx={{ flex: 1 }}>
                                <Typography sx={{ fontSize: '9px', color: 'text.secondary', mb: 0.5, textTransform: 'uppercase' }}>Lună</Typography>
                                <Select size="small" fullWidth value={manualMonth} onChange={e => setManualMonth(Number(e.target.value))}
                                    sx={{ bgcolor: 'rgba(0,0,0,0.2)', fontSize: '12px' }}>
                                    {MONTHS_RO.map((m, i) => <MenuItem key={i} value={i + 1} sx={{ fontSize: '12px' }}>{m}</MenuItem>)}
                                </Select>
                            </Box>
                            <Box sx={{ flex: 1 }}>
                                <Typography sx={{ fontSize: '9px', color: 'text.secondary', mb: 0.5, textTransform: 'uppercase' }}>An</Typography>
                                <Select size="small" fullWidth value={manualYear} onChange={e => setManualYear(Number(e.target.value))}
                                    sx={{ bgcolor: 'rgba(0,0,0,0.2)', fontSize: '12px' }}>
                                    {[2023, 2024, 2025, 2026, 2027].map(y => <MenuItem key={y} value={y} sx={{ fontSize: '12px' }}>{y}</MenuItem>)}
                                </Select>
                            </Box>
                        </Box>
                        <Box sx={{ mt: 1, p: 1.5, bgcolor: 'rgba(59,111,255,0.06)', borderRadius: '6px', border: '1px solid rgba(59,111,255,0.2)', textAlign: 'center' }}>
                            <Typography sx={{ fontSize: '13px', fontWeight: 800, color: '#00c2ff' }}>
                                {MONTHS_RO[manualMonth - 1]} {manualYear}
                            </Typography>
                            <Typography sx={{ fontSize: '9px', color: 'text.secondary' }}>Perioada care va fi folosită la import</Typography>
                        </Box>
                    </Paper>

                    {/* 3. Metadata */}
                    <Paper sx={{ p: 2, border: '1px solid #222c42' }}>
                        <Typography sx={{ fontSize: '11px', fontWeight: 700, mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'text.secondary' }}>
                            🔍 Informații Detectate
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                            <DetectItem label="CNP în document" value={parseResult.detectedCNP} />
                            <DetectItem label="Perioadă" value={parseResult.detectedPeriod?.label} />
                        </Box>
                        <Box sx={{ mt: 1.5 }}>
                            <Typography sx={{ fontSize: '10px', color: 'text.secondary', mb: 0.75 }}>SMIS găsite:</Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                {parseResult.detectedSMIS.map(s => (
                                    <Chip key={s} label={s} size="small"
                                        sx={{ bgcolor: s === selectedProject?.smis ? 'rgba(46,204,113,0.15)' : 'rgba(255,255,255,0.05)', borderColor: s === selectedProject?.smis ? '#2ecc71' : '#222c42', border: '1px solid', fontSize: '10px', color: s === selectedProject?.smis ? '#2ecc71' : 'text.secondary' }} />
                                ))}
                                {parseResult.detectedSMIS.length === 0 && <Typography sx={{ color: '#e74c3c', fontSize: '11px' }}>Niciun SMIS detectat</Typography>}
                            </Box>
                        </Box>
                    </Paper>

                    {/* 3. Block selection */}
                    <Paper sx={{ p: 2, border: '1px solid #222c42', flex: 1 }}>
                        <Typography sx={{ fontSize: '11px', fontWeight: 700, mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'text.secondary' }}>
                            📦 Bloc Ore (SMIS {selectedProject?.smis})
                        </Typography>

                        {!targetFound ? (
                            <Box>
                                <Alert severity="error" sx={{ borderRadius: '8px', mb: 1.5 }}>
                                    <AlertTitle>SMIS {selectedProject?.smis} nu a fost găsit automat</AlertTitle>
                                    Folosește butonul „📊 Selectează Coloană Ore" din preview pentru a marca manual.
                                </Alert>
                                {manualHoursCol !== null && chosenBlock && (
                                    <Box sx={{ p: 1.5, border: '1px solid #f5a623', borderRadius: '8px', bgcolor: 'rgba(245,166,35,0.06)' }}>
                                        <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#f5a623' }}>✓ Coloana {manualHoursCol + 1} selectată manual</Typography>
                                        <Typography sx={{ fontSize: '10px', color: 'text.secondary' }}>{chosenBlock.daysFound} valori detectate</Typography>
                                    </Box>
                                )}
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {smisTargetBlocks.map((block, i) => (
                                    <Box key={i} onClick={() => setChosenBlock(block)}
                                        sx={{ p: 1.5, border: `1px solid ${chosenBlock === block ? '#3b6fff' : '#222c42'}`, borderRadius: '8px', cursor: 'pointer', bgcolor: chosenBlock === block ? 'rgba(59,111,255,0.1)' : 'rgba(0,0,0,0.1)', transition: 'all .15s' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography sx={{ fontSize: '12px', fontWeight: 600 }}>SMIS {block.smis}</Typography>
                                            <ConfidenceBadge value={block.confidence} />
                                        </Box>
                                        <Typography sx={{ fontSize: '10px', color: 'text.secondary', mt: 0.5 }}>
                                            {block.notes} • {block.daysFound} zile
                                        </Typography>
                                    </Box>
                                ))}
                                {otherBlocks.length > 0 && (
                                    <Alert severity="info" icon={<InfoOutlinedIcon fontSize="small" />} sx={{ mt: 0.5, py: 0.5, fontSize: '11px' }}>
                                        {otherBlocks.length} SMIS ignorat(e): {otherBlocks.map(b => b.smis).join(', ')}
                                    </Alert>
                                )}
                                <Chip label="📊 Schimbă coloana manual" size="small" clickable
                                    onClick={() => setClickMode(clickMode === 'col' ? null : 'col')}
                                    sx={{ alignSelf: 'flex-start', mt: 0.5, bgcolor: clickMode === 'col' ? 'rgba(245,166,35,0.2)' : 'transparent', border: '1px dashed #555', fontSize: '10px' }} />
                            </Box>
                        )}
                    </Paper>

                    {/* 4. Day range panel */}
                    <Paper sx={{ p: 2, border: `1px solid ${dayRangeStart ? 'rgba(46,204,113,0.4)' : '#222c42'}`, bgcolor: dayRangeStart ? 'rgba(46,204,113,0.03)' : 'transparent' }}>
                        <Typography sx={{ fontSize: '11px', fontWeight: 700, mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.5px', color: dayRangeStart ? '#2ecc71' : 'text.secondary' }}>
                            📅 Interval Zile de Lucru
                        </Typography>
                        {!dayRangeStart ? (
                            <Alert severity="info" sx={{ py: 0.5, fontSize: '11px', mb: 1 }}>
                                Apasă „📅 Interval Zile" de mai sus, apoi click pe prima și ultima zi direct din tabelul Excel.
                            </Alert>
                        ) : (
                            <Box sx={{ p: 1.5, bgcolor: 'rgba(46,204,113,0.08)', borderRadius: '8px', border: '1px solid rgba(46,204,113,0.25)', mb: 1 }}>
                                <Typography sx={{ fontSize: '13px', fontWeight: 800, color: '#2ecc71' }}>
                                    Ziua {dayRangeStart} → Ziua {dayRangeEnd ?? '...'}
                                </Typography>
                                {dayRangeEnd && (
                                    <Typography sx={{ fontSize: '10px', color: 'text.secondary', mt: 0.25 }}>
                                        {dayRangeEnd - dayRangeStart + 1} zile în interval
                                    </Typography>
                                )}
                            </Box>
                        )}
                        {rangeStep === 'end' && (
                            <Alert severity="warning" sx={{ py: 0.5, fontSize: '11px', mb: 1 }} icon={false}>
                                ✅ Prima zi: <strong>{dayRangeStart}</strong> — acum click pe <strong>ultima zi</strong>
                            </Alert>
                        )}
                        {dayRangeStart && (
                            <Button size="small" variant="outlined" onClick={clearRange}
                                sx={{ fontSize: '10px', height: 26, borderColor: '#333', color: '#999' }}>
                                ↺ Resetează interval
                            </Button>
                        )}
                    </Paper>

                    {/* 5. Zero strings panel */}
                    <Paper sx={{ p: 2, border: `1px solid ${zeroStrings.length > 0 ? 'rgba(231,76,60,0.4)' : '#222c42'}`, bgcolor: zeroStrings.length > 0 ? 'rgba(231,76,60,0.02)' : 'transparent' }}>
                        <Typography sx={{ fontSize: '11px', fontWeight: 700, mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.5px', color: zeroStrings.length > 0 ? '#e74c3c' : 'text.secondary' }}>
                            0️⃣ Valori care înseamnă Zero Ore
                        </Typography>
                        {zeroStrings.length === 0 ? (
                            <Alert severity="info" sx={{ py: 0.5, fontSize: '11px', mb: 1 }}>
                                Apasă „0️⃣ Zero String" din bara preview, apoi click pe o celulă care înseamnă 0 ore (goală, „-", „x" etc.).<br />
                                Poți adăuga mai multe valori.
                            </Alert>
                        ) : (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
                                {zeroStrings.map((s, i) => (
                                    <Chip key={i}
                                        label={s === '' ? '(gol)' : `"${s}"`}
                                        size="small" onDelete={() => setZeroStrings(prev => prev.filter((_, idx) => idx !== i))}
                                        sx={{ bgcolor: 'rgba(231,76,60,0.15)', color: '#e74c3c', border: '1px solid rgba(231,76,60,0.4)', fontSize: '11px' }}
                                    />
                                ))}
                            </Box>
                        )}
                        {zeroStrings.length > 0 && (
                            <Button size="small" variant="outlined" onClick={clearZeroStrings}
                                sx={{ fontSize: '10px', height: 26, borderColor: '#333', color: '#999' }}>
                                ↺ Resetează valori zero
                            </Button>
                        )}
                    </Paper>

                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                        <Button startIcon={<ArrowBackIcon />} onClick={onBack} variant="outlined" size="small">Înapoi</Button>
                        <Button
                            variant="contained"
                            disabled={!chosenBlock || (!targetFound && manualHoursCol === null)}
                            onClick={() => onConfirmBlock(chosenBlock, periodOverride, dayRangeStart || null, dayRangeEnd || null)}
                            sx={{ background: 'linear-gradient(135deg, #3b6fff, #00c2ff)' }}
                        >
                            Confirmă Bloc →
                        </Button>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}

function DetectItem({ label, value }) {
    return (
        <Box>
            <Typography sx={{ fontSize: '9px', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</Typography>
            <Typography sx={{ fontSize: '12px', fontWeight: 600, color: value ? '#fff' : '#e74c3c' }}>{value || 'Nedetectat'}</Typography>
        </Box>
    );
}

// ─── STEP 3: CONFIRM & PREVIEW ─────────────────────────────────────────────

function Step3Confirm({ block, parseResult, selectedProject, selectedPerson, year, month, existingData, onImport, onBack, initialFirstDay, initialLastDay }) {
    const [mergeMode, setMergeMode] = useState('replace');
    const daysInMonth = new Date(year, month, 0).getDate();
    const origHours = block.dayHours || {};

    // Editable day hours — start from parsed data
    const [editHours, setEditHours] = useState(() => {
        const h = {};
        for (let d = 1; d <= daysInMonth; d++) {
            const v = origHours[d];
            h[d] = (v !== undefined && v !== null) ? v : 0;
        }
        return h;
    });

    // First / last day range — pre-filled from Step2 day range selection if available
    const [firstDay, setFirstDay] = useState(initialFirstDay || 1);
    const [lastDay, setLastDay] = useState(initialLastDay || daysInMonth);

    // Editing state
    const [editingDay, setEditingDay] = useState(null);
    const [editVal, setEditVal] = useState('');

    const hasDuplicate = existingData && Object.keys(existingData.days || {}).length > 0;
    const dayKeys = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // Effective hours = editHours zeroed outside [firstDay, lastDay]
    const effectiveHours = {};
    dayKeys.forEach(d => {
        effectiveHours[d] = (d >= firstDay && d <= lastDay) ? editHours[d] : 0;
    });

    const total = dayKeys.reduce((s, d) => {
        const v = effectiveHours[d];
        return s + (typeof v === 'number' ? v : 0);
    }, 0);

    const validation = validateBlock({ ...block, dayHours: effectiveHours }, year, month, existingData);

    const startEdit = (d) => {
        const v = editHours[d];
        setEditingDay(d);
        setEditVal(typeof v === 'number' ? String(v) : (v || '0'));
    };

    const commitEdit = () => {
        if (editingDay === null) return;
        const upper = editVal.trim().toUpperCase();
        if (upper === 'CO' || upper === 'CM') {
            setEditHours(prev => ({ ...prev, [editingDay]: upper }));
        } else {
            const n = parseFloat(editVal.replace(',', '.'));
            setEditHours(prev => ({ ...prev, [editingDay]: isNaN(n) ? 0 : Math.max(0, Math.min(24, n)) }));
        }
        setEditingDay(null);
    };

    const resetToOriginal = () => {
        const h = {};
        for (let d = 1; d <= daysInMonth; d++) {
            const v = origHours[d];
            h[d] = (v !== undefined && v !== null) ? v : 0;
        }
        setEditHours(h);
        setFirstDay(1);
        setLastDay(daysInMonth);
    };

    return (
        <Box>
            <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 700 }}>Pas 3 — Previzualizare Import</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>Verifică și editează datele. Click pe o zi pentru a modifica orele. Nu sunt salvate încă.</Typography>

            {validation.hardErrors.length > 0 && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }}>
                    <AlertTitle>Erori critice — Import blocat</AlertTitle>
                    {validation.hardErrors.map((e, i) => <div key={i}>• {e}</div>)}
                </Alert>
            )}
            {validation.softWarnings.filter(w => !w.startsWith('DUPLICAT')).map((w, i) => (
                <Alert key={i} severity="warning" icon={<WarningAmberIcon fontSize="small" />} sx={{ mb: 1, borderRadius: '8px', py: 0.5 }}>{w}</Alert>
            ))}

            {hasDuplicate && (
                <Paper sx={{ p: 2, mb: 2, border: '1px solid #f5a623', bgcolor: 'rgba(245,166,35,0.05)', borderRadius: '8px' }}>
                    <Typography sx={{ fontSize: '12px', fontWeight: 700, mb: 1.5, color: '#f5a623' }}>⚠️ Date existente — alege acțiunea:</Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        {[['replace', '🔄 Replace', 'Rescrie luna complet'], ['merge', '🔀 Merge', 'Completează zilele lipsă'], ['cancel', '❌ Anulează', 'Nu importa']].map(([val, label, desc]) => (
                            <Box key={val} onClick={() => setMergeMode(val)}
                                sx={{ flex: 1, p: 1.5, border: `1px solid ${mergeMode === val ? '#f5a623' : '#222c42'}`, borderRadius: '8px', cursor: 'pointer', textAlign: 'center', bgcolor: mergeMode === val ? 'rgba(245,166,35,0.1)' : 'transparent' }}>
                                <Typography sx={{ fontSize: '12px', fontWeight: 700 }}>{label}</Typography>
                                <Typography sx={{ fontSize: '9px', color: 'text.secondary', mt: 0.25 }}>{desc}</Typography>
                            </Box>
                        ))}
                    </Box>
                </Paper>
            )}

            {/* Summary cards */}
            <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
                {[
                    ['Persoană', selectedPerson ? `${selectedPerson.name} ${selectedPerson.fname}` : parseResult.detectedName || '—', '#3b6fff'],
                    ['Proiect SMIS', selectedProject?.smis, '#00c2ff'],
                    ['Perioadă', `${MONTHS_RO[month - 1]} ${year}`, '#f5a623'],
                    ['Total ore', total, '#2ecc71'],
                ].map(([label, value, color]) => (
                    <Paper key={label} sx={{ p: 1.5, flex: 1, minWidth: 80, border: '1px solid #222c42', textAlign: 'center' }}>
                        <Typography sx={{ fontSize: '9px', color: 'text.secondary', textTransform: 'uppercase', mb: 0.5 }}>{label}</Typography>
                        <Typography sx={{ fontSize: '15px', fontWeight: 800, color }}>{value}</Typography>
                    </Paper>
                ))}
            </Box>

            {/* First / Last Day range selector */}
            <Paper sx={{ p: 2, mb: 2, border: '1px solid #1e3a5f', bgcolor: 'rgba(0,194,255,0.03)', borderRadius: '8px' }}>
                <Typography sx={{ fontSize: '11px', fontWeight: 700, mb: 1.5, color: '#00c2ff', textTransform: 'uppercase' }}>
                    📅 Interval zile de lucru (zeroes out zilele din afara intervalului)
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Box>
                        <Typography sx={{ fontSize: '10px', color: 'text.secondary', mb: 0.5 }}>Prima zi</Typography>
                        <Select size="small" value={firstDay} onChange={e => setFirstDay(Number(e.target.value))}
                            sx={{ bgcolor: 'rgba(0,0,0,0.2)', fontSize: '12px', minWidth: 80 }}>
                            {dayKeys.filter(d => d <= lastDay).map(d => (
                                <MenuItem key={d} value={d} sx={{ fontSize: '12px' }}>{d}</MenuItem>
                            ))}
                        </Select>
                    </Box>
                    <Typography sx={{ color: 'text.secondary', mt: 2.5 }}>→</Typography>
                    <Box>
                        <Typography sx={{ fontSize: '10px', color: 'text.secondary', mb: 0.5 }}>Ultima zi</Typography>
                        <Select size="small" value={lastDay} onChange={e => setLastDay(Number(e.target.value))}
                            sx={{ bgcolor: 'rgba(0,0,0,0.2)', fontSize: '12px', minWidth: 80 }}>
                            {dayKeys.filter(d => d >= firstDay).map(d => (
                                <MenuItem key={d} value={d} sx={{ fontSize: '12px' }}>{d}</MenuItem>
                            ))}
                        </Select>
                    </Box>
                    <Box sx={{ mt: 2.5 }}>
                        <Typography sx={{ fontSize: '11px', color: '#2ecc71', fontWeight: 700 }}>
                            {lastDay - firstDay + 1} zile actve
                        </Typography>
                    </Box>
                    <Button size="small" onClick={resetToOriginal} variant="outlined"
                        sx={{ mt: 2.5, fontSize: '10px', height: 28, borderColor: '#333', color: '#999' }}>
                        ↺ Reset
                    </Button>
                </Box>
            </Paper>

            {/* Editable Day Grid */}
            <Paper sx={{ p: 0, border: '1px solid #222c42', mb: 3, overflow: 'auto' }}>
                <Box sx={{ p: '10px 14px', borderBottom: '1px solid #222c42', bgcolor: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ fontSize: '11px', fontWeight: 600 }}>Preview Zi → Ore <Typography component="span" sx={{ fontSize: '10px', color: '#f5a623', ml: 1 }}>✎ Click pe o zi pentru a edita</Typography></Typography>
                    <Typography sx={{ fontSize: '10px', color: 'text.secondary' }}>Total: <strong style={{ color: '#2ecc71' }}>{total}h</strong></Typography>
                </Box>
                <Box sx={{ p: 2 }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(52px, 1fr))', gap: 1 }}>
                        {dayKeys.map(d => {
                            const val = effectiveHours[d];
                            const rawVal = editHours[d];
                            const isWE = [0, 6].includes(new Date(year, month - 1, d).getDay());
                            const isCo = val === 'CO' || val === 'CM';
                            const hasHours = typeof val === 'number' && val > 0;
                            const isOutsideRange = d < firstDay || d > lastDay;
                            const isEditing = editingDay === d;

                            if (isEditing) {
                                return (
                                    <Box key={d} sx={{ textAlign: 'center', p: '2px', borderRadius: '6px', border: '1px solid #f5a623', bgcolor: 'rgba(245,166,35,0.15)' }}>
                                        <Typography sx={{ fontSize: '9px', color: isWE ? '#e74c3c' : 'text.secondary', fontWeight: 700 }}>{d}</Typography>
                                        <input
                                            autoFocus
                                            value={editVal}
                                            onChange={e => setEditVal(e.target.value)}
                                            onBlur={commitEdit}
                                            onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingDay(null); }}
                                            style={{
                                                width: '100%', background: 'transparent', border: 'none', outline: 'none',
                                                color: '#f5a623', fontSize: '13px', fontWeight: 800, textAlign: 'center', padding: '1px 0'
                                            }}
                                        />
                                    </Box>
                                );
                            }

                            return (
                                <Tooltip key={d} title={isOutsideRange ? 'În afara intervalului (0)' : 'Click pentru a edita'} placement="top">
                                    <Box onClick={() => !isOutsideRange && startEdit(d)}
                                        sx={{
                                            textAlign: 'center', p: '4px 2px', borderRadius: '6px',
                                            cursor: isOutsideRange ? 'not-allowed' : 'pointer',
                                            opacity: isOutsideRange ? 0.35 : 1,
                                            bgcolor: isCo ? 'rgba(245,166,35,0.15)' : isWE ? 'rgba(231,76,60,0.08)' : hasHours ? 'rgba(59,111,255,0.1)' : 'rgba(255,255,255,0.02)',
                                            border: `1px solid ${isCo ? 'rgba(245,166,35,0.3)' : isWE ? 'rgba(231,76,60,0.2)' : hasHours ? 'rgba(59,111,255,0.25)' : '#222c42'}`,
                                            transition: 'all .1s',
                                            '&:hover': isOutsideRange ? {} : { borderColor: '#f5a623', bgcolor: 'rgba(245,166,35,0.08)' }
                                        }}>
                                        <Typography sx={{ fontSize: '9px', color: isWE ? '#e74c3c' : 'text.secondary', fontWeight: 700 }}>{d}</Typography>
                                        <Typography sx={{ fontSize: '13px', fontWeight: 800, color: isCo ? '#f5a623' : isWE ? '#e74c3c' : hasHours ? '#00c2ff' : '#6a7a96' }}>
                                            {val !== undefined && val !== null ? val : 0}
                                        </Typography>
                                    </Box>
                                </Tooltip>
                            );
                        })}
                    </Box>
                </Box>
            </Paper>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button startIcon={<ArrowBackIcon />} onClick={onBack} variant="outlined" size="small">Înapoi</Button>
                <Button variant="contained" disabled={validation.hardErrors.length > 0 || mergeMode === 'cancel' || !selectedPerson}
                    onClick={() => onImport(effectiveHours, mergeMode)}
                    sx={{ background: 'linear-gradient(135deg, #2ecc71, #27ae60)', color: '#fff', fontWeight: 700 }}
                    startIcon={<CloudUploadIcon />}>
                    Importă
                </Button>
            </Box>
        </Box>
    );
}

// ─── STEP 4: SUCCESS ─────────────────────────────────────────────────────────

function Step4Success({ importLog, onReset, onViewHistory }) {
    return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircleIcon sx={{ fontSize: 72, color: '#2ecc71', mb: 2 }} />
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Import Reușit!</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>Datele au fost salvate cu succes.</Typography>
            <Paper sx={{ p: 3, mx: 'auto', maxWidth: 480, border: '1px solid #2ecc71', bgcolor: 'rgba(46,204,113,0.05)', textAlign: 'left', mb: 3 }}>
                <Typography sx={{ fontSize: '11px', fontWeight: 700, mb: 1.5, color: '#2ecc71', textTransform: 'uppercase' }}>Log Import</Typography>
                {Object.entries(importLog).map(([k, v]) => (
                    <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography sx={{ fontSize: '11px', color: 'text.secondary' }}>{k}</Typography>
                        <Typography sx={{ fontSize: '11px', fontWeight: 600 }}>{v}</Typography>
                    </Box>
                ))}
            </Paper>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button variant="outlined" onClick={onReset}>Import Nou</Button>
                {onViewHistory && (
                    <Button variant="outlined" onClick={onViewHistory} sx={{ borderColor: '#f5a623', color: '#f5a623', '&:hover': { bgcolor: 'rgba(245,166,35,0.08)' } }}>
                        📜 Voir Historicul
                    </Button>
                )}
                <Button variant="contained" href="/pontaj" sx={{ background: 'linear-gradient(135deg,#3b6fff,#00c2ff)' }}>Mergi la Pontaj</Button>
            </Box>
        </Box>
    );
}

// ─── IMPORT HISTORY PANEL ────────────────────────────────────────────────────

const HISTORY_KEY = 'pontaj_import_history';

function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}
function saveHistory(h) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
}

function HistoryPanel({ projects }) {
    const navigate = useNavigate();
    const [history, setHistory] = useState(loadHistory);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const { enqueueSnackbar } = useSnackbar();

    const handleDelete = async (entry) => {
        setDeleting(true);
        try {
            // Fetch current pontaj data for that period
            const res = await api.get(`/pontaj/${entry.projectId}/${entry.year}/${entry.month}`);
            const current = res.data || {};
            delete current[entry.personId];
            await api.post(`/pontaj/${entry.projectId}/${entry.year}/${entry.month}`, current);

            // Remove from history
            const newH = history.filter(h => h.id !== entry.id);
            setHistory(newH);
            saveHistory(newH);
            enqueueSnackbar('Pontajul importat a fost șters.', { variant: 'success' });
        } catch (e) {
            enqueueSnackbar('Eroare la ștergere: ' + e.message, { variant: 'error' });
        } finally {
            setDeleting(false);
            setDeleteTarget(null);
        }
    };

    const handleGoToEdit = (entry) => {
        navigate(`/pontaj?projectId=${entry.projectId}&year=${entry.year}&month=${entry.month}`);
    };

    if (history.length === 0) {
        return (
            <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
                <HistoryIcon sx={{ fontSize: 48, opacity: 0.3, mb: 2 }} />
                <Typography>Nu există importuri înregistrate.</Typography>
                <Typography variant="caption">Fiecare import va apărea aici pentru urmărire și gestionare.</Typography>
            </Box>
        );
    }

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography sx={{ fontSize: '13px', color: 'text.secondary' }}>
                    {history.length} import(uri) înregistrate
                </Typography>
                <Button size="small" color="error" variant="outlined"
                    onClick={() => { if (window.confirm('Ștergi tot istoricul (nu și datele din pontaj)?')) { setHistory([]); saveHistory([]); } }}
                    sx={{ fontSize: '11px', height: 26 }}
                >Golește istoricul</Button>
            </Box>

            {[...history].reverse().map(entry => (
                <Paper key={entry.id} sx={{ p: 2, mb: 1.5, border: '1px solid #222c42', borderRadius: '10px' }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <Box sx={{ flex: 1, minWidth: 200 }}>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5 }}>
                                <Typography sx={{ fontSize: '13px', fontWeight: 700 }}>{entry.personName}</Typography>
                                <Chip label={entry.mergeMode || 'replace'} size="small"
                                    sx={{
                                        fontSize: '9px', height: 16,
                                        bgcolor: entry.mergeMode === 'merge' ? 'rgba(59,111,255,0.15)' : 'rgba(231,76,60,0.1)',
                                        color: entry.mergeMode === 'merge' ? '#3b6fff' : '#e74c3c',
                                        border: '1px solid', borderColor: entry.mergeMode === 'merge' ? '#3b6fff' : '#e74c3c'
                                    }} />
                            </Box>
                            <Typography sx={{ fontSize: '11px', color: 'text.secondary' }}>
                                {entry.projectName} • {MONTHS_RO[(entry.month || 1) - 1]} {entry.year}
                            </Typography>
                            <Typography sx={{ fontSize: '10px', color: '#6a7a96', mt: 0.5 }}>
                                📄 {entry.fileName} • {entry.importedAt}
                            </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            <Box sx={{ textAlign: 'center', p: '4px 10px', bgcolor: 'rgba(0,194,255,0.08)', borderRadius: '6px', border: '1px solid rgba(0,194,255,0.2)' }}>
                                <Typography sx={{ fontSize: '17px', fontWeight: 800, color: '#00c2ff' }}>{entry.totalOre}</Typography>
                                <Typography sx={{ fontSize: '9px', color: 'text.secondary' }}>ore</Typography>
                            </Box>

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                <Tooltip title="Mergi la Pontaj Individual pentru a edita">
                                    <Button size="small" variant="outlined" startIcon={<EditIcon sx={{ fontSize: 12 }} />}
                                        onClick={() => handleGoToEdit(entry)}
                                        sx={{ fontSize: '10px', height: 24, borderRadius: '4px', borderColor: '#3b6fff33', color: '#3b6fff' }}>
                                        Editează
                                    </Button>
                                </Tooltip>
                                <Tooltip title="Șterge datele importate din pontaj pentru această perioadă">
                                    <Button size="small" variant="outlined" startIcon={<DeleteOutlineIcon sx={{ fontSize: 12 }} />}
                                        onClick={() => setDeleteTarget(entry)}
                                        sx={{
                                            fontSize: '10px', height: 24, borderRadius: '4px', borderColor: 'rgba(231,76,60,0.35)', color: '#e74c3c',
                                            '&:hover': { bgcolor: 'rgba(231,76,60,0.08)', borderColor: '#e74c3c' }
                                        }}>
                                        Șterge
                                    </Button>
                                </Tooltip>
                            </Box>
                        </Box>
                    </Box>
                </Paper>
            ))}

            {/* Confirm delete dialog */}
            <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} PaperProps={{ sx: { bgcolor: '#141b2d', border: '1px solid #e74c3c' } }}>
                <DialogTitle sx={{ color: '#e74c3c', fontSize: '14px', fontWeight: 700 }}>Confirmi ștergerea?</DialogTitle>
                <DialogContent>
                    <Typography sx={{ fontSize: '13px' }}>
                        Se vor șterge <strong>{deleteTarget?.totalOre} ore</strong> importate pentru <strong>{deleteTarget?.personName}</strong> ({MONTHS_RO[(deleteTarget?.month || 1) - 1]} {deleteTarget?.year}) din proiectul <strong>{deleteTarget?.projectName}</strong>.
                    </Typography>
                    <Alert severity="warning" sx={{ mt: 2, fontSize: '11px' }}>
                        Această acțiune șterge datele din pontaj. Istoricul de import va fi și el actualizat.
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteTarget(null)} size="small">Anulează</Button>
                    <Button onClick={() => handleDelete(deleteTarget)} size="small" color="error" variant="contained" disabled={deleting}>
                        {deleting ? 'Șterg...' : 'Șterge definitiv'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}


export default function ImportPage() {
    const [step, setStep] = useState(1);
    const [activeTab, setActiveTab] = useState(0); // 0=import, 1=history
    const [projects, setProjects] = useState([]);
    const [allPersons, setAllPersons] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [file, setFile] = useState(null);
    const [parsing, setParsing] = useState(false);
    const [parseResult, setParseResult] = useState(null);
    const [confirmedBlock, setConfirmedBlock] = useState(null);
    const [confirmedPeriod, setConfirmedPeriod] = useState(null);
    const [confirmedDayRange, setConfirmedDayRange] = useState({ start: null, end: null });
    const [existingData, setExistingData] = useState(null);
    const [selectedPerson, setSelectedPerson] = useState(null);
    const [importLog, setImportLog] = useState(null);
    const [targetYear] = React.useState(new Date().getFullYear());
    const [targetMonth] = React.useState(new Date().getMonth() + 1);
    const { enqueueSnackbar } = useSnackbar();

    React.useEffect(() => {
        api.get('/projects').then(r => setProjects(r.data)).catch(() => { });
        api.get('/persons?limit=1000').then(r => {
            const data = Array.isArray(r.data) ? r.data : r.data.rows;
            setAllPersons(data || []);
        }).catch(() => { });
    }, []);

    const handleFileSelect = async (f) => {
        if (!selectedProject) { enqueueSnackbar('Selectează mai întâi un proiect!', { variant: 'warning' }); return; }
        setFile(f);
        setParsing(true);
        try {
            const result = await parseImportFile(f);
            setParseResult(result);

            // Auto-match person by CNP
            if (result.detectedCNP) {
                const match = allPersons.find(p => p.cnp === result.detectedCNP);
                if (match) setSelectedPerson(match);
            }
            setStep(2);
        } catch (e) {
            enqueueSnackbar('Eroare la parsarea fișierului: ' + e.message, { variant: 'error' });
        } finally { setParsing(false); }
    };

    const handleConfirmBlock = async (block, periodOverride, dayRangeStart, dayRangeEnd) => {
        setConfirmedBlock(block);
        setConfirmedDayRange({ start: dayRangeStart || null, end: dayRangeEnd || null });
        const usePeriod = periodOverride || parseResult?.detectedPeriod;
        setConfirmedPeriod(usePeriod);
        if (selectedPerson && usePeriod) {
            try {
                const y = usePeriod.year;
                const m = usePeriod.month;
                const res = await api.get(`/pontaj/${selectedProject.id}/${y}/${m}`);
                setExistingData(res.data?.[selectedPerson.id] || {});
            } catch { }
        }
        setStep(3);
    };

    const handleImport = async (dayHours, mergeMode) => {
        try {
            const period = confirmedPeriod || parseResult?.detectedPeriod;
            const y = period?.year || targetYear;
            const m = period?.month || targetMonth;
            const res = await api.get(`/pontaj/${selectedProject.id}/${y}/${m}`);
            const currentPontaj = res.data || {};
            const personId = selectedPerson?.id;
            if (!personId) { enqueueSnackbar('Selectează persoana mai întâi!', { variant: 'error' }); return; }

            let newDays = { ...dayHours };
            if (mergeMode === 'merge' && currentPontaj[personId]?.days) {
                for (const [day, val] of Object.entries(currentPontaj[personId].days)) {
                    if (val !== undefined && val !== null && val !== '' && val !== 0) newDays[day] = val;
                }
            }

            await api.post(`/pontaj/${selectedProject.id}/${y}/${m}`, {
                ...currentPontaj,
                [personId]: { ...(mergeMode === 'merge' ? currentPontaj[personId] : {}), days: newDays, norma: currentPontaj[personId]?.norma || {} }
            });

            // ── Sincronizare automată: adaugă persoana ca membră formală dacă nu este deja ──
            try {
                const projRes = await api.get(`/projects/${selectedProject.id}`);
                const proj = projRes.data;
                const alreadyMember = (proj.members || []).some(
                    m => String(m.personId) === String(personId)
                );
                if (!alreadyMember) {
                    const updatedProj = {
                        ...proj,
                        members: [
                            ...(proj.members || []),
                            {
                                personId: personId,
                                type: 'Importat',
                                partner: selectedPerson.partner || proj.partner || ''
                            }
                        ]
                    };
                    await api.put(`/projects/${selectedProject.id}`, updatedProj);
                }
            } catch (memberErr) {
                console.warn('Nu s-a putut adăuga membrul automat:', memberErr.message);
                // Non-critical — pontajul a fost salvat, membership-ul poate fi adăugat manual
            }

            const totalOre = Object.values(dayHours).filter(v => typeof v === 'number').reduce((s, v) => s + v, 0);

            // Save to localStorage history
            const histEntry = {
                id: Date.now().toString(),
                personId,
                personName: `${selectedPerson.name} ${selectedPerson.fname}`,
                projectId: selectedProject.id,
                projectName: `${selectedProject.name} (SMIS ${selectedProject.smis})`,
                year: y, month: m,
                totalOre,
                mergeMode,
                fileName: file.name,
                importedAt: new Date().toLocaleString('ro-RO')
            };
            const existing = loadHistory();
            saveHistory([...existing, histEntry]);

            setImportLog({
                'Fișier': file.name,
                'Proiect': `${selectedProject.name} (SMIS ${selectedProject.smis})`,
                'Persoană': `${selectedPerson.name} ${selectedPerson.fname}`,
                'Perioadă': `${MONTHS_RO[(m || 1) - 1]} ${y}`,
                'Ore importate': totalOre,
                'Mod import': mergeMode === 'replace' ? 'Replace' : 'Merge',
                'Data import': new Date().toLocaleString('ro-RO')
            });
            setStep(4);
            enqueueSnackbar('Import salvat cu succes!', { variant: 'success' });
        } catch (e) { enqueueSnackbar('Eroare la import: ' + e.message, { variant: 'error' }); }
    };

    const handleReset = () => { setStep(1); setFile(null); setParseResult(null); setConfirmedBlock(null); setConfirmedPeriod(null); setExistingData(null); setSelectedPerson(null); setImportLog(null); };
    const period = confirmedPeriod || parseResult?.detectedPeriod;

    return (
        <Box sx={{ pb: 4 }}>
            <Box sx={{ mb: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h1" gutterBottom sx={{ mb: 0.5 }}>Import Asistat Pontaj</Typography>
                    <Typography variant="subtitle1">Importă fișe de pontaj Excel/PDF și extrage orele per proiect SMIS</Typography>
                </Box>
            </Box>

            {/* Main tabs */}
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}
                sx={{
                    mb: 3, borderBottom: '1px solid #222c42',
                    '& .MuiTab-root': { fontSize: '12px', minWidth: 'unset', px: 2, py: 1.25, textTransform: 'none' },
                    '& .Mui-selected': { color: '#00c2ff !important', fontWeight: 700 },
                    '& .MuiTabs-indicator': { bgcolor: '#00c2ff' }
                }}>
                <Tab label="📥 Import Nou" />
                <Tab label="📜 Istoric Importuri" />
            </Tabs>

            {activeTab === 0 && (
                <Box>
                    <StepIndicator step={step} />
                    {parsing && (
                        <Box sx={{ mb: 3 }}>
                            <LinearProgress sx={{ borderRadius: '4px' }} />
                            <Typography sx={{ mt: 1, fontSize: '12px', color: 'text.secondary', textAlign: 'center' }}>Analizez fișierul...</Typography>
                        </Box>
                    )}
                    {step === 1 && <Step1Input projects={projects} selectedProject={selectedProject} onProjectChange={setSelectedProject} onFileSelect={handleFileSelect} />}
                    {step === 2 && parseResult && (
                        <Step2Detection
                            parseResult={parseResult} file={file} selectedProject={selectedProject}
                            allPersons={allPersons} selectedPerson={selectedPerson} onPersonChange={setSelectedPerson}
                            onConfirmBlock={handleConfirmBlock} onBack={() => setStep(1)}
                        />
                    )}
                    {step === 3 && confirmedBlock && (
                        <Step3Confirm
                            block={confirmedBlock} parseResult={parseResult} selectedProject={selectedProject}
                            selectedPerson={selectedPerson}
                            year={period?.year || targetYear}
                            month={period?.month || targetMonth}
                            initialFirstDay={confirmedDayRange.start}
                            initialLastDay={confirmedDayRange.end}
                            existingData={existingData} onImport={handleImport} onBack={() => setStep(2)}
                        />
                    )}
                    {step === 4 && importLog && (
                        <Step4Success importLog={importLog} onReset={handleReset}
                            onViewHistory={() => { handleReset(); setActiveTab(1); }}
                        />
                    )}
                </Box>
            )}

            {activeTab === 1 && <HistoryPanel projects={projects} />}
        </Box>
    );
}
