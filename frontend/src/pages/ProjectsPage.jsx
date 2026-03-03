import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, CircularProgress, Card, CardContent, TextField, InputAdornment } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import PeopleIcon from '@mui/icons-material/People';
import api from '../api/client';
import { useSnackbar } from 'notistack';
import ProjectModal from '../components/ProjectModal';
import ProjectTeamModal from '../components/ProjectTeamModal';
import DashboardGlobal from '../components/DashboardGlobal';

export default function ProjectsPage() {
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const { enqueueSnackbar } = useSnackbar();

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [teamModalOpen, setTeamModalOpen] = useState(false);

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const res = await api.get('/projects');
            setProjects(res.data);
        } catch (e) {
            enqueueSnackbar(e.message, { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProject = async (formData) => {
        try {
            if (formData.id) {
                await api.put(`/projects/${formData.id}`, formData);
                enqueueSnackbar('Proiect actualizat!', { variant: 'success' });
            } else {
                await api.post('/projects', formData);
                enqueueSnackbar('Proiect nou creat!', { variant: 'success' });
            }
            setModalOpen(false);
            setTeamModalOpen(false);
            fetchProjects();
        } catch (e) {
            enqueueSnackbar('Eroare: ' + e.message, { variant: 'error' });
        }
    };

    const handleReconcileAll = async () => {
        let totalAdded = 0;
        for (const p of projects) {
            try {
                const res = await api.post(`/pontaj/reconcile/${p.id}`);
                totalAdded += res.data?.added || 0;
            } catch { }
        }
        await fetchProjects();
        if (totalAdded > 0) {
            enqueueSnackbar(`✅ Sincronizare completă: ${totalAdded} persoană/persoane aduse în membri!`, { variant: 'success' });
        } else {
            enqueueSnackbar('Toate proiectele sunt deja sincronizate.', { variant: 'info' });
        }
    };

    if (loading) return <CircularProgress />;

    return (
        <Box sx={{ p: 0 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: '28px', gap: '16px' }}>
                <Box>
                    <Typography variant="h1" gutterBottom sx={{ mb: 0.5 }}>Proiecte</Typography>
                    <Typography variant="subtitle1">Gestionează proiectele cu coduri SMIS diferite</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: '12px' }}>
                    <TextField
                        size="small"
                        placeholder="Caută proiect..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment>
                            ),
                        }}
                        sx={{
                            width: 250,
                            '& .MuiOutlinedInput-root': { height: 36, bgcolor: 'rgba(0,0,0,0.2)' }
                        }}
                    />
                    <Button variant="contained" onClick={() => { setSelectedProject(null); setModalOpen(true); }}>
                        ➕ Proiect nou
                    </Button>
                    <Button variant="outlined" onClick={handleReconcileAll}
                        sx={{
                            fontSize: '12px', borderColor: 'rgba(0,194,255,0.4)', color: '#00c2ff',
                            '&:hover': { bgcolor: 'rgba(0,194,255,0.08)', borderColor: '#00c2ff' }
                        }}>
                        🔄 Sincronizează Membri
                    </Button>
                </Box>
            </Box>

            <DashboardGlobal />

            {projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.smis?.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Typography variant="h6" color="text.secondary">Niciun proiect găsit.</Typography>
                </Box>
            ) : (
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '16px'
                }}>
                    {projects
                        .filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.smis?.toLowerCase().includes(search.toLowerCase()))
                        .map(p => (
                            <Card
                                key={p.id}
                                onClick={() => navigate(`/pontaj?projectId=${p.id}`)}
                                sx={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    transition: 'all .2s ease-in-out',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        borderColor: p.color || '#3b6fff',
                                        boxShadow: `0 8px 16px -4px rgba(0,0,0,0.4)`
                                    }
                                }}
                            >
                                {/* Proj Bar */}
                                <Box sx={{ height: '4px', width: '100%', bgcolor: p.color || '#3b6fff' }} />

                                <CardContent sx={{ p: '20px', flexGrow: 1 }}>
                                    <Typography sx={{
                                        fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                                        letterSpacing: '1.5px', color: 'text.secondary', mb: '6px'
                                    }}>
                                        SMIS {p.smis || '–'}
                                    </Typography>
                                    <Typography sx={{ fontSize: '16px', fontWeight: 700, mb: '8px', color: '#fff' }}>
                                        {p.name}
                                    </Typography>
                                    <Typography sx={{ fontSize: '11px', color: 'text.secondary', mb: '14px' }}>
                                        Contract: {p.contract || '–'}
                                    </Typography>

                                    <Box sx={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        <Box sx={{
                                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                                            bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid #222c42',
                                            borderRadius: '20px', px: '10px', py: '3px', fontSize: '11px', color: 'text.secondary'
                                        }}>
                                            👥 {p.members?.length || 0} membri
                                        </Box>
                                        <Box sx={{
                                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                                            bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid #222c42',
                                            borderRadius: '20px', px: '10px', py: '3px', fontSize: '11px', color: 'text.secondary'
                                        }}>
                                            🏢 {p.partner || '–'}
                                        </Box>
                                    </Box>
                                </CardContent>

                                {/* Actions bar like in style.css */}
                                <Box sx={{
                                    display: 'flex', gap: '10px', p: '12px 20px',
                                    borderTop: '1px solid #222c42', bgcolor: 'rgba(0,0,0,0.15)'
                                }}>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<PeopleIcon sx={{ fontSize: 16 }} />}
                                        sx={{ py: 0.5, fontSize: '11px', flexGrow: 1, borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)' }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedProject(p);
                                            setTeamModalOpen(true);
                                        }}
                                    >
                                        Echipă
                                    </Button>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        sx={{ py: 0.5, fontSize: '11px', flexGrow: 1 }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/pontaj?projectId=${p.id}`);
                                        }}
                                    >
                                        Editează
                                    </Button>
                                </Box>
                            </Card>
                        ))}
                </Box>
            )}

            <ProjectModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                project={selectedProject}
                onSave={handleSaveProject}
            />

            <ProjectTeamModal
                open={teamModalOpen}
                onClose={() => setTeamModalOpen(false)}
                project={selectedProject}
                onSave={handleSaveProject}
            />
        </Box>
    );
}
