import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, MenuItem, Select, FormControl, InputLabel, Paper, IconButton, Divider } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import SaveIcon from '@mui/icons-material/Save';
import DownloadIcon from '@mui/icons-material/Download';
import api from '../api/client';
import { useSnackbar } from 'notistack';
import { generateFiseAll } from '../utils/generator';

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
    const [projects, setProjects] = useState([]);
    const [allPersons, setAllPersons] = useState([]);
    const [currentProject, setCurrentProject] = useState('');
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1); // 1-12
    const [pontajData, setPontajData] = useState(null);
    const [projectMembers, setProjectMembers] = useState([]);
    const [personsDict, setPersonsDict] = useState({});
    const [loading, setLoading] = useState(false);

    const { enqueueSnackbar } = useSnackbar();

    useEffect(() => {
        loadInitialData();
    }, []);

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
            if (projRes.data.length > 0) {
                setCurrentProject(projRes.data[0].id);
            }

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
            if (proj) {
                setProjectMembers(proj.members || []);
            }
            const res = await api.get(`/pontaj/${currentProject}/${year}/${month}`);
            const data = res.data || {};
            (proj?.members || []).forEach(m => {
                if (!data[m.personId]) {
                    data[m.personId] = { days: {}, norma: {} };
                }
            });
            setPontajData(data);
        } catch (e) {
            enqueueSnackbar('Eroare la încărcarea pontajului.', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleDayChange = (personId, day, value) => {
        setPontajData(prev => ({
            ...prev,
            [personId]: {
                ...prev[personId],
                days: {
                    ...prev[personId].days,
                    [day]: value
                }
            }
        }));
    };

    const savePontaj = async () => {
        try {
            await api.post(`/pontaj/${currentProject}/${year}/${month}`, pontajData);
            enqueueSnackbar('Pontaj salvat cu succes!', { variant: 'success' });
        } catch (e) {
            enqueueSnackbar('Eroare la salvare.', { variant: 'error' });
        }
    };

    const handleGenerateExcel = async () => {
        const onLog = (msg) => enqueueSnackbar(msg.replace(/<[^>]*>?/gm, ''), { variant: 'info' });
        try {
            await generateFiseAll({ year, month, instName: 'BlueSpace Technology', intocmitName: 'Adrian Dragomir', aprobatName: 'Ion Doe' }, projects, allPersons, onLog);
        } catch (e) {
            enqueueSnackbar('Generarea a eșuat!', { variant: 'error' });
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
    const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);

    return (
        <Box sx={{ pb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h1" gutterBottom>Pontaj Individual</Typography>
                    <Typography variant="subtitle1">Editează orele zilnice pentru membrii proiectului</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', bgcolor: 'background.paper', p: 1, borderRadius: 2, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Alege Proiectul</InputLabel>
                        <Select
                            value={currentProject}
                            label="Alege Proiectul"
                            onChange={(e) => setCurrentProject(e.target.value)}
                        >
                            {projects.map(p => <MenuItem key={p.id} value={p.id}>{p.name} (SMIS {p.smis})</MenuItem>)}
                        </Select>
                    </FormControl>
                </Box>
            </Box>

            {/* Controls Bar */}
            <Paper sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton onClick={handlePrevMonth}><ArrowBackIosNewIcon fontSize="small" /></IconButton>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                        <Select value={month} onChange={(e) => setMonth(e.target.value)}>
                            {MONTHS_RO.map((m, i) => <MenuItem key={m} value={i + 1}>{m}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                        <Select value={year} onChange={(e) => setYear(e.target.value)}>
                            {[year - 1, year, year + 1].map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <IconButton onClick={handleNextMonth}><ArrowForwardIosIcon fontSize="small" /></IconButton>
                </Box>

                <Divider orientation="vertical" flexItem />

                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button variant="contained" color="primary" startIcon={<SaveIcon />} onClick={savePontaj} disabled={loading || !currentProject}>
                        Salvează
                    </Button>
                    <Button variant="outlined" color="secondary" startIcon={<DownloadIcon />} onClick={handleGenerateExcel} disabled={loading || !currentProject}>
                        Generare Fise ZIP
                    </Button>
                </Box>
            </Paper>

            {/* Calendar View */}
            {loading ? (
                <Typography>Se încarcă...</Typography>
            ) : !currentProject ? (
                <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 10 }}>Selectează un proiect pentru a vedea pontajul.</Typography>
            ) : projectMembers.length === 0 ? (
                <Paper sx={{ p: 5, textAlign: 'center' }}>
                    <Typography variant="h6" color="text.secondary">Nicio persoană în acest proiect.</Typography>
                    <Button sx={{ mt: 2 }} variant="outlined">Adaugă Membri</Button>
                </Paper>
            ) : (
                projectMembers.map((member, idx) => {
                    const person = personsDict[member.personId];
                    if (!person) return null;
                    const pData = pontajData?.[member.personId]?.days || {};

                    let totalOre = 0;
                    Object.values(pData).forEach(v => {
                        const parsed = parseFloat(v);
                        if (!isNaN(parsed)) totalOre += parsed;
                    });

                    return (
                        <Paper key={member.personId} sx={{ mb: 3, overflow: 'hidden' }}>
                            <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                    <Typography variant="h3" sx={{ fontSize: '1.1rem' }}>{person.name} {person.fname}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {member.partner} • {member.type} • Norma: {member.defaultNorma}h
                                    </Typography>
                                </Box>
                                <Box sx={{ textAlign: 'right' }}>
                                    <Typography variant="h2" color="primary.main">{totalOre}<span style={{ fontSize: '1rem', color: '#94a3b8' }}>h</span></Typography>
                                </Box>
                            </Box>
                            <Box sx={{ p: 2, overflowX: 'auto' }}>
                                <Box sx={{ display: 'inline-flex', gap: '4px' }}>
                                    {daysArray.map(d => {
                                        const we = isWeekend(year, month, d);
                                        const val = pData[d] !== undefined ? pData[d] : '';
                                        const isVacation = String(val).toUpperCase() === 'CO' || String(val).toUpperCase() === 'CM';
                                        const isWorked = parseFloat(val) > 0;

                                        let bg = 'rgba(255,255,255,0.03)';
                                        let borderCol = 'transparent';
                                        if (we) bg = 'rgba(255,0,0,0.05)';
                                        if (isWorked) {
                                            bg = 'rgba(59,111,255,0.1)';
                                            borderCol = '#3b6fff';
                                        } else if (isVacation) {
                                            bg = 'rgba(39,174,96,0.1)';
                                            borderCol = '#27ae60';
                                        }

                                        return (
                                            <Box key={d} sx={{ width: 42, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                <Typography variant="caption" sx={{ color: we ? '#ef4444' : 'text.secondary', mb: 0.5 }}>{d}</Typography>
                                                <input
                                                    type="text"
                                                    value={val}
                                                    onChange={(e) => handleDayChange(member.personId, d, e.target.value)}
                                                    style={{
                                                        width: '100%', height: 36, textAlign: 'center',
                                                        backgroundColor: bg, border: `1px solid ${borderCol}`,
                                                        color: '#fff', borderRadius: 4, outline: 'none',
                                                        transition: 'all 0.2s',
                                                    }}
                                                    onFocus={(e) => {
                                                        e.target.style.borderColor = '#fff';
                                                        e.target.select();
                                                    }}
                                                    onBlur={(e) => {
                                                        e.target.style.borderColor = borderCol;
                                                    }}
                                                />
                                            </Box>
                                        );
                                    })}
                                </Box>
                            </Box>
                        </Paper>
                    );
                })
            )}
        </Box>
    );
}
