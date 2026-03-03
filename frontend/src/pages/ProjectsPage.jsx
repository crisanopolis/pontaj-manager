import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, CircularProgress, Grid, Card, CardContent } from '@mui/material';
import api from '../api/client';
import { useSnackbar } from 'notistack';
import ProjectModal from '../components/ProjectModal';

export default function ProjectsPage() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const { enqueueSnackbar } = useSnackbar();

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);

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
            fetchProjects();
        } catch (e) {
            enqueueSnackbar('Eroare: ' + e.message, { variant: 'error' });
        }
    };

    if (loading) return <CircularProgress />;

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box>
                    <Typography variant="h1" gutterBottom>Proiecte</Typography>
                    <Typography variant="subtitle1">Gestionează proiectele cu coduri SMIS diferite</Typography>
                </Box>
                <Button variant="contained" size="large" onClick={() => { setSelectedProject(null); setModalOpen(true); }}>➕ Proiect nou</Button>
            </Box>

            {projects.length === 0 ? (
                <Typography>Niciun proiect.</Typography>
            ) : (
                <Grid container spacing={3}>
                    {projects.map(p => (
                        <Grid item xs={12} sm={6} md={4} key={p.id}>
                            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', transition: 'all 0.2s', '&:hover': { borderColor: p.color, transform: 'translateY(-2px)' } }}>
                                <CardContent sx={{ flexGrow: 1 }}>
                                    <Typography variant="caption" sx={{ color: p.color, fontWeight: 'bold' }}>SMIS {p.smis || '–'}</Typography>
                                    <Typography variant="h2" sx={{ mt: 1, mb: 1, color: '#fff' }}>{p.name}</Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                        Contract: {p.contract || '–'}<br />
                                        Partener: {p.partner || '–'}
                                    </Typography>

                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
                                        <Box sx={{ bgcolor: 'rgba(59,111,255,0.1)', color: '#3b6fff', px: 1.5, py: 0.5, borderRadius: 2 }}>
                                            👥 {p.members?.length || 0} membri
                                        </Box>
                                        <Button size="small" variant="outlined" onClick={() => { setSelectedProject(p); setModalOpen(true); }}>Editează</Button>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* MODAL */}
            <ProjectModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                project={selectedProject}
                onSave={handleSaveProject}
            />
        </Box>
    );
}
