import React, { useState, useEffect } from 'react';
import { Box, Typography, Select, MenuItem, FormControl, InputLabel, CircularProgress, Paper, Button } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import api from '../api/client';
import { useSnackbar } from 'notistack';
import { generateCentralizator } from '../utils/generator';

const MONTHS = [
    { value: 1, label: 'Ianuarie' }, { value: 2, label: 'Februarie' }, { value: 3, label: 'Martie' },
    { value: 4, label: 'Aprilie' }, { value: 5, label: 'Mai' }, { value: 6, label: 'Iunie' },
    { value: 7, label: 'Iulie' }, { value: 8, label: 'August' }, { value: 9, label: 'Septembrie' },
    { value: 10, label: 'Octombrie' }, { value: 11, label: 'Noiembrie' }, { value: 12, label: 'Decembrie' }
];

const YEARS = [2024, 2025, 2026, 2027];

export default function DashboardGlobal() {
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [stats, setStats] = useState({ totalOre: 0, totalCO_CM: 0, totalPers: 0 });
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const { enqueueSnackbar } = useSnackbar();

    useEffect(() => {
        fetchStats();
    }, [year, month]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/dashboard/${year}/${month}`);
            setStats(res.data);
        } catch (e) {
            console.error('Eroare stats:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleExportCentralizator = async () => {
        setExporting(true);
        try {
            // Avem nevoie de proiecte si persoane
            const [projRes, persRes] = await Promise.all([
                api.get('/projects'),
                api.get('/persons')
            ]);

            const projects = projRes.data;
            const persons = persRes.data.rows || persRes.data; // Compatibilitate format DB/JSON

            await generateCentralizator(
                { year, month, instName: 'Bluespace Technology' },
                projects,
                persons,
                (msg) => enqueueSnackbar(msg, { variant: msg.includes('✅') ? 'success' : msg.includes('⚠️') ? 'warning' : 'info', autoHideDuration: 2000 })
            );
        } catch (e) {
            enqueueSnackbar('Eroare la export: ' + e.message, { variant: 'error' });
        } finally {
            setExporting(false);
        }
    };

    return (
        <Paper sx={{
            p: '20px 24px',
            mb: '28px',
            bgcolor: 'rgba(17, 21, 32, 0.4)',
            backdropFilter: 'blur(10px)',
            border: '1px solid #222c42',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'center',
            gap: '32px'
        }}>
            {/* Header & Controls */}
            <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', mb: '6px' }}>
                    <Box sx={{
                        width: 40, height: 40, borderRadius: '10px',
                        bgcolor: 'rgba(59, 111, 255, 0.1)', border: '1px solid rgba(59, 111, 255, 0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '20px'
                    }}>📊</Box>
                    <Box>
                        <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>Dashboard Global</Typography>
                        <Typography sx={{ fontSize: '11px', color: '#6a7a96', mt: '3px' }}>Statistici adunate din toate proiectele active</Typography>
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: '8px', mt: '14px', alignItems: 'center' }}>
                    <Select
                        size="small"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        sx={{
                            minWidth: 120, height: '32px', fontSize: '12px', fontWeight: 600,
                            bgcolor: 'rgba(0,0,0,0.2)', '.MuiOutlinedInput-notchedOutline': { borderColor: '#222c42' }
                        }}
                    >
                        {MONTHS.map(m => <MenuItem key={m.value} value={m.value} sx={{ fontSize: '12px' }}>{m.label}</MenuItem>)}
                    </Select>
                    <Select
                        size="small"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        sx={{
                            minWidth: 80, height: '32px', fontSize: '12px', fontWeight: 600,
                            bgcolor: 'rgba(0,0,0,0.2)', '.MuiOutlinedInput-notchedOutline': { borderColor: '#222c42' }
                        }}
                    >
                        {YEARS.map(y => <MenuItem key={y} value={y} sx={{ fontSize: '12px' }}>{y}</MenuItem>)}
                    </Select>

                    <Button
                        variant="contained"
                        size="small"
                        startIcon={exporting ? <CircularProgress size={14} color="inherit" /> : <FileDownloadIcon sx={{ fontSize: 16 }} />}
                        disabled={exporting}
                        onClick={handleExportCentralizator}
                        sx={{
                            ml: 2, height: '32px', fontSize: '11px', fontWeight: 700,
                            background: 'linear-gradient(135deg, #00c2ff 0%, #0066ff 100%)',
                            boxShadow: '0 4px 12px rgba(0, 194, 255, 0.3)',
                            '&:hover': { boxShadow: '0 6px 16px rgba(0, 194, 255, 0.5)' }
                        }}
                    >
                        {exporting ? 'Se generează...' : 'Export Centralizator'}
                    </Button>
                </Box>
            </Box>

            {/* Stats Display */}
            <Box sx={{
                display: 'flex',
                gap: { xs: '20px', sm: '48px' },
                bgcolor: 'rgba(0,0,0,0.2)',
                p: '16px 32px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.03)',
                width: { xs: '100%', md: 'auto' },
                justifyContent: 'center'
            }}>
                <StatItem label="TOTAL ORE" value={stats.totalOre} color="#00c2ff" loading={loading} />
                <StatItem label="ZILE CO/CM" value={stats.totalCO_CM} color="#f5a623" loading={loading} />
                <StatItem label="PERSOANE" value={stats.totalPers} color="#27ae60" loading={loading} />
            </Box>
        </Paper>
    );
}

function StatItem({ label, value, color, loading }) {
    return (
        <Box sx={{ textAlign: 'center', minWidth: '80px' }}>
            {loading ? (
                <CircularProgress size={20} sx={{ color, mb: '8px' }} />
            ) : (
                <Typography sx={{
                    fontSize: '28px', fontWeight: 900, color: '#fff',
                    lineHeight: 1, textShadow: `0 0 20px ${color}40`
                }}>
                    {value}
                </Typography>
            )}
            <Typography sx={{ fontSize: '9px', fontWeight: 700, color: '#6a7a96', mt: '8px', letterSpacing: '0.8px' }}>
                {label}
            </Typography>
        </Box>
    );
}
