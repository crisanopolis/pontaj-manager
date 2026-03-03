import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Grid } from '@mui/material';

const initialForm = {
    name: '',
    smis: '',
    contract: '',
    partner: '',
    instName: '',
    instAddr: '',
    etapa: '',
    intocmit: '',
    verificat: '',
    color: '#3b6fff'
};

export default function ProjectModal({ open, onClose, project, onSave }) {
    const [form, setForm] = useState(initialForm);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (open) {
            setForm(project || initialForm);
            setErrors({});
        }
    }, [open, project]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!form.name?.trim()) newErrors.name = 'Numele proiectului este obligatoriu';
        if (!form.smis?.trim()) newErrors.smis = 'Codul SMIS este obligatoriu';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (validate()) {
            onSave(form);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 2 } }}>
            <DialogTitle>{project ? 'Editează Proiect' : 'Proiect Nou'}</DialogTitle>
            <DialogContent dividers sx={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                    <Grid item xs={12} sm={8}>
                        <TextField
                            fullWidth label="Nume Proiect" name="name" value={form.name} onChange={handleChange}
                            required size="small" error={!!errors.name} helperText={errors.name}
                        />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField
                            fullWidth label="Cod SMIS" name="smis" value={form.smis} onChange={handleChange}
                            required size="small" error={!!errors.smis} helperText={errors.smis}
                        />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Partener Principal" name="partner" value={form.partner} onChange={handleChange} size="small" />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Contract" name="contract" value={form.contract} onChange={handleChange} size="small" />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Nume Instituție" name="instName" value={form.instName} onChange={handleChange} size="small" />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Adresă Instituție" name="instAddr" value={form.instAddr} onChange={handleChange} size="small" />
                    </Grid>

                    <Grid item xs={12}>
                        <TextField fullWidth multiline rows={2} label="Etapă / Descriere" name="etapa" value={form.etapa} onChange={handleChange} size="small" />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                        <TextField fullWidth label="Întocmit de" name="intocmit" value={form.intocmit} onChange={handleChange} size="small" />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField fullWidth label="Verificat de" name="verificat" value={form.verificat} onChange={handleChange} size="small" />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField fullWidth label="Culoare Etichetă (Hex)" name="color" value={form.color} onChange={handleChange} size="small" />
                    </Grid>

                </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} color="inherit">Renunță</Button>
                <Button onClick={handleSubmit} variant="contained" color="primary">Salvează Proiect</Button>
            </DialogActions>
        </Dialog>
    );
}
