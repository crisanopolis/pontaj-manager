import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, Typography, Button, MenuItem, Select, FormControl, InputLabel, Paper, IconButton, Divider, CircularProgress, TextField, InputAdornment, Tooltip, Collapse } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import SaveIcon from '@mui/icons-material/Save';
import DownloadIcon from '@mui/icons-material/Download';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SortIcon from '@mui/icons-material/Sort';
import api from '../api/client';
import { useSnackbar } from 'notistack';
import { generateFiseAll, generateCentralizatorProject } from '../utils/generator';

const MONTHS_RO = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];
const DAYS_RO = ['Du', 'Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ'];

function getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
}
function isWeekend(year, month, day) {
    const d = new Date(year, month - 1, day).getDay();
    return d === 0 || d === 6;
}

export default function PontajPage() {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const urlProjectId = queryParams.get('projectId');

    const [projects, setProjects] = useState([]);
    const [allPersons, setAllPersons] = useState([]);
    const [currentProject, setCurrentProject] = useState('');
    // Initialize year/month from localStorage, fallback to current date
    const [year, setYear] = useState(() => {
        const saved = localStorage.getItem('pm_pontaj_year');
        return saved ? parseInt(saved, 10) : new Date().getFullYear();
    });
    const [month, setMonth] = useState(() => {
        const saved = localStorage.getItem('pm_pontaj_month');
        return saved ? parseInt(saved, 10) : new Date().getMonth() + 1;
    });
    const [pontajData, setPontajData] = useState(null);
    const [projectMembers, setProjectMembers] = useState([]);
    const [personsDict, setPersonsDict] = useState({});
    const [personSearch, setPersonSearch] = useState('');
    const [sortOrder, setSortOrder] = useState(() => localStorage.getItem('pm_pontaj_sort') || 'default');
    const [collapsedCards, setCollapsedCards] = useState(() => {
        try { return JSON.parse(localStorage.getItem('pm_pontaj_collapsed') || '{}'); } catch { return {}; }
    });
    const toggleCard = (personId) => setCollapsedCards(prev => {
        const next = { ...prev, [personId]: !prev[personId] };
        localStorage.setItem('pm_pontaj_collapsed', JSON.stringify(next));
        return next;
    });
    const collapseAll = () => {
        const allIds = projectMembers.reduce((acc, m) => ({ ...acc, [m.personId]: true }), {});
        setCollapsedCards(allIds);
        localStorage.setItem('pm_pontaj_collapsed', JSON.stringify(allIds));
    };
    const expandAll = () => {
        setCollapsedCards({});
        localStorage.setItem('pm_pontaj_collapsed', '{}');
    };
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState({}); // { personId: previousState }

    const { enqueueSnackbar } = useSnackbar();

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (urlProjectId && projects.length > 0) {
            const found = projects.find(p => String(p.id) === String(urlProjectId));
            if (found) setCurrentProject(found.id);
        }
    }, [urlProjectId, projects]);

    // Persist project/year/month/sort to localStorage on every change
    useEffect(() => { if (currentProject) localStorage.setItem('pm_pontaj_project', currentProject); }, [currentProject]);
    useEffect(() => { localStorage.setItem('pm_pontaj_year', String(year)); }, [year]);
    useEffect(() => { localStorage.setItem('pm_pontaj_month', String(month)); }, [month]);
    useEffect(() => { localStorage.setItem('pm_pontaj_sort', sortOrder); }, [sortOrder]);

    useEffect(() => {
        if (currentProject) {
            fetchPontaj();
        } else {
            setPontajData(null);
            setProjectMembers([]);
        }
    }, [currentProject, year, month]);

    const loadInitialData = async () => {
        try {
            const [projRes, persRes] = await Promise.all([
                api.get('/projects'),
                api.get('/persons?limit=1000') // Fetch all for dictionary
            ]);
            setProjects(projRes.data);

            // Priority: URL Param > localStorage > First Project
            let initialId = '';
            if (urlProjectId) {
                const found = projRes.data.find(p => String(p.id) === String(urlProjectId));
                if (found) initialId = found.id;
            }
            if (!initialId) {
                const savedProj = localStorage.getItem('pm_pontaj_project');
                if (savedProj) {
                    const found = projRes.data.find(p => String(p.id) === String(savedProj));
                    if (found) initialId = found.id;
                }
            }
            if (!initialId && projRes.data.length > 0) {
                initialId = projRes.data[0].id;
            }
            setCurrentProject(initialId);

            const pList = Array.isArray(persRes.data) ? persRes.data : persRes.data.rows;
            setAllPersons(pList);
            const dict = {};
            pList.forEach(p => dict[p.id] = p);
            setPersonsDict(dict);

        } catch (e) {
            enqueueSnackbar('Eroare la încărcarea datelor inițiale.', { variant: 'error' });
        }
    };

    const fetchPontaj = async () => {
        setLoading(true);
        try {
            const proj = projects.find(p => p.id === currentProject);
            const members = proj?.members || [];
            setProjectMembers(members);

            const res = await api.get(`/pontaj/${currentProject}/${year}/${month}`);
            const data = res.data || {};

            // Initialize data for all formal members
            members.forEach(m => {
                if (!data[m.personId]) {
                    data[m.personId] = { days: {}, norma: {} };
                }
            });

            // Also show persons who have IMPORTED data but are NOT formal members
            // (imported via the Import Asistat feature)
            const memberIds = new Set(members.map(m => String(m.personId)));
            const importedPersonIds = Object.keys(data).filter(pid => !memberIds.has(String(pid)));

            if (importedPersonIds.length > 0 && proj) {
                // Create synthetic members for display (type = 'Importat')
                const syntheticMembers = importedPersonIds.map(pid => ({
                    personId: typeof pid === 'number' ? pid : (isNaN(parseInt(pid)) ? pid : parseInt(pid)),
                    type: 'Importat',
                    partner: personsDict[pid]?.partner || ''
                }));
                setProjectMembers([...members, ...syntheticMembers]);
            }

            setPontajData(data);
        } catch (e) {
            enqueueSnackbar('Eroare la încărcarea pontajului.', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleTableChange = (personId, field, day, value) => {
        setPontajData(prev => ({
            ...prev,
            [personId]: {
                ...prev[personId],
                [field]: {
                    ...prev[personId][field],
                    [day]: value
                }
            }
        }));
    };

    const handleQuickAction = (personId, field, value) => {
        // Save to history before change for this person
        setHistory(prev => ({
            ...prev,
            [personId]: JSON.parse(JSON.stringify(pontajData[personId] || { days: {}, norma: {} }))
        }));

        const newData = { ...pontajData };
        if (!newData[personId]) newData[personId] = { days: {}, norma: {} };
        const daysInMonth = getDaysInMonth(year, month);

        for (let d = 1; d <= daysInMonth; d++) {
            if (!isWeekend(year, month, d)) {
                newData[personId][field][d] = value;
            } else {
                newData[personId][field][d] = 0;
            }
        }
        setPontajData(newData);
    };

    const handleClearHours = (personId, field) => {
        // Save to history before change for this person
        setHistory(prev => ({
            ...prev,
            [personId]: JSON.parse(JSON.stringify(pontajData[personId] || { days: {}, norma: {} }))
        }));

        const newData = { ...pontajData };
        if (newData[personId]) {
            newData[personId][field] = {};
            setPontajData(newData);
        }
    };

    const handleUndo = (personId) => {
        if (history[personId]) {
            setPontajData(prev => ({
                ...prev,
                [personId]: history[personId]
            }));
            setHistory(prev => {
                const newH = { ...prev };
                delete newH[personId];
                return newH;
            });
            enqueueSnackbar('Modificare anualată.', { variant: 'info' });
        }
    };

    const savePontaj = async () => {
        try {
            await api.post(`/pontaj/${currentProject}/${year}/${month}`, pontajData);
            enqueueSnackbar('Pontaj salvat cu succes!', { variant: 'success' });
            setHistory({}); // Reset history on save
        } catch (e) {
            enqueueSnackbar('Eroare la salvare.', { variant: 'error' });
        }
    };

    const handleDeletePerson = async (personId) => {
        if (!window.confirm('Ștergi toate datele de pontaj ale acestei persoane pentru luna curentă?')) return;
        try {
            // Remove person's data from pontajData
            const newPontaj = { ...pontajData };
            delete newPontaj[personId];

            // Save to server
            await api.post(`/pontaj/${currentProject}/${year}/${month}`, newPontaj);
            setPontajData(newPontaj);

            // Check if this is an imported (non-formal) member — if so, remove from project members too
            const member = projectMembers.find(m => String(m.personId) === String(personId));
            if (member?.type === 'Importat') {
                try {
                    const projRes = await api.get(`/projects/${currentProject}`);
                    const proj = projRes.data;
                    const updatedProj = {
                        ...proj,
                        members: (proj.members || []).filter(m => String(m.personId) !== String(personId))
                    };
                    await api.put(`/projects/${currentProject}`, updatedProj);
                } catch (e) {
                    console.warn('Nu s-a putut actualiza membrii proiectului:', e.message);
                }
            }

            // Remove from projectMembers display
            setProjectMembers(prev => prev.filter(m => String(m.personId) !== String(personId)));

            enqueueSnackbar('Datele persoanei au fost șterse pentru această lună.', { variant: 'success' });
        } catch (e) {
            enqueueSnackbar('Eroare la ștergere.', { variant: 'error' });
        }
    };

    const handleGenerateExcel = async () => {
        const onLog = (msg) => enqueueSnackbar(msg.replace(/<[^>]*>?/gm, ''), { variant: 'info', autoHideDuration: 2000 });
        try {
            await generateFiseAll({ year, month, instName: 'BlueSpace Technology', intocmitName: 'Adriana BREHUI', aprobatName: 'Constantin PINTILIE' }, projects, allPersons, onLog);
        } catch (e) {
            enqueueSnackbar('Generarea a eșuat!', { variant: 'error' });
        }
    };

    const handleGenerateCentralizator = async () => {
        const onLog = (msg) => enqueueSnackbar(msg.replace(/<[^>]*>?/gm, ''), { variant: msg.includes('✅') ? 'success' : 'info', autoHideDuration: 2000 });
        try {
            const proj = projects.find(p => p.id === currentProject);
            await generateCentralizatorProject(
                { year, month, instName: 'EMI SHIELDING S.R.L.', intocmitName: 'Adriana BREHUI', aprobatName: 'Constantin PINTILIE' },
                proj,
                allPersons,
                onLog
            );
        } catch (e) {
            enqueueSnackbar('Generarea centralizatorului a eșuat!', { variant: 'error' });
        }
    };

    const handlePrevMonth = () => {
        if (month === 1) { setMonth(12); setYear(y => y - 1); }
        else setMonth(m => m - 1);
    };
    const handleNextMonth = () => {
        if (month === 12) { setMonth(1); setYear(y => y + 1); }
        else setMonth(m => m + 1);
    };

    const totalDays = getDaysInMonth(year, month);
    const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); // 0 (Sun) to 6 (Sat)
    // Offset for Romanian calendar (Monday start)
    // In style.css the order is Du, Lu, Ma, Mi, Jo, Vi, Sa? Let's check DAYS_RO.
    // DAYS_RO = ['Du', 'Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ'];
    // So Sunday is index 0. 

    const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);
    const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

    return (
        <Box sx={{ pb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: '28px', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h1" gutterBottom sx={{ mb: 0.5 }}>Pontaj Individual</Typography>
                    <Typography variant="subtitle1">Editează orele zilnice pentru membrii proiectului</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <Select
                            value={currentProject}
                            onChange={(e) => setCurrentProject(e.target.value)}
                            sx={{ bgcolor: 'background.paper' }}
                            displayEmpty
                        >
                            {!currentProject && <MenuItem value="">Alege Proiect</MenuItem>}
                            {projects.map(p => <MenuItem key={p.id} value={p.id}>{p.name} (SMIS {p.smis})</MenuItem>)}
                        </Select>
                    </FormControl>
                </Box>
            </Box>

            {/* Controls Bar */}
            <Box sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: '16px', mb: '20px', flexWrap: 'wrap',
                bgcolor: 'background.paper', p: '12px 16px', borderRadius: '12px', border: '1px solid #222c42'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Luna</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <IconButton size="small" onClick={handlePrevMonth} sx={{ border: '1px solid #222c42', borderRadius: '6px', p: 0.5 }}><ArrowBackIosNewIcon sx={{ fontSize: 14 }} /></IconButton>
                            <Select size="small" value={month} onChange={(e) => setMonth(e.target.value)} sx={{ minWidth: 120, height: 32, fontSize: '13px' }}>
                                {MONTHS_RO.map((m, i) => <MenuItem key={m} value={i + 1}>{m}</MenuItem>)}
                            </Select>
                            <IconButton size="small" onClick={handleNextMonth} sx={{ border: '1px solid #222c42', borderRadius: '6px', p: 0.5 }}><ArrowForwardIosIcon sx={{ fontSize: 14 }} /></IconButton>
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Anul</Typography>
                        <Select size="small" value={year} onChange={(e) => setYear(e.target.value)} sx={{ minWidth: 80, height: 32, fontSize: '13px' }}>
                            {[year - 1, year, year + 1].map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                        </Select>
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: '10px' }}>
                    <Button variant="contained" size="small" startIcon={<SaveIcon sx={{ fontSize: 16 }} />} onClick={savePontaj} disabled={loading || !currentProject}>
                        Salvează
                    </Button>
                    <Button variant="outlined" size="small" startIcon={<DownloadIcon sx={{ fontSize: 16 }} />} onClick={handleGenerateExcel} disabled={loading || !currentProject}>
                        ZIP
                    </Button>
                    <Button variant="contained" size="small" onClick={handleGenerateCentralizator} disabled={loading || !currentProject}
                        sx={{ background: 'linear-gradient(135deg, #FFCC00 0%, #FF9900 100%)', color: '#000', fontWeight: 700 }}
                    >
                        Centralizator
                    </Button>
                </Box>
            </Box>

            {/* Search + Sort + Collapse bar */}
            {!!currentProject && projectMembers.length > 0 && (
                <Box sx={{ mb: '16px', display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Search */}
                    <TextField
                        size="small"
                        placeholder="Caută persoană în proiect..."
                        value={personSearch}
                        onChange={(e) => setPersonSearch(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment>
                            ),
                        }}
                        sx={{
                            width: { xs: '100%', sm: 260 },
                            '& .MuiOutlinedInput-root': { height: 36, bgcolor: 'background.paper', borderRadius: '8px' }
                        }}
                    />

                    {/* Sort */}
                    <Select
                        size="small"
                        value={sortOrder}
                        onChange={e => setSortOrder(e.target.value)}
                        startAdornment={<SortIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />}
                        sx={{ height: 36, bgcolor: 'background.paper', borderRadius: '8px', fontSize: '12px', minWidth: 150 }}
                    >
                        <MenuItem value="default" sx={{ fontSize: '12px' }}>Ordine implicită</MenuItem>
                        <MenuItem value="az" sx={{ fontSize: '12px' }}>Nume A → Z</MenuItem>
                        <MenuItem value="za" sx={{ fontSize: '12px' }}>Nume Z → A</MenuItem>
                    </Select>

                    {/* Collapse / Expand all — prominent right side */}
                    <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                        <Button
                            variant="contained" size="small"
                            onClick={collapseAll}
                            startIcon={<ExpandLessIcon />}
                            sx={{ fontSize: '12px', height: 36, background: 'linear-gradient(135deg,#1e3a5f,#2c4a7c)', borderRadius: '8px' }}
                        >
                            Restrânge tot
                        </Button>
                        <Button
                            variant="outlined" size="small"
                            onClick={expandAll}
                            startIcon={<ExpandMoreIcon />}
                            sx={{ fontSize: '12px', height: 36, borderColor: '#222c42', borderRadius: '8px' }}
                        >
                            Extinde tot
                        </Button>
                    </Box>
                </Box>
            )}

            {/* Calendar View */}
            {loading ? (
                <Box sx={{ textAlign: 'center', py: 10 }}><CircularProgress /></Box>
            ) : !currentProject ? (
                <Box sx={{ textAlign: 'center', py: 10, color: 'text.secondary' }}>Selectează un proiect pentru a vedea pontajul.</Box>
            ) : projectMembers.filter(m => {
                const p = personsDict[m.personId];
                if (!p) return false;
                const fullSearch = `${p.name} ${p.fname}`.toLowerCase();
                return fullSearch.includes(personSearch.toLowerCase());
            }).length === 0 ? (
                <Box className="card" sx={{ textAlign: 'center', py: 8 }}>
                    <Typography variant="h6" color="text.secondary">
                        {personSearch ? 'Nicio persoană nu corespunde căutării.' : 'Nicio persoană în acest proiect.'}
                    </Typography>
                </Box>
            ) : (
                projectMembers
                    .filter(m => {
                        const p = personsDict[m.personId];
                        if (!p) return false;
                        const fullSearch = `${p.name} ${p.fname}`.toLowerCase();
                        return fullSearch.includes(personSearch.toLowerCase());
                    })
                    .sort((a, b) => {
                        if (sortOrder === 'default') return 0;
                        const pa = personsDict[a.personId];
                        const pb = personsDict[b.personId];
                        if (!pa || !pb) return 0;
                        const nameA = `${pa.name} ${pa.fname}`.toLowerCase();
                        const nameB = `${pb.name} ${pb.fname}`.toLowerCase();
                        return sortOrder === 'az' ? nameA.localeCompare(nameB, 'ro') : nameB.localeCompare(nameA, 'ro');
                    })
                    .map((member, index) => {
                        const person = personsDict[member.personId];
                        if (!person) return null;
                        const pDays = pontajData?.[member.personId]?.days || {};
                        const pNorma = pontajData?.[member.personId]?.norma || {};

                        let totalProj = 0;
                        Object.values(pDays).forEach(v => {
                            const parsed = parseFloat(v);
                            if (!isNaN(parsed)) totalProj += parsed;
                        });

                        let totalNorma = 0;
                        Object.values(pNorma).forEach(v => {
                            const parsed = parseFloat(v);
                            if (!isNaN(parsed)) totalNorma += parsed;
                        });

                        const totalGeneral = totalProj + totalNorma;
                        const isCollapsed = !!collapsedCards[member.personId];

                        return (
                            <Box key={member.personId} className="person-pontaj-card" sx={{
                                mb: '10px', bgcolor: 'background.paper',
                                border: `1px solid ${isCollapsed ? '#1a2540' : '#222c42'}`,
                                borderRadius: '12px', overflow: 'hidden',
                                transition: 'border-color .2s'
                            }}>
                                {/* ── CARD HEADER (click to collapse) ── */}
                                <Box sx={{
                                    p: '12px 18px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
                                    cursor: 'pointer', userSelect: 'none',
                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' }
                                }}
                                    onClick={() => toggleCard(member.personId)}
                                >
                                    {/* Number badge */}
                                    <Box sx={{
                                        width: 24, height: 24, borderRadius: '50%',
                                        bgcolor: 'rgba(59,111,255,0.15)', color: '#3b6fff',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 800, fontSize: '10px', flexShrink: 0, border: '1px solid rgba(59,111,255,0.3)'
                                    }}>
                                        {index + 1}
                                    </Box>

                                    {/* Initials avatar */}
                                    <Box sx={{
                                        width: 36, height: 36, borderRadius: '50%', bgcolor: 'rgba(59,111,255,0.1)', color: '#3b6fff',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', flexShrink: 0
                                    }}>
                                        {person.name?.[0]}{person.fname?.[0]}
                                    </Box>

                                    {/* Name & info */}
                                    <Box sx={{ flex: 1, minWidth: '180px' }}>
                                        <Typography sx={{ fontSize: '14px', fontWeight: 600 }}>{person.name} {person.fname}</Typography>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: '2px' }}>
                                            CNP: {person.cnp} • {member.partner} • {member.type}
                                        </Typography>
                                    </Box>

                                    {/* Totals */}
                                    <Box sx={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <Box sx={{ textAlign: 'center', bgcolor: 'rgba(59,111,255,0.05)', p: '4px 10px', borderRadius: '8px', border: '1px solid rgba(59,111,255,0.1)' }}>
                                            <Typography sx={{ fontSize: '16px', fontWeight: 800, color: '#3b6fff', lineHeight: 1 }}>{totalProj}</Typography>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '9px', fontWeight: 700 }}>PROIECT</Typography>
                                        </Box>
                                        <Box sx={{ textAlign: 'center', bgcolor: 'rgba(248,249,250,0.05)', p: '4px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <Typography sx={{ fontSize: '16px', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{totalNorma}</Typography>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '9px', fontWeight: 700 }}>NORMA</Typography>
                                        </Box>
                                        <Box sx={{ textAlign: 'center', bgcolor: 'rgba(46,204,113,0.1)', p: '4px 10px', borderRadius: '8px', border: '1px solid rgba(46,204,113,0.2)' }}>
                                            <Typography sx={{ fontSize: '16px', fontWeight: 800, color: '#2ecc71', lineHeight: 1 }}>{totalGeneral}</Typography>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '9px', fontWeight: 700 }}>TOTAL</Typography>
                                        </Box>
                                    </Box>

                                    {/* Delete button (stop propagation so it doesn't toggle collapse) */}
                                    <Tooltip title="Șterge toate datele acestei persoane pentru luna curentă">
                                        <Button
                                            variant="outlined" size="small"
                                            onClick={(e) => { e.stopPropagation(); handleDeletePerson(member.personId); }}
                                            sx={{
                                                fontSize: '11px', py: 0, height: 28,
                                                borderColor: 'rgba(231,76,60,0.35)', color: '#e74c3c',
                                                borderRadius: '6px', whiteSpace: 'nowrap', minWidth: 'unset',
                                                '&:hover': { bgcolor: 'rgba(231,76,60,0.1)', borderColor: '#e74c3c' }
                                            }}
                                        >
                                            🗑 Șterge luna
                                        </Button>
                                    </Tooltip>

                                    {/* Collapse chevron */}
                                    <Box sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                        {isCollapsed ? <ExpandMoreIcon sx={{ fontSize: 20 }} /> : <ExpandLessIcon sx={{ fontSize: 20 }} />}
                                    </Box>
                                </Box>

                                {/* ── CARD BODY (collapsible) ── */}
                                <Collapse in={!isCollapsed} timeout="auto">

                                    {/* Action Buttons for Person */}
                                    <Box sx={{ px: '18px', pb: '12px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <Box onClick={(e) => e.stopPropagation()} sx={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: '100%' }}>
                                            <Button variant="outlined" size="small" onClick={() => handleQuickAction(member.personId, 'days', 8)} sx={{ fontSize: '10px', py: 0, height: 24, borderRadius: '4px' }}>8h zile lucr.</Button>
                                            <Button variant="outlined" size="small" onClick={() => handleQuickAction(member.personId, 'days', 4)} sx={{ fontSize: '10px', py: 0, height: 24, borderRadius: '4px' }}>4h zile lucr.</Button>
                                            <Button variant="outlined" size="small" onClick={() => handleQuickAction(member.personId, 'days', 2)} sx={{ fontSize: '10px', py: 0, height: 24, borderRadius: '4px' }}>2h zile lucr.</Button>
                                            <Button variant="outlined" color="error" size="small" onClick={() => handleClearHours(member.personId, 'days')} sx={{ fontSize: '10px', py: 0, height: 24, borderRadius: '4px' }}>Șterge ore</Button>

                                            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, bgcolor: '#222c42' }} />

                                            <Button variant="contained" size="small" onClick={() => handleQuickAction(member.personId, 'norma', 8)} sx={{ fontSize: '10px', py: 0, height: 24, borderRadius: '4px', bgcolor: '#34495e' }}>Norma: 8h</Button>
                                            <Button variant="contained" size="small" onClick={() => handleQuickAction(member.personId, 'norma', 4)} sx={{ fontSize: '10px', py: 0, height: 24, borderRadius: '4px', bgcolor: '#34495e' }}>Norma: 4h</Button>
                                            <Button variant="contained" size="small" onClick={() => handleClearHours(member.personId, 'norma')} sx={{ fontSize: '10px', py: 0, height: 24, borderRadius: '4px', bgcolor: '#c0392b' }}>Norma: 0h</Button>

                                            {history[member.personId] && (
                                                <>
                                                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5, bgcolor: '#222c42' }} />
                                                    <Button
                                                        variant="contained" size="small"
                                                        onClick={() => handleUndo(member.personId)}
                                                        sx={{ fontSize: '10px', py: 0, height: 24, borderRadius: '4px', bgcolor: '#f39c12', color: '#fff', '&:hover': { bgcolor: '#e67e22' } }}
                                                    >
                                                        UNDO
                                                    </Button>
                                                </>
                                            )}
                                        </Box>
                                    </Box>

                                    <Box sx={{ p: '16px 18px', borderTop: '1px solid #222c42' }}>
                                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', mb: 1.5 }}>
                                            {DAYS_RO.map(d => (
                                                <Typography key={d} sx={{ textAlign: 'center', fontSize: '9px', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '1px' }}>{d}</Typography>
                                            ))}
                                        </Box>

                                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                                            {blanks.map(b => <Box key={`b-${b}`} />)}
                                            {daysArray.map(d => {
                                                const we = isWeekend(year, month, d);
                                                const valProj = pDays[d] !== undefined ? pDays[d] : '';
                                                const valNorma = pNorma[d] !== undefined ? pNorma[d] : '';

                                                const isVacation = String(valProj).toUpperCase() === 'CO' || String(valProj).toUpperCase() === 'CM';
                                                const isWorked = parseFloat(valProj) > 0;

                                                let bgP = 'var(--surface2)';
                                                let borderColP = 'var(--border)';
                                                let textColP = 'var(--text)';

                                                if (we) {
                                                    bgP = 'rgba(231, 76, 60, .08)';
                                                    borderColP = 'rgba(231, 76, 60, .15)';
                                                    textColP = 'rgba(192, 57, 43, .6)';
                                                }
                                                if (isWorked) {
                                                    bgP = 'rgba(59, 111, 255, .15)';
                                                    borderColP = 'rgba(59, 111, 255, .35)';
                                                    textColP = '#00c2ff';
                                                } else if (isVacation) {
                                                    bgP = 'rgba(245, 166, 35, .15)';
                                                    borderColP = 'rgba(245, 166, 35, .35)';
                                                    textColP = '#f5a623';
                                                }

                                                return (
                                                    <Box key={d} sx={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                        <Typography sx={{ textAlign: 'center', fontSize: '10px', fontWeight: 800, color: we ? '#e74c3c' : 'text.secondary', mb: '1px' }}>{d}</Typography>

                                                        {/* Project Hours Input */}
                                                        <input
                                                            type="text"
                                                            value={valProj}
                                                            onChange={(e) => handleTableChange(member.personId, 'days', d, e.target.value)}
                                                            className="day-inp"
                                                            placeholder="P"
                                                            style={{
                                                                width: '100%', height: '28px', textAlign: 'center',
                                                                backgroundColor: bgP, border: `1px solid ${borderColP}`,
                                                                color: textColP, borderRadius: '6px', outline: 'none',
                                                                fontSize: '12px', fontWeight: 800, fontFamily: 'Inter, sans-serif'
                                                            }}
                                                            onFocus={(e) => { e.target.style.borderColor = '#3b6fff'; e.target.style.boxShadow = '0 0 0 3px rgba(59, 111, 255, .15)'; e.target.select(); }}
                                                            onBlur={(e) => { e.target.style.borderColor = borderColP; e.target.style.boxShadow = 'none'; }}
                                                        />

                                                        {/* Norma Input */}
                                                        <input
                                                            type="text"
                                                            value={valNorma}
                                                            onChange={(e) => handleTableChange(member.personId, 'norma', d, e.target.value)}
                                                            className="day-inp"
                                                            placeholder="N"
                                                            style={{
                                                                width: '100%', height: '24px', textAlign: 'center',
                                                                backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                                                                color: '#94a3b8', borderRadius: '4px', outline: 'none',
                                                                fontSize: '11px', fontWeight: 600, fontFamily: 'Inter, sans-serif'
                                                            }}
                                                            onFocus={(e) => { e.target.style.borderColor = '#94a3b8'; e.target.select(); }}
                                                            onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.05)'; }}
                                                        />
                                                    </Box>
                                                );
                                            })}
                                        </Box>
                                    </Box>
                                </Collapse>
                            </Box>
                        );
                    })
            )}
        </Box >
    );
}
