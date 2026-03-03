import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button, Paper, Grid, FormControl, InputLabel, Select, MenuItem, CircularProgress } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import api from '../api/client';
import { useSnackbar } from 'notistack';
import { handleSmartImport } from '../utils/smartParser';

export default function HistoryPage() {
    const [projects, setProjects] = useState([]);
    const [persons, setPersons] = useState([]);
    const [selectedProject, setSelectedProject] = useState('');
    const [logs, setLogs] = useState([]);
    const [isParsing, setIsParsing] = useState(false);
    const fileInputRef = useRef(null);
    const { enqueueSnackbar } = useSnackbar();

    useEffect(() => {
        const loadData = async () => {
            try {
                const [projRes, persRes] = await Promise.all([
                    api.get('/projects'),
                    api.get('/persons?limit=1000')
                ]);
                setProjects(projRes.data);
                const pList = Array.isArray(persRes.data) ? persRes.data : (persRes.data.rows || []);
                setPersons(pList);
            } catch (e) {
                enqueueSnackbar('Eroare la încărcarea datelor inițiale', { variant: 'error' });
            }
        };
        loadData();
    }, []);

    const onLog = (msg) => {
        setLogs(prev => [...prev, msg]);
    };

    const handleFileChange = async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setLogs([]);
        setIsParsing(true);

        try {
            await handleSmartImport(files, projects, persons, selectedProject, onLog, () => { });
        } catch (err) {
            onLog(`<span style="color:var(--red)">Eroare critică: ${err.message}</span>`);
        } finally {
            setIsParsing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box>
                    <Typography variant="h1" gutterBottom>Import Inteligent</Typography>
                    <Typography variant="subtitle1">Extrage automat orele și activitățile din fișiere Excel / PDF</Typography>
                </Box>
            </Box>

            <Grid container spacing={3}>
                <Grid item xs={12} md={5}>
                    <Paper sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed rgba(255,255,255,0.1)' }}>
                        <UploadFileIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h3" gutterBottom>Încarcă Foaie de Prezență</Typography>
                        <Typography color="text.secondary" align="center" sx={{ mb: 3 }}>
                            Acceptă fișiere Excel (.xls) și PDF. Pontaj Manager va detecta automat Luna, Anul și Persoana.
                        </Typography>

                        <FormControl fullWidth sx={{ mb: 3 }} size="small">
                            <InputLabel>Alege Proiectul (Opțional)</InputLabel>
                            <Select
                                value={selectedProject}
                                label="Alege Proiectul (Opțional)"
                                onChange={(e) => setSelectedProject(e.target.value)}
                            >
                                <MenuItem value="">-- Auto-Detectare din conținut --</MenuItem>
                                {projects.map(p => <MenuItem key={p.id} value={p.id}>{p.name} (SMIS {p.smis})</MenuItem>)}
                            </Select>
                        </FormControl>

                        <input
                            type="file"
                            multiple
                            accept=".xls,.xlsx,.pdf"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                        />
                        <Button
                            variant="contained"
                            color="primary"
                            size="large"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isParsing || projects.length === 0}
                        >
                            {isParsing ? <CircularProgress size={24} color="inherit" /> : 'Alege Fișiere...'}
                        </Button>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={7}>
                    <Paper sx={{ p: 0, height: '100%', minHeight: 400, display: 'flex', flexDirection: 'column', bgcolor: '#0f172a' }}>
                        <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.05)', bgcolor: 'rgba(0,0,0,0.2)' }}>
                            <Typography variant="subtitle2" fontWeight="bold">Jurnal Analiză Inteligentă</Typography>
                        </Box>
                        <Box sx={{ p: 2, flexGrow: 1, overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: 1.5 }}>
                            {logs.length === 0 ? (
                                <Typography color="text.secondary">Nicio acțiune în desfășurare. Aștept fișiere...</Typography>
                            ) : (
                                logs.map((log, idx) => (
                                    <div key={idx} dangerouslySetInnerHTML={{ __html: log }} />
                                ))
                            )}
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}
