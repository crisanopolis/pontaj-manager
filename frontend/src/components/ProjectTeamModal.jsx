import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, TextField, MenuItem, Select, FormControl, InputLabel, IconButton, List, Autocomplete, Grid } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import api from '../api/client';

export default function ProjectTeamModal({ open, onClose, project, onSave }) {
    const [allPersons, setAllPersons] = useState([]);
    const [members, setMembers] = useState([]);
    const [selectedPerson, setSelectedPerson] = useState(null);

    useEffect(() => {
        if (open) {
            fetchPersons();
            setMembers(project?.members || []);
            setSelectedPerson(null);
        }
    }, [open, project]);

    const fetchPersons = async () => {
        try {
            const res = await api.get('/persons?limit=1000');
            setAllPersons(Array.isArray(res.data) ? res.data : res.data.rows || []);
        } catch (e) {
            console.error('Failed to fetch persons', e);
        }
    };

    const handleAddMember = () => {
        if (!selectedPerson) return;
        if (members.find(m => m.personId === selectedPerson.id)) return;

        // Choose first employer as default if available
        const firstEmp = selectedPerson.employers?.[0] || {};

        const newMember = {
            personId: selectedPerson.id,
            partner: firstEmp.partner || selectedPerson.partner || '',
            type: selectedPerson.type || 'Cercetare',
            defaultOre: selectedPerson.defaultOre || 8,
            defaultNorma: selectedPerson.defaultNorma || 0
        };

        setMembers([...members, newMember]);
        setSelectedPerson(null);
    };

    const handleRemoveMember = (personId) => {
        setMembers(members.filter(m => m.personId !== personId));
    };

    const updateMember = (index, field, value) => {
        const newMembers = [...members];
        newMembers[index] = { ...newMembers[index], [field]: value };
        setMembers(newMembers);
    };

    const handleSave = () => {
        onSave({ ...project, members });
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 2 } }}>
            <DialogTitle sx={{ pb: 1 }}>Echipă Proiect: {project?.name}</DialogTitle>
            <DialogContent dividers sx={{ borderColor: 'rgba(255,255,255,0.05)' }}>

                <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Autocomplete
                        sx={{ flexGrow: 1 }}
                        size="small"
                        options={allPersons}
                        getOptionLabel={(option) => `${option.name} ${option.fname} (${option.cnp || 'fără CNP'})`}
                        value={selectedPerson}
                        onChange={(e, val) => setSelectedPerson(val)}
                        renderInput={(params) => <TextField {...params} label="Caută persoană în bază..." />}
                    />
                    <Button
                        variant="contained"
                        startIcon={<PersonAddIcon />}
                        onClick={handleAddMember}
                        disabled={!selectedPerson}
                    >
                        Adaugă
                    </Button>
                </Box>

                <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase' }}>
                    Membri înscriși în proiect ({members.length})
                </Typography>

                <List sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {members.map((m, idx) => {
                        const p = allPersons.find(pers => pers.id === m.personId);
                        if (!p) return null;

                        return (
                            <Box key={m.personId} sx={{ p: 2, border: '1px solid #222c42', borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.02)' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                    <Box>
                                        <Typography sx={{ fontWeight: 700 }}>{p.name} {p.fname}</Typography>
                                        <Typography variant="caption" color="text.secondary">ID: {p.id}</Typography>
                                    </Box>
                                    <IconButton size="small" color="error" onClick={() => handleRemoveMember(m.personId)}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Box>

                                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                                    <Box sx={{ flex: '1 1 180px', minWidth: 140 }}>
                                        <FormControl fullWidth size="small">
                                            <InputLabel>Contract / Partener</InputLabel>
                                            <Select
                                                value={m.partner}
                                                label="Contract / Partener"
                                                onChange={(e) => updateMember(idx, 'partner', e.target.value)}
                                            >
                                                {/* Adaugam partenerul actual ca optiune daca nu e in lista employers */}
                                                {!p.employers?.find(e => e.partner === m.partner) && m.partner && (
                                                    <MenuItem value={m.partner}>{m.partner} (curent)</MenuItem>
                                                )}
                                                {p.employers?.map(emp => (
                                                    <MenuItem key={emp.id} value={emp.partner}>{emp.partner} - {emp.name}</MenuItem>
                                                ))}
                                                {(!p.employers || p.employers.length === 0) && (
                                                    <MenuItem value={p.partner || ''}>{p.partner || 'Niciun contract definit'}</MenuItem>
                                                )}
                                            </Select>
                                        </FormControl>
                                    </Box>
                                    <Box sx={{ flex: '1 1 130px', minWidth: 110 }}>
                                        <FormControl fullWidth size="small">
                                            <InputLabel>Rol Proiect</InputLabel>
                                            <Select
                                                value={m.type}
                                                label="Rol Proiect"
                                                onChange={(e) => updateMember(idx, 'type', e.target.value)}
                                            >
                                                <MenuItem value="Cercetare">Cercetare</MenuItem>
                                                <MenuItem value="Management">Management</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Box>
                                    <Box sx={{ flex: '1 1 110px', minWidth: 90 }}>
                                        <TextField
                                            fullWidth label="Ore Proiect"
                                            type="number" size="small"
                                            value={m.defaultOre}
                                            onChange={(e) => updateMember(idx, 'defaultOre', parseFloat(e.target.value))}
                                        />
                                    </Box>
                                    <Box sx={{ flex: '1 1 110px', minWidth: 90 }}>
                                        <TextField
                                            fullWidth label="Normă Totală"
                                            type="number" size="small"
                                            value={m.defaultNorma}
                                            onChange={(e) => updateMember(idx, 'defaultNorma', parseFloat(e.target.value))}
                                        />
                                    </Box>
                                </Box>
                            </Box>
                        );
                    })}
                </List>

                {members.length === 0 && (
                    <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
                        Niciun membru adăugat încă. Folosește căutarea de mai sus.
                    </Box>
                )}

            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} color="inherit">Renunță</Button>
                <Button onClick={handleSave} variant="contained" color="primary">Salvează Echipa</Button>
            </DialogActions>
        </Dialog>
    );
}
